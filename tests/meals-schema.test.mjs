import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql=readFileSync(new URL('../supabase/add_meals.sql',import.meta.url),'utf8');
const ui=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
test('meal plans are scoped by household and protected with row level security',()=>{
  assert.match(sql,/unique\s*\(household_id,meal_date\)/);
  assert.match(sql,/alter table public\.hd_meal_plans enable row level security;/);
  assert.match(sql,/revoke all on public\.hd_meal_plans from public,anon;/);
  assert.match(sql,/created_by=\(select auth\.uid\(\)\)/);
  assert.match(sql,/hd_household_members m/);
});
test('meals are integrated with load and realtime refresh',()=>{
  assert.match(ui,/from\('hd_meal_plans'\)/);
  assert.match(ui,/table:'hd_meal_plans'/);
  assert.match(ui,/page==='meals'/);
  assert.match(ui,/Marker spist/);
});
