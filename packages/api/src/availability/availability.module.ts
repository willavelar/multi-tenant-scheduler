import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { SlotsService } from './slots.service';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, SlotsService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
