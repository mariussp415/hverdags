import test from 'node:test';
import assert from 'node:assert/strict';
import {monthGrid,shiftMonth} from '../lib/calendar.mjs';

test('month grid starts Monday and covers October 2026',()=>{
 const days=monthGrid('2026-10');assert.equal(days.length,35);
 assert.equal(days[0],'2026-09-28');assert.equal(days.at(-1),'2026-11-01');
 assert.ok(days.includes('2026-10-11'));
});
test('leap February is fully represented',()=>{
 const days=monthGrid('2028-02');assert.ok(days.includes('2028-02-29'));
 assert.equal(days.length%7,0);
});
test('six-week view when needed',()=>{assert.equal(monthGrid('2026-03').length,42);});
test('year boundary navigation',()=>{
 assert.equal(shiftMonth('2026-12',1),'2027-01');
 assert.equal(shiftMonth('2026-01',-1),'2025-12');
});
test('bad months rejected',()=>{assert.throws(()=>monthGrid('2026-13'));assert.throws(()=>shiftMonth('2026-00',1));});
