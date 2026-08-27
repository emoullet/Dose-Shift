import { z } from 'zod';

export const instantSchema = z.iso.datetime({ offset: true }).brand<'Instant'>();

export const localDateSchema = z.iso.date().brand<'LocalDate'>();

export const localTimeSchema = z.string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Expected a 24-hour local time in HH:mm format')
  .brand<'LocalTime'>();

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
export type LocalDate = z.infer<typeof localDateSchema>;
export type LocalTime = z.infer<typeof localTimeSchema>;
export type TimeZone = z.infer<typeof timeZoneSchema>;

export function nowAsInstant(): Instant {
  return instantSchema.parse(new Date().toISOString());
}
