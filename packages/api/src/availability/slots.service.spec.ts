import { SlotsService } from './slots.service';

describe('SlotsService', () => {
  let service: SlotsService;

  beforeEach(() => { service = new SlotsService(); });

  it('generates slots between start and end time', () => {
    const slots = service.generateSlots('09:00', '11:00', 60);
    expect(slots).toEqual(['09:00', '10:00']);
  });

  it('returns empty array when no time fits', () => {
    const slots = service.generateSlots('09:00', '09:30', 60);
    expect(slots).toEqual([]);
  });

  it('removes booked slots', () => {
    const slots = service.generateSlots('09:00', '12:00', 60);
    const available = service.subtractBooked(slots, ['10:00'], 60);
    expect(available).not.toContain('10:00');
    expect(available).toContain('09:00');
    expect(available).toContain('11:00');
  });
});
