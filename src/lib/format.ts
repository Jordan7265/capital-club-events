import { venue, type VenueEvent, type EventPrice } from '../data/events';

const TZ = venue.timeZone;

function parts(iso: string, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...options }).formatToParts(new Date(iso))) {
    out[p.type] = p.value;
  }
  return out;
}

/** "Saturday, November 14, 2026" */
export function longDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

/** Calendar pieces for date badges: { weekday: "Sat", month: "Nov", day: "14", year: "2026", monthLong: "November" } */
export function dateParts(iso: string) {
  const p = parts(iso, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const long = parts(iso, { weekday: 'long', month: 'long' });
  return {
    weekday: p.weekday ?? '',
    weekdayLong: long.weekday ?? '',
    month: p.month ?? '',
    monthLong: long.month ?? '',
    day: p.day ?? '',
    year: p.year ?? '',
  };
}

/** "6:30 – 10:30 PM", "8:30 PM – 1 AM" */
export function timeRange(event: Pick<VenueEvent, 'start' | 'end'>): string {
  const s = parts(event.start, { hour: 'numeric', minute: '2-digit' });
  const e = parts(event.end, { hour: 'numeric', minute: '2-digit' });
  const fmt = (x: Record<string, string>) => `${x.hour}${x.minute === '00' ? '' : `:${x.minute}`}`;
  if (s.dayPeriod === e.dayPeriod) return `${fmt(s)} – ${fmt(e)} ${e.dayPeriod}`;
  return `${fmt(s)} ${s.dayPeriod} – ${fmt(e)} ${e.dayPeriod}`;
}

/** "$125" */
export function priceAmount(price: EventPrice): string {
  return `$${price.amount}`;
}

/** MMDD used in mock confirmation codes, e.g. "1114". */
export function confirmationStem(iso: string): string {
  const p = parts(iso, { month: '2-digit', day: '2-digit' });
  return `${p.month}${p.day}`;
}

/** Events grouped by Eastern-time calendar month, in the order given (pass a chronological list). */
export function eventsByMonth(list: VenueEvent[]) {
  const groups = new Map<string, { month: string; year: string; events: VenueEvent[] }>();
  for (const event of list) {
    const d = dateParts(event.start);
    const key = `${d.monthLong} ${d.year}`;
    const group = groups.get(key) ?? { month: d.monthLong, year: d.year, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function fullAddress(): string {
  return `${venue.street}, ${venue.city}, ${venue.region} ${venue.postalCode}`;
}
