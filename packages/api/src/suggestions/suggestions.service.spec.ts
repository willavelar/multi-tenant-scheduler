import { SuggestionsService } from './suggestions.service';

describe('SuggestionsService', () => {
  function makeTx(userRow: { name: string; email: string } | undefined) {
    const inserted: any[] = [];
    const tx = {
      // withTenant() calls tx.execute(set_config ...) before our callback runs
      execute: async () => undefined,
      select: () => ({ from: () => ({ where: () => ({ limit: () => (userRow ? [userRow] : []) }) }) }),
      insert: () => ({ values: (v: any) => ({ returning: () => { inserted.push(v); return [{ id: 'sug-1', ...v }]; } }) }),
    };
    return { tx, inserted };
  }

  it('create snapshots the author name/email from the users table', async () => {
    const { tx, inserted } = makeTx({ name: 'Ana', email: 'ana@acme.com' });
    const db = { transaction: async (fn: any) => fn(tx) } as any;
    const service = new SuggestionsService(db);

    const result = await service.create('tenant-1', 'user-1', {
      content: 'Add dark mode',
      image: 'data:image/png;base64,AAAA',
    });

    expect(inserted[0]).toMatchObject({
      tenantId: 'tenant-1',
      userId: 'user-1',
      userName: 'Ana',
      userEmail: 'ana@acme.com',
      content: 'Add dark mode',
      imageUrl: 'data:image/png;base64,AAAA',
    });
    expect(result.id).toBe('sug-1');
  });
});
