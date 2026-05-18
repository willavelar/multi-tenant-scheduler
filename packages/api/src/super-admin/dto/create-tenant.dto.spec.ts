import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTenantDto } from './create-tenant.dto';

describe('CreateTenantDto', () => {
  it('rejects reserved slug "app"', async () => {
    const dto = plainToInstance(CreateTenantDto, { name: 'My App', slug: 'app' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'slug')).toBe(true);
  });

  it('accepts valid slug', async () => {
    const dto = plainToInstance(CreateTenantDto, { name: 'My Clinic', slug: 'my-clinic' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects slug starting with hyphen', async () => {
    const dto = plainToInstance(CreateTenantDto, { name: 'Bad Slug', slug: '-bad' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'slug')).toBe(true);
  });
});
