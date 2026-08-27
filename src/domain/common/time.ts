import { z } from 'zod';

export const instantSchema = z.iso.datetime({ offset: true }).brand<'Instant'>();

export const timeZoneSchema = z.string().min(1).refine(
  (value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid IANA time zone' }
).brand<'TimeZone'>();

export type Instant = z.infer<typeof instantSchema>;
export type TimeZone = z.infer<typeof timeZoneSchema>;

export function nowAsInstant(): Instant {
  return instantSchema.parse(new Date().toISOString());
}
