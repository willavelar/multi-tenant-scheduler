# NestJS Best Practices

Guia de boas práticas para projetos NestJS com TypeScript.

---

## 1. Estrutura de Módulos

NestJS organiza a aplicação em módulos coesos. Cada módulo agrupa uma fatia de domínio: controller, service, e repositório ficam juntos.

```
src/
  users/
    dto/
      create-user.dto.ts
      update-user.dto.ts
    users.controller.ts
    users.service.ts
    users.module.ts
  orders/
    dto/
    orders.controller.ts
    orders.service.ts
    orders.module.ts
  common/
    decorators/
    guards/
    interceptors/
    pipes/
    filters/
  app.module.ts
  main.ts
```

**Regra prática**: um módulo por domínio. Nunca coloque lógica de domínios diferentes no mesmo módulo. `AppModule` apenas importa os demais — nunca contém lógica de negócio.

---

## 2. Controllers — Apenas Roteamento

O controller tem uma única responsabilidade: receber a requisição, delegar ao service, e devolver a resposta.

```ts
// ✅ Correto
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }
}

// ❌ Errado — lógica de negócio no controller
@Post()
async create(@Body() dto: CreateUserDto) {
  const exists = await this.db.query('SELECT 1 FROM users WHERE email = $1', [dto.email]);
  if (exists) throw new ConflictException('Email já em uso');
  // ...
}
```

**Regra prática**: se o método do controller tem mais de 5 linhas, algo que deveria estar no service ficou para trás.

---

## 3. Services — Lógica de Negócio

Services contêm as regras de negócio e orquestram repositórios ou outros services.

```ts
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailerService: MailerService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email já cadastrado');

    const user = await this.usersRepository.create(dto);
    await this.mailerService.sendWelcome(user.email);
    return user;
  }
}
```

**Regra prática**: um service nunca deve instanciar outro service diretamente — use injeção de dependência. Isso mantém o código testável.

---

## 4. DTOs e Validação

Use `class-validator` + `class-transformer` para validar entradas na borda da aplicação. Configure o `ValidationPipe` globalmente.

```ts
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,        // remove campos não declarados no DTO
    forbidNonWhitelisted: true, // lança erro se campos extras chegarem
    transform: true,        // converte tipos automaticamente (string → number)
  }),
);
```

```ts
// create-user.dto.ts
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
```

**Regra prática**: `whitelist: true` é inegociável em produção. Sem ele, campos arbitrários chegam até o service.

### DTO de atualização

Use `PartialType` do `@nestjs/mapped-types` para evitar repetição:

```ts
// update-user.dto.ts
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

---

## 5. Guards — Autenticação e Autorização

Guards decidem se a requisição pode prosseguir. Separe autenticação de autorização em guards distintos.

```ts
// jwt-auth.guard.ts — verifica se o token é válido
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// roles.guard.ts — verifica se o usuário tem a role necessária
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
```

```ts
// uso no controller
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
remove(@Param('id') id: string) {
  return this.usersService.remove(id);
}
```

**Regra prática**: registre guards críticos globalmente no `AppModule`. Guards específicos de rota ficam no decorator `@UseGuards`.

---

## 6. Interceptors — Transformação de Resposta

Interceptors executam lógica antes e depois do handler. Use para transformar respostas, logging e cache.

```ts
// transform.interceptor.ts — envolve a resposta em { data: ... }
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({ data, statusCode: context.switchToHttp().getResponse().statusCode })),
    );
  }
}
```

**Regra prática**: interceptors de transformação global devem ser simples e sem lógica de negócio. Lógica complexa pertence ao service.

---

## 7. Exception Filters — Tratamento de Erros

Use um filtro global para padronizar o formato de erro em toda a aplicação.

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (status >= 500) {
      this.logger.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

```ts
// main.ts
app.useGlobalFilters(new AllExceptionsFilter());
```

**Regra prática**: nunca deixe o NestJS expor stack traces em produção. O filtro global é a única barreira confiável.

---

## 8. Configuração com `@nestjs/config`

Nunca acesse `process.env` diretamente nos services. Use o `ConfigService` para centralizar e tipar as variáveis de ambiente.

```ts
// config/app.config.ts
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
}));

// config/database.config.ts
export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  poolSize: parseInt(process.env.DB_POOL_SIZE ?? '10', 10),
}));
```

```ts
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [appConfig, databaseConfig],
  validationSchema: Joi.object({
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required(),
    NODE_ENV: Joi.string().valid('development', 'production', 'test'),
  }),
}),
```

```ts
// uso no service
@Injectable()
export class DatabaseService {
  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('database.url');
  }
}
```

**Regra prática**: use `validationSchema` no `ConfigModule` para falhar em startup se variáveis obrigatórias estiverem ausentes — melhor do que falhar em runtime.

---

## 9. Injeção de Dependência — Providers Customizados

Para injetar valores simples, factories ou classes de terceiros, use providers customizados.

```ts
// Injetar um valor
{ provide: 'API_KEY', useValue: process.env.API_KEY }

// Injetar uma factory assíncrona
{
  provide: 'REDIS_CLIENT',
  useFactory: async (config: ConfigService) => {
    return new Redis(config.get('redis.url'));
  },
  inject: [ConfigService],
}
```

```ts
// consumo
constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}
```

**Regra prática**: prefira `useFactory` com `inject` para providers que dependem de configuração — isso garante que o container resolve as dependências na ordem certa.

---

## 10. Pipes — Transformação e Validação de Parâmetros

Pipes transformam e validam valores antes de chegarem ao handler.

```ts
// Pipe embutido para UUID
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) { ... }

// Pipe customizado
@Injectable()
export class ParsePositiveIntPipe implements PipeTransform {
  transform(value: string) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new BadRequestException('Deve ser um inteiro positivo');
    }
    return parsed;
  }
}
```

**Regra prática**: use pipes embutidos (`ParseUUIDPipe`, `ParseIntPipe`, `ParseBoolPipe`) antes de criar o seu próprio.

---

## 11. Logging

Use o `Logger` embutido do NestJS em vez de `console.log`. Ele inclui contexto e nível de log automaticamente.

```ts
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async create(dto: CreateUserDto) {
    this.logger.log(`Criando usuário: ${dto.email}`);
    try {
      const user = await this.repository.create(dto);
      this.logger.log(`Usuário criado: ${user.id}`);
      return user;
    } catch (err) {
      this.logger.error('Falha ao criar usuário', err.stack);
      throw err;
    }
  }
}
```

**Regra prática**: logue erros com `this.logger.error(msg, err.stack)`. O stack trace é essencial para depuração em produção.

---

## 12. Testes

### Testes unitários com mocks

```ts
describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
  });

  it('deve lançar ConflictException se email já existir', async () => {
    repository.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' } as User);

    await expect(service.create({ email: 'a@b.com', password: '12345678' }))
      .rejects.toThrow(ConflictException);
  });
});
```

### Testes e2e com Supertest

```ts
describe('POST /users', () => {
  it('deve criar um usuário e retornar 201', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'novo@email.com', password: 'senha1234' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.email).toBe('novo@email.com');
        expect(body.data.password).toBeUndefined(); // senha nunca volta na resposta
      });
  });
});
```

**Regra prática**: testes unitários mockam tudo abaixo do service. Testes e2e batem no banco real — não mocke o banco em e2e.

---

## 13. Segurança

### Helmet e CORS

```ts
// main.ts
import helmet from 'helmet';

app.use(helmet());
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  credentials: true,
});
```

### Rate limiting

```ts
// app.module.ts
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]);

// Em controllers sensíveis
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60_000, limit: 5 } })
@Post('auth/login')
login(@Body() dto: LoginDto) { ... }
```

### Nunca retorne senhas

Sempre exclua campos sensíveis antes de retornar entidades. Use um interceptor ou um método de serialização:

```ts
// user.entity.ts
export class User {
  id: string;
  email: string;

  @Exclude()
  password: string;
}

// main.ts
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

---

## 14. Performance

### Lazy-loading de módulos

Para aplicações grandes, carregue módulos pesados (relatórios, processamento de arquivos) sob demanda:

```ts
const { ReportsModule } = await this.lazyModuleLoader.load(() =>
  import('./reports/reports.module').then((m) => m.ReportsModule),
);
```

### Compressão de resposta

```ts
import compression from 'compression';
app.use(compression());
```

### Cache com decorators

```ts
@CacheKey('all-products')
@CacheTTL(300)
@Get()
findAll() {
  return this.productsService.findAll();
}
```

---

## 15. Padrões a Evitar

| Antipadrão | Solução |
|---|---|
| Lógica de negócio no controller | Mover para o service |
| `process.env` direto no código | Usar `ConfigService` |
| `any` em DTOs ou retornos | Tipar explicitamente |
| Módulos circulares | Refatorar usando `forwardRef` apenas como último recurso — indício de acoplamento errado |
| Services com muitas responsabilidades | Dividir em services menores com `Single Responsibility` |
| Sem tratamento de erro centralizado | Criar `AllExceptionsFilter` global |
| Senhas e tokens em logs | Nunca logar campos sensíveis |
| Queries SQL diretas fora de repositórios | Encapsular acesso a dados em repositórios ou use-cases |
