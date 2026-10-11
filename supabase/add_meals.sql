-- Kun for dokumentasjon / nye prosjekter.
-- Denne migrasjonen er ALLEREDE kjørt på Supabase-prosjektet Hverdags.
-- IKKE kjør den igjen på samme prosjekt.
create table public.hd_meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.hd_households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  meal_date date not null,
  meal_name text not null check (char_length(trim(meal_name)) between 1 and 100),
  actual_meal text check (actual_meal is null or char_length(trim(actual_meal)) between 1 and 100),
  notes text not null default '' check (char_length(notes) <= 500),
  status text not null default 'planned' check (status in ('planned','eaten')),
  eaten_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id,meal_date),
  constraint hd_actual_meal_only_if_eaten check (status='eaten' or actual_meal is null),
  constraint hd_meal_status_consistent check (
    (status='planned' and eaten_at is null) or (status='eaten' and eaten_at is not null)
  )
);
create index hd_meal_plans_household_date_idx on public.hd_meal_plans(household_id,meal_date desc);
alter table public.hd_meal_plans enable row level security;

create policy "HD members read meals" on public.hd_meal_plans for select to authenticated
using (exists (select 1 from public.hd_household_members m
where m.household_id=hd_meal_plans.household_id and m.user_id=(select auth.uid())));

create policy "HD members insert meals" on public.hd_meal_plans for insert to authenticated
with check (created_by=(select auth.uid()) and exists (
select 1 from public.hd_household_members m
where m.household_id=hd_meal_plans.household_id and m.user_id=(select auth.uid())));

create policy "HD members update meals" on public.hd_meal_plans for update to authenticated
using (exists (select 1 from public.hd_household_members m
where m.household_id=hd_meal_plans.household_id and m.user_id=(select auth.uid())))
with check (exists (select 1 from public.hd_household_members m
where m.household_id=hd_meal_plans.household_id and m.user_id=(select auth.uid())));

create policy "HD members delete meals" on public.hd_meal_plans for delete to authenticated
using (exists (select 1 from public.hd_household_members m
where m.household_id=hd_meal_plans.household_id and m.user_id=(select auth.uid())));

create or replace function private.hd_immutable_meal_scope()
returns trigger language plpgsql set search_path=''
as $$
begin
 if new.household_id is distinct from old.household_id or new.created_by is distinct from old.created_by
 then raise exception 'Du kan ikke flytte middagen til et annet hjem'; end if;
 return new;
end $$;
create trigger hd_meal_scope_immutable before update on public.hd_meal_plans
for each row execute function private.hd_immutable_meal_scope();

revoke all on public.hd_meal_plans from public,anon;
grant select,insert,update,delete on public.hd_meal_plans to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
   alter publication supabase_realtime add table public.hd_meal_plans;
 end if;
end $$;
