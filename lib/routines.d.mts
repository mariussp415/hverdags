export type RecurringTemplate = {
 id: string; owner_id: string; household_id: string | null;
 visibility: 'private' | 'shared'; title: string; start_on: string;
 interval_weeks: 1 | 2;
};
export type Occurrence<T> = T & { occurrence_date: string };
export declare function occurrenceInWeek(startOn: string, intervalWeeks: number, monday: string): string | null;
export declare function routineOccurrences<T extends RecurringTemplate>(routines: T[], monday: string): Occurrence<T>[];
