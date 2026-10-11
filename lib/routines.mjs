import { shiftISODate, weekDates } from './meal-dates.mjs';

// Returns an ISO date when a routine occurs in the requested Monday-based week.
// start_on is the first occurrence and interval_weeks is 1 or 2.
export function occurrenceInWeek(startOn, intervalWeeks, monday) {
  if (![1, 2].includes(intervalWeeks)) return null;
  const dates = weekDates(monday);
  const start = Date.UTC(...startOn.split('-').map((v, i) => Number(v) - (i === 1 ? 1 : 0)));
  if (!Number.isFinite(start)) return null;
  for (const day of dates) {
    const time = Date.UTC(...day.split('-').map((v, i) => Number(v) - (i === 1 ? 1 : 0)));
    const daysSince = Math.round((time - start) / 86400000);
    if (daysSince >= 0 && daysSince % (intervalWeeks * 7) === 0) return day;
  }
  return null;
}

export function routineOccurrences(routines, monday) {
  return routines.flatMap(routine => {
    const date = occurrenceInWeek(routine.start_on, routine.interval_weeks, monday);
    return date ? [{...routine, occurrence_date: date}] : [];
  }).sort((a,b) => a.occurrence_date.localeCompare(b.occurrence_date) || a.title.localeCompare(b.title));
}
