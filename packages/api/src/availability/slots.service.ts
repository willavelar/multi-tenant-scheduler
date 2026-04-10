import { Injectable } from '@nestjs/common';

@Injectable()
export class SlotsService {
  generateSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
    const slots: string[] = [];
    let current = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    while (current + durationMinutes <= end) {
      slots.push(this.minutesToTime(current));
      current += durationMinutes;
    }
    return slots;
  }

  subtractBooked(slots: string[], bookedStartTimes: string[], durationMinutes: number): string[] {
    const bookedMinutes = new Set(bookedStartTimes.map(t => this.timeToMinutes(t)));
    return slots.filter(slot => {
      const slotStart = this.timeToMinutes(slot);
      const slotEnd = slotStart + durationMinutes;
      for (const booked of bookedMinutes) {
        if (slotStart < booked + durationMinutes && slotEnd > booked) return false;
      }
      return true;
    });
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
