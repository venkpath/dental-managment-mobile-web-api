/** Demo booking window: 10:00 AM – 10:00 PM IST, 30-minute slots. */
export const DEMO_DAY_START_HOUR = 10;
export const DEMO_DAY_END_HOUR = 22;

/** Lunch break — always unavailable (2:00–2:30 PM). */
export const DEMO_BLOCKED_SLOTS = new Set(['14:00']);

export function formatSlot(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** All bookable demo slots for a day (excludes lunch block). */
export function listDemoSlotTimes(): string[] {
  const slots: string[] = [];
  for (let hour = DEMO_DAY_START_HOUR; hour < DEMO_DAY_END_HOUR; hour++) {
    for (const minute of [0, 30]) {
      const slot = formatSlot(hour, minute);
      if (!DEMO_BLOCKED_SLOTS.has(slot)) slots.push(slot);
    }
  }
  return slots;
}

export function isValidDemoSlot(slot: string): boolean {
  return listDemoSlotTimes().includes(slot);
}

export type DemoSlotAvailability = {
  slot: string;
  label: string;
  available: boolean;
  reason?: 'lunch' | 'booked';
};

export function buildSlotLabel(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function buildDemoSlotAvailability(
  takenSlots: Set<string>,
): DemoSlotAvailability[] {
  return listDemoSlotTimes().map((slot) => {
    if (DEMO_BLOCKED_SLOTS.has(slot)) {
      return { slot, label: buildSlotLabel(slot), available: false, reason: 'lunch' as const };
    }
    if (takenSlots.has(slot)) {
      return { slot, label: buildSlotLabel(slot), available: false, reason: 'booked' as const };
    }
    return { slot, label: buildSlotLabel(slot), available: true };
  });
}
