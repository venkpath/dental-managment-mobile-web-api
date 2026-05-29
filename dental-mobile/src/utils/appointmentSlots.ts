import type { AvailableSlot } from '../types';

export type SlotPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export const PERIOD_ORDER: SlotPeriod[] = ['morning', 'afternoon', 'evening', 'night'];

export const PERIOD_META: Record<SlotPeriod, { label: string; icon: string; range: string }> = {
  morning: { label: 'Morning', icon: 'sunny-outline', range: '5:00 AM – 11:59 AM' },
  afternoon: { label: 'Afternoon', icon: 'partly-sunny-outline', range: '12:00 PM – 4:59 PM' },
  evening: { label: 'Evening', icon: 'moon-outline', range: '5:00 PM – 8:59 PM' },
  night: { label: 'Night', icon: 'cloudy-night-outline', range: '9:00 PM – 4:59 AM' },
};

/** Parse API time "HH:mm" or "HH:mm:ss" to minutes from midnight. */
export function timeToMinutes(time: string): number {
  const parts = time.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt((parts[1] ?? '0').replace(/\D/g, ''), 10);
  if (Number.isNaN(h)) return 0;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

export function formatTime12h(time: string): string {
  const total = timeToMinutes(time);
  const h24 = Math.floor(total / 60) % 24;
  const min = total % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

export function formatSlotRange(start: string, end?: string): string {
  if (end) return `${formatTime12h(start)} – ${formatTime12h(end)}`;
  return formatTime12h(start);
}

export function getSlotPeriod(time: string): SlotPeriod {
  const mins = timeToMinutes(time);
  if (mins >= 300 && mins < 720) return 'morning';
  if (mins >= 720 && mins < 1020) return 'afternoon';
  if (mins >= 1020 && mins < 1260) return 'evening';
  return 'night';
}

export interface GroupedSlots {
  period: SlotPeriod;
  slots: AvailableSlot[];
}

/** Group slots by period; only periods with at least one slot are returned. */
export function groupSlotsByPeriod(slots: AvailableSlot[]): GroupedSlots[] {
  const buckets: Record<SlotPeriod, AvailableSlot[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };
  for (const slot of slots) {
    buckets[getSlotPeriod(slot.start_time)].push(slot);
  }
  return PERIOD_ORDER
    .filter((p) => buckets[p].length > 0)
    .map((period) => ({
      period,
      slots: buckets[period].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)),
    }));
}
