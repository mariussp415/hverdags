import test from 'node:test';
import assert from 'node:assert/strict';
import { mondayOfWeek, shiftISODate, weekDates } from '../lib/meal-dates.mjs';

test('mondayOfWeek chooses Monday even on Sunday',()=>{
  assert.equal(mondayOfWeek(new Date(2026,9,11)), '2026-10-05');
  assert.equal(mondayOfWeek(new Date(2026,9,12)), '2026-10-12');
});
test('weekDates returns 7 dates across months',()=>{
  assert.deepEqual(weekDates('2026-10-26'),['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
});
test('shiftISODate handles leap day and previous year',()=>{
  assert.equal(shiftISODate('2024-02-28',1),'2024-02-29');
  assert.equal(shiftISODate('2026-01-01',-1),'2025-12-31');
});
