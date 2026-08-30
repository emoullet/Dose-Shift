import { localDateSchema, type LocalDate } from './time';

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function addCalendarDays(localDate: LocalDate, days: number): LocalDate {
  if (!Number.isInteger(days)) {
    throw new Error('Calendar-day offsets must be integers');
  }

  const date = new Date(utcMilliseconds(localDate) + days * millisecondsPerDay);
  return localDateSchema.parse(date.toISOString().slice(0, 10));
}

export function calendarDaysBetween(startDate: LocalDate, endDate: LocalDate): number {
  return (utcMilliseconds(endDate) - utcMilliseconds(startDate)) / millisecondsPerDay;
}

function utcMilliseconds(localDate: LocalDate): number {
  const [year, month, day] = localDate.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}
