import test from 'node:test';
import assert from 'node:assert/strict';
import { tidy, isValidTask, isSameDay } from '../lib/format.mjs';

test('blank tasks rejected', () => {
  assert.equal(isValidTask('   '), false);
  assert.equal(isValidTask('  Vaske klær '), true);
});
test('whitespace is normalized and long names limited', () => {
  assert.equal(tidy('  vaske   klær\n  '), 'vaske klær');
  assert.equal(tidy('abcd', 3), 'abc');
});
test('same date based on local calendar, not UTC', () => {
  assert.equal(isSameDay('2026-10-08', new Date(2026, 9, 8, 23, 50)), true);
  assert.equal(isSameDay('2026-10-09', new Date(2026, 9, 8)), false);
});
