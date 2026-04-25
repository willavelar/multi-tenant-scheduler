# Boas Práticas: Event Loop, Garbage Collection e Streams

> Documento de referência para desenvolvedores do projeto Scheduler.
> Cada seção explica o conceito, mostra um problema real do código e apresenta a solução correta.

---

## 1. Event Loop

### O que é

Node.js executa em uma única thread. Isso significa que ele só faz uma coisa por vez — mas faz isso de forma muito eficiente porque delega operações lentas (banco de dados, rede, disco) para o sistema operacional e continua processando outras requisições enquanto aguarda.

O **Event Loop** é o mecanismo que coordena tudo isso. Ele fica em um ciclo contínuo verificando se alguma operação assíncrona terminou e, quando termina, executa o callback correspondente.

**O problema:** se você coloca código pesado e *síncrono* dentro de um handler de requisição, o Event Loop fica preso executando aquele código e nenhuma outra requisição consegue ser atendida nesse período.

```
Requisição A entra
  ↓
Event Loop começa a processar A
  ↓ (código síncrono pesado — loop grande, cálculo intenso)
Event Loop BLOQUEADO — B, C, D ficam esperando
  ↓
Event Loop termina A, processa B, C, D
```

Com `async/await`, operações de I/O (banco, rede) **não bloqueiam**. O Event Loop pode processar outras requisições enquanto aguarda o resultado. O problema aparece quando há processamento CPU-intensivo *síncrono* misturado ao fluxo.

---

### Problema real no projeto

**`packages/api/src/availability/slots.service.ts` — linha 17-27**

```ts
// ❌ Potencialmente problemático em escala
subtractBooked(slots: string[], bookedStartTimes: string[], durationMinutes: number): string[] {
  const bookedMinutes = new Set(bookedStartTimes.map(t => this.timeToMinutes(t)));
  return slots.filter(slot => {
    const slotStart = this.timeToMinutes(slot);
    const slotEnd = slotStart + durationMinutes;
    for (const booked of bookedMinutes) {        // loop interno
      if (slotStart < booked + durationMinutes && slotEnd > booked) return false;
    }
    return true;
  });
}
```

**`packages/api/src/availability/availability.service.ts` — linhas 87-97**

```ts
// ❌ Loop síncrono dentro de handler assíncrono
for (const block of blocks) {
  const blockSlots = this.slotsService.generateSlots(...);     // síncrono
  allSlots = this.slotsService.subtractBooked(...);            // síncrono
}

for (const extra of extras) {
  const extraSlots = this.slotsService.generateSlots(...);     // síncrono
  allSlots = [...new Set([...allSlots, ...extraSlots])].sort(); // síncrono
}
```

Para o volume atual (poucos profissionais, slots de 30 min, horário comercial), isso é aceitável — são ~16 slots por dia. Mas se o sistema crescer para profissionais com agendas de 5 minutos ou relatórios de semanas inteiras, esses loops passam a bloquear o Event Loop.

---

### Solução correta

**Regra 1:** Operações de I/O (banco, rede, arquivo) devem sempre usar `async/await`. Nunca use versões síncronas como `fs.readFileSync` em handlers.

```ts
// ✅ Correto — deixa o Event Loop livre durante a espera
const result = await tx.select().from(appointments).where(...);

// ❌ Errado — bloqueia a thread inteira
const data = fs.readFileSync('arquivo.json');
```

**Regra 2:** Se um cálculo síncrono for inevitavelmente pesado (>100ms), mova-o para um Worker Thread.

```ts
// ✅ Para processamento pesado — use Worker Threads
import { Worker } from 'worker_threads';

function calcularSlotsEmWorker(params): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./slots-worker.js', { workerData: params });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
```

**Regra 3:** Nunca coloque delays com `while` esperando uma condição. Use `setImmediate` para ceder o controle ao Event Loop entre operações pesadas.

```ts
// ✅ Cede ao Event Loop entre chunks de processamento
async function processarEmLotes(itens: any[]) {
  for (let i = 0; i < itens.length; i += 100) {
    const lote = itens.slice(i, i + 100);
    processarLote(lote);
    await new Promise(resolve => setImmediate(resolve)); // cede o loop
  }
}
```

---

### ☑ Checklist — Event Loop (antes do PR)

- [ ] Toda operação de banco usa `await`? Não tem `.then()` perdido sem `return`?
- [ ] Não tem `fs.readFileSync`, `fs.writeFileSync` ou similar no código de request?
- [ ] Loops que iteram sobre arrays grandes (>1000 itens) estão em Worker Threads ou divididos em lotes com `setImmediate`?
- [ ] Não tem `while(true)` ou loop de polling dentro de um handler?
- [ ] Cálculos de datas/slots são sobre ranges razoáveis (≤1 semana)? Se for maior, revisar com o time.

---

## 2. Garbage Collection

### O que é

Garbage Collection (GC) é o processo automático do Node.js de liberar memória que não está mais sendo usada. Você não precisa liberar memória manualmente como em C/C++, mas pode *pressionar* o GC criando objetos desnecessários que ele precisará limpar.

**Pressão no GC** acontece quando o código cria muitos objetos temporários por requisição. Esses objetos ficam na memória até o GC rodar para limpá-los. Se o GC rodar com muita frequência, ele pausa a execução do JavaScript (mesmo que por milissegundos), o que degrada a performance.

**Memory leak** é quando um objeto que deveria ser descartado continua sendo referenciado — o GC nunca consegue coletá-lo, e a memória cresce indefinidamente até o processo travar.

---

### Problema real no projeto

**`packages/api/src/appointments/appointments.service.ts` — linhas 80-94**

```ts
// ❌ Objeto recriado a cada requisição — deveria ser constante da classe
return withTenant(this.db, tenantId, async (tx) => {
  const FIELDS = {           // ← recriado em TODA requisição de listagem
    id:                    appointments.id,
    startsAt:              appointments.startsAt,
    endsAt:                appointments.endsAt,
    status:                appointments.status,
    createdAt:             appointments.createdAt,
    professionalId:        appointments.professionalId,
    serviceId:             appointments.serviceId,
    clientId:              appointments.clientId,
    clientName:            users.name,
    clientAvatarUrl:       users.avatarUrl,
    serviceName:           services.name,
    professionalName:      profUsers.name,
    professionalAvatarUrl: profUsers.avatarUrl,
  };
  // ...
});
```

**`packages/api/src/availability/availability.service.ts` — linha 96**

```ts
// ❌ Cria 3 arrays temporários para fazer um merge simples
allSlots = [...new Set([...allSlots, ...extraSlots])].sort();
//           ↑ Set   ↑ temp 1      ↑ temp 2         ↑ temp 3
```

**Frontend — event listeners sem cleanup correto**

```ts
// ⚠️ Padrão presente em ClientSearchField.tsx, ProfessionalSearchField.tsx, Header.tsx
useEffect(() => {
  const handler = (e: MouseEvent) => { ... };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler); // cleanup existe ✅
}, []); // mas handler recriado a cada render se não usar useCallback
```

---

### Solução correta

**Regra 1:** Objetos constantes que não dependem de argumentos devem ficar fora do escopo da função.

```ts
// ✅ Defina como propriedade da classe, fora do método
@Injectable()
export class AppointmentsService {
  private readonly FIELDS = {
    id:       appointments.id,
    startsAt: appointments.startsAt,
    // ...
  };

  async findAll(...) {
    return withTenant(this.db, tenantId, async (tx) => {
      // reutiliza this.FIELDS sem recriar
      const data = await tx.select(this.FIELDS).from(appointments);
    });
  }
}
```

**Regra 2:** Evite criar arrays temporários desnecessários. Use `push` em vez de spread quando possível.

```ts
// ❌ Cria 3 objetos temporários
allSlots = [...new Set([...allSlots, ...extraSlots])].sort();

// ✅ Zero objetos intermediários
const seen = new Set(allSlots);
for (const slot of extraSlots) seen.add(slot);
allSlots = Array.from(seen).sort();
```

**Regra 3:** Event listeners em React devem sempre ter cleanup e o handler deve ser estável com `useCallback`.

```ts
// ✅ Handler estável + cleanup garantido
const handleClickOutside = useCallback((e: MouseEvent) => {
  if (ref.current && !ref.current.contains(e.target as Node)) {
    setOpen(false);
  }
}, []); // sem dependências que mudam

useEffect(() => {
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [handleClickOutside]);
```

**Regra 4:** Nunca acumule dados em variáveis de módulo (fora de classes/funções).

```ts
// ❌ Vaza memória — cache global que nunca é limpo
const cache: Record<string, any> = {};

export function getFromCache(key: string) {
  if (!cache[key]) cache[key] = fetchData(key); // cresce para sempre
  return cache[key];
}

// ✅ Use TTL ou limite de tamanho, ou deixe o NestJS CacheModule gerenciar
```

---

### ☑ Checklist — Garbage Collection (antes do PR)

- [ ] Objetos grandes (com muitas propriedades) criados dentro de métodos são realmente variáveis — ou poderiam ser constantes da classe?
- [ ] Tem algum `map()`, `filter()` ou spread (`...`) encadeado que cria arrays temporários desnecessários?
- [ ] Todo `addEventListener` no frontend tem o correspondente `removeEventListener` no cleanup do `useEffect`?
- [ ] Handlers de eventos usam `useCallback` para não serem recriados a cada render?
- [ ] Não tem arrays ou objetos sendo acumulados em variáveis de módulo (fora de classes)?
- [ ] Queries ao banco usam paginação (`.limit()` + `.offset()`)? Nunca trazer tudo sem limite.

---

## 3. Streams

### O que é

Imagine que você precisa servir um arquivo de 1GB para o usuário. Sem streams, o Node.js carregaria o arquivo inteiro na memória antes de começar a enviar — travando o servidor. Com streams, ele lê um pedaço, envia, lê o próximo pedaço, envia, e assim por diante. A memória usada é sempre pequena, independente do tamanho do arquivo.

Streams existem em quatro tipos em Node.js:
- **Readable** — fonte de dados (arquivo, resposta HTTP, banco)
- **Writable** — destino de dados (arquivo, resposta HTTP)
- **Transform** — transforma dados enquanto passa (compressão, encoding)
- **Duplex** — lê e escreve (WebSockets)

O padrão mais comum é `readable.pipe(writable)`, que conecta a saída de um stream à entrada de outro automaticamente, controlando o fluxo (backpressure).

---

### Problema potencial no projeto

O projeto ainda não tem uploads ou downloads de arquivos. Mas quando essa funcionalidade for adicionada — por exemplo, importar clientes via CSV ou exportar relatórios — é crítico usar Streams desde o início.

**O que NÃO fazer quando chegar essa feature:**

```ts
// ❌ Carrega o arquivo inteiro em memória — trava para arquivos grandes
@Post('import')
async importClients(@UploadedFile() file: Express.Multer.File) {
  const content = file.buffer.toString(); // arquivo inteiro na RAM
  const rows = content.split('\n');
  // processa rows...
}
```

```ts
// ❌ Gera o relatório inteiro antes de enviar — memória proporcional ao tamanho
@Get('export')
async exportAppointments(@Res() res: Response) {
  const all = await this.service.findAll(); // pode ser milhares de registros
  const csv = all.map(row => `${row.id},${row.startsAt}`).join('\n');
  res.send(csv); // envia tudo de uma vez
}
```

---

### Solução correta

**Upload de arquivo com Stream (NestJS + Multer):**

```ts
// ✅ Processa o CSV em stream — memória constante independente do tamanho
import { createReadStream } from 'fs';
import * as csv from 'fast-csv';

@Post('import')
@UseInterceptors(FileInterceptor('file'))
async importClients(@UploadedFile() file: Express.Multer.File) {
  return new Promise((resolve, reject) => {
    const results: any[] = [];

    csv.parseString(file.buffer.toString(), { headers: true })
      .on('data', (row) => results.push(row))   // processa linha por linha
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}
```

**Export/Download com StreamableFile (NestJS nativo):**

```ts
// ✅ NestJS envia o stream diretamente — nunca carrega tudo na memória
import { StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';

@Get('export')
async exportAppointments(): Promise<StreamableFile> {
  const fileStream = createReadStream('/tmp/appointments-export.csv');
  return new StreamableFile(fileStream, {
    type: 'text/csv',
    disposition: 'attachment; filename="appointments.csv"',
  });
}
```

**Gerar e transmitir dados do banco em stream (sem arquivo intermediário):**

```ts
// ✅ Usa Transform stream para converter registros em CSV linha por linha
import { Transform, PassThrough } from 'stream';

@Get('export')
async exportAppointments(@Res() res: Response) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="appointments.csv"');

  res.write('id,startsAt,status\n'); // header

  const cursor = this.db.select().from(appointments); // query lazy
  for await (const row of cursor) {
    res.write(`${row.id},${row.startsAt},${row.status}\n`);
  }

  res.end();
}
```

**Pipe com transformação (ex: compressão gzip):**

```ts
// ✅ Comprime em stream — sem carregar o arquivo completo
import { createGzip } from 'zlib';
import { createReadStream } from 'fs';

@Get('export/gz')
exportCompressed(@Res() res: Response) {
  res.setHeader('Content-Encoding', 'gzip');
  createReadStream('/tmp/data.csv').pipe(createGzip()).pipe(res);
}
```

---

### ☑ Checklist — Streams (antes do PR)

- [ ] Se a feature processa arquivos, usa stream em vez de `file.buffer` inteiro?
- [ ] Se a feature exporta dados, usa `StreamableFile` ou `res.write()` em loop — não `res.send(bigArray)`?
- [ ] Se usa `pipe()`, tem tratamento de erro nos dois lados (`readable.on('error')` e `writable.on('error')`)?
- [ ] Queries que podem retornar muitos registros têm `.limit()` ou usam cursor/stream do banco?
- [ ] Upload de imagem (avatar, logo) usa stream para salvar — não carrega o buffer inteiro para transformar?

---

## Checklist Unificado — Antes de Abrir o PR

Copie esta lista para a descrição do PR e marque cada item:

### Event Loop
- [ ] Toda operação de I/O (banco, rede, arquivo) usa `async/await`
- [ ] Não há `fs.readFileSync`, `execSync` ou qualquer operação síncrona bloqueante em handlers
- [ ] Loops sobre arrays grandes (>1000 itens) estão em Worker Threads ou divididos com `setImmediate`
- [ ] Não há polling com `while` ou `sleep` em handlers de requisição

### Garbage Collection
- [ ] Objetos constantes (sem dependência de argumentos) são propriedades da classe, não variáveis locais
- [ ] Não há spreads (`...`) encadeados criando arrays temporários desnecessários
- [ ] Todo `addEventListener` no frontend tem `removeEventListener` no cleanup
- [ ] Handlers de eventos React usam `useCallback`
- [ ] Nenhuma variável de módulo acumula dados indefinidamente
- [ ] Queries ao banco sempre têm `.limit()` ou paginação

### Streams
- [ ] Upload de arquivos usa stream — não `file.buffer` inteiro em memória
- [ ] Export de dados usa `StreamableFile` ou escrita incremental — não carrega tudo antes de enviar
- [ ] Pipes têm tratamento de erro em ambos os lados do pipe

---

*Última atualização: 2026-04-20*
