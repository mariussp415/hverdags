import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
test('seven-day overview uses horizontal grid and touch scrolling',()=>{
  assert.match(css,/\.weekly-overview \.weekly-agenda\s*\{[^}]*grid-template-columns:repeat\(7,/);
  assert.match(css,/\.weekly-overview \.weekly-agenda\s*\{[^}]*overflow-x:auto/);
  assert.match(page,/previewWeek\.map\(day=>/);
});
test('week cards show compact details with optional expansion',()=>{
  assert.match(page,/const extraCount=/);
  assert.match(page,/expandedWeekDay===day/);
  assert.match(page,/setExpandedWeekDay\(current=>/);
  assert.match(page,/aria-expanded=\{expandedWeekDay===day\}/);
  assert.match(page,/openEventEditor\(undefined,day\)/);
});
test('monthly calendar and completion history remain intact',()=>{
  assert.match(page,/monthGrid\(calendarMonth\)/);
  assert.match(page,/Fullført nylig/);
  assert.match(page,/routineDone\(firstRoutine.id,day\)/);
});
