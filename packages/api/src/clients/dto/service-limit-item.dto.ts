import { IsIn, IsInt, IsUUID, Min } from 'class-validator';

export class ServiceLimitItemDto {
  @IsUUID() serviceId: string;
  @IsInt() @Min(1) limitCount: number;
  @IsIn(['day', 'week', 'month']) limitPeriod: 'day' | 'week' | 'month';
}
