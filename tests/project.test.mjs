import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('version 1 dependencies pin known fixed Next and React releases', () => {
  assert.equal(pkg.version, '1.0.0');
  assert.equal(pkg.dependencies.next, '16.3.8');
  assert.equal(pkg.dependencies.react, '19.3.0');
  assert.equal(pkg.dependencies['@supabase/supabase-js'], '2.117.3');
});

test('each public data table has RLS enabled (static check only)', () => {
  for (const name of ['hd_households','hd_household_members','hd_tasks','hd_shopping_items','hd_events']) {
    assert.match(sql, new RegExp(`alter table public\\.${name} enable row level security;`, 'i'));
  }
});

test('database limits joining and enforces private vs shared scope (static)', () => {
  assert.match(sql, /if v_members >= 2 then/i);
  assert.match(sql, /visibility = 'private' and household_id is null/i);
  assert.match(sql, /visibility = 'shared' and household_id is not null/i);
  assert.match(sql, /revoke all on function public\.hd_join_household\(text\) from public, anon/i);
  assert.doesNotMatch(sql, /created_by = \(select auth\.uid\(\)\) or exists/i);
});

test('editing, filters and password recovery routes exist in the UI', () => {
  for (const token of ['openTaskEditor', 'openEventEditor', 'visibleOpenTasks','visibleEvents', 'PASSWORD_RECOVERY']) {
    assert.ok(app.includes(token), `${token} missing`);
  }
});

test('all database calls use isolated Hverdags tables', () => {
  const called = [...app.matchAll(/\.from\('([^']+)'\)/g)].map(x=>x[1]);
  assert.ok(called.length >= 8);
  assert.ok(called.every(x=>x.startsWith('hd_')), `Unprefixed database table: ${called}`);
  assert.match(app, /remove\('hd_tasks'/);
  assert.match(app, /remove\('hd_shopping_items'/);
  assert.match(app, /remove\('hd_events'/);
});
