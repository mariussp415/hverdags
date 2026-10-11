import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
test('home surfaces recent completed tasks and actors',()=>{
 assert.match(page,/Fullført nylig/);assert.match(page,/recentCompleted/);
 assert.match(page,/fullfilledBy\(item.completedBy,item.when\)/);
});
test('month calendar supports day selection, create and private/shared filters',()=>{
 assert.match(page,/monthGrid\(calendarMonth\)/);
 assert.match(page,/selectedCalendarDay/);
 assert.match(page,/openEventEditor\(undefined,selectedCalendarDay\)/);
 assert.match(page,/aria-pressed=\{day===selectedCalendarDay\}/);
 assert.match(page,/eventFilter===f/);
});
