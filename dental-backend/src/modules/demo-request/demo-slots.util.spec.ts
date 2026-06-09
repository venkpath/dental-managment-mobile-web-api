import {
  buildDemoSlotAvailability,
  isValidDemoSlot,
  listDemoSlotTimes,
} from './demo-slots.util.js';

describe('demo-slots.util', () => {
  it('generates slots from 10:00 to 21:30 excluding lunch', () => {
    const slots = listDemoSlotTimes();
    expect(slots[0]).toBe('10:00');
    expect(slots).not.toContain('14:00');
    expect(slots[slots.length - 1]).toBe('21:30');
    expect(slots.length).toBe(23); // 24 half-hours minus lunch
  });

  it('marks 14:00 as invalid', () => {
    expect(isValidDemoSlot('14:00')).toBe(false);
    expect(isValidDemoSlot('10:00')).toBe(true);
  });

  it('marks booked slots unavailable', () => {
    const result = buildDemoSlotAvailability(new Set(['10:00', '11:30']));
    const ten = result.find((s) => s.slot === '10:00');
    const eleven = result.find((s) => s.slot === '11:30');
    const noon = result.find((s) => s.slot === '12:00');
    expect(ten?.available).toBe(false);
    expect(ten?.reason).toBe('booked');
    expect(eleven?.available).toBe(false);
    expect(noon?.available).toBe(true);
  });
});
