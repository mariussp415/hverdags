import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {occurrenceInWeek,routineOccurrences} from '../lib/routines.mjs';
test('weekly repeats on correct day',()=>{ assert.equal(occurrenceInWeek('2026-10-11',1,'2026-10-12'),'2026-10-18'); });
test('biweekly skips alternate weeks',()=>{ assert.equal(occurrenceInWeek('2026-10-11',2,'2026-10-12'),null); assert.equal(occurrenceInWeek('2026-10-11',2,'2026-10-19'),'2026-10-25'); });
test('future routines do not appear early',()=>{assert.equal(occurrenceInWeek('2026-11-01',1,'2026-10-12'),null);});
test('routine occurrences attach dates and sort',()=>{ const routines=[{id:'1',title:'Vaske',start_on:'2026-10-15',interval_weeks:1},{id:'2',title:'Handle',start_on:'2026-10-13',interval_weeks:2}]; assert.deepEqual(routineOccurrences(routines,'2026-10-12').map(x=>x.id),['2','1']); });
