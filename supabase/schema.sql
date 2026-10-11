-- Hverdags 1.0 — ENESTE app i eget Supabase-prosjekt (fem nye hd_ tabeller).
-- RLS er aktiv på ALLE tabeller. Ingen service-role-nøkkel brukes i frontend.
-- gen_random_uuid() er innebygd i PostgreSQL; ingen delt extension endres.
create schema if not exists private;

create table if not exists public.hd_households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_by uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default upper(encode(gen_random_bytes(12), 'hex')),
  created_at timestamptz not null default now()
);
create table if not exists public.hd_household_members (
  household_id uuid not null references public.hd_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique(user_id) -- ett hjem per bruker i v0.1
);
create table if not exists public.hd_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.hd_households(id) on delete cascade,
  visibility text not null check (visibility in ('private', 'shared')),
  title text not null check (char_length(trim(title)) between 1 and 100),
  completed boolean not null default false,
  due_on date,
  created_at timestamptz not null default now(),
  constraint hd_tasks_scope check (
    (visibility = 'private' and household_id is null) or
    (visibility = 'shared' and household_id is not null)
  )
);
create table if not exists public.hd_shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.hd_households(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  checked boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.hd_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.hd_households(id) on delete cascade,
  visibility text not null check (visibility in ('private', 'shared')),
  title text not null check (char_length(trim(title)) between 1 and 100),
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint hd_events_scope check (
    (visibility = 'private' and household_id is null) or
    (visibility = 'shared' and household_id is not null)
  )
);

create index if not exists hd_tasks_owner_idx on public.hd_tasks(owner_id);
create index if not exists hd_tasks_household_idx on public.hd_tasks(household_id);
create index if not exists hd_shopping_household_idx on public.hd_shopping_items(household_id);
create index if not exists hd_events_owner_idx on public.hd_events(owner_id);
create index if not exists hd_events_household_idx on public.hd_events(household_id);

alter table public.hd_households enable row level security;
alter table public.hd_household_members enable row level security;
alter table public.hd_tasks enable row level security;
alter table public.hd_shopping_items enable row level security;
alter table public.hd_events enable row level security;

-- Membership-SELECT er bevisst bare egen rad, slik at policyene ikke blir rekursive.
create policy "Read own memberships" on public.hd_household_members
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Read joined hd_households" on public.hd_households
  for select to authenticated using (
    exists (
      select 1 from public.hd_household_members m
      where m.household_id = hd_households.id and m.user_id = (select auth.uid())
    )
  );

-- Kun disse begrensede RPC-ene kan opprette medlemskap. 
-- SECURITY DEFINER er nødvendig for å kunne slå opp privat invitasjonskode.
-- Eksponerte RPC-er blir eksplisitt fjernet fra PUBLIC og sjekker auth.uid().
create or replace function public.hd_create_household(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null then raise exception 'Du må logge inn'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 60 then
    raise exception 'Navn må ha 1–60 tegn';
  end if;
  if exists (select 1 from public.hd_household_members where user_id = v_uid) then
    raise exception 'Du er allerede med i et hjem';
  end if;
  insert into public.hd_households(name, created_by) values (trim(p_name), v_uid)
    returning id into v_id;
  insert into public.hd_household_members(household_id, user_id) values (v_id, v_uid);
  return v_id;
end;
$$;

create or replace function public.hd_join_household(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_id uuid; v_members int;
begin
  if v_uid is null then raise exception 'Du må logge inn'; end if;
  if exists (select 1 from public.hd_household_members where user_id = v_uid) then
    raise exception 'Du er allerede med i et hjem';
  end if;
  -- Lås husstands-raden for å hindre at to personer blir nr. 2 samtidig.
  select id into v_id from public.hd_households
    where invite_code = upper(trim(coalesce(p_code, ''))) for update;
  if v_id is null then raise exception 'Ugyldig invitasjonskode'; end if;
  select count(*) into v_members from public.hd_household_members where household_id = v_id;
  if v_members >= 2 then raise exception 'Dette hjemmet har allerede to medlemmer'; end if;
  insert into public.hd_household_members(household_id, user_id) values (v_id, v_uid);
  return v_id;
end;
$$;
revoke all on function public.hd_create_household(text) from public, anon;
revoke all on function public.hd_join_household(text) from public, anon;
grant execute on function public.hd_create_household(text) to authenticated;
grant execute on function public.hd_join_household(text) to authenticated;

-- Endring av eier, hjem og synlighet er IKKE tillatt via vanlig UPDATE.
-- Dette hindrer at et medlem flytter en annens oppgave til sitt private område.
create or replace function private.hd_immutable_item_scope()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.household_id is distinct from old.household_id
     or new.visibility is distinct from old.visibility then
    raise exception 'Endring av eier eller synlighet støttes ikke i denne versjonen';
  end if;
  return new;
end;
$$;
create trigger hd_tasks_scope_immutable before update on public.hd_tasks
for each row execute function private.hd_immutable_item_scope();
create trigger hd_events_scope_immutable before update on public.hd_events
for each row execute function private.hd_immutable_item_scope();

create or replace function private.hd_immutable_shopping_scope()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.added_by is distinct from old.added_by
     or new.household_id is distinct from old.household_id then
    raise exception 'Endring av vareeier eller hjem er ikke tillatt';
  end if;
  return new;
end;
$$;
create trigger hd_shopping_scope_immutable before update on public.hd_shopping_items
for each row execute function private.hd_immutable_shopping_scope();

create policy "Read private or shared hd_tasks" on public.hd_tasks
  for select to authenticated using (
    (visibility = 'private' and owner_id = (select auth.uid()))
    or (visibility = 'shared' and exists (
      select 1 from public.hd_household_members m
      where m.household_id = hd_tasks.household_id and m.user_id = (select auth.uid())
    ))
  );
create policy "Insert allowed hd_tasks" on public.hd_tasks
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and (
      (visibility = 'private' and household_id is null) or
      (visibility = 'shared' and exists (
        select 1 from public.hd_household_members m
        where m.household_id = hd_tasks.household_id and m.user_id = (select auth.uid())
      ))
    )
  );
create policy "Update accessible hd_tasks" on public.hd_tasks
  for update to authenticated
  using (
    (visibility = 'private' and owner_id = (select auth.uid())) or
    (visibility = 'shared' and exists (
      select 1 from public.hd_household_members m
      where m.household_id = hd_tasks.household_id and m.user_id = (select auth.uid())
    ))
  )
  with check (
    (visibility = 'private' and owner_id = (select auth.uid())) or
    (visibility = 'shared' and exists (
      select 1 from public.hd_household_members m
      where m.household_id = hd_tasks.household_id and m.user_id = (select auth.uid())
    ))
  );
create policy "Delete accessible hd_tasks" on public.hd_tasks
  for delete to authenticated using (
    (visibility = 'private' and owner_id = (select auth.uid())) or
    (visibility = 'shared' and exists (
      select 1 from public.hd_household_members m
      where m.household_id = hd_tasks.household_id and m.user_id = (select auth.uid())
    ))
  );

create policy "Read our shopping" on public.hd_shopping_items
  for select to authenticated using (exists (
    select 1 from public.hd_household_members m
    where m.household_id = hd_shopping_items.household_id and m.user_id = (select auth.uid())
  ));
create policy "Add our shopping" on public.hd_shopping_items
  for insert to authenticated with check (
    added_by = (select auth.uid()) and exists (
      select 1 from public.hd_household_members m
      where m.household_id = hd_shopping_items.household_id and m.user_id = (select auth.uid())
    )
  );
create policy "Update our shopping" on public.hd_shopping_items
  for update to authenticated using (exists (
    select 1 from public.hd_household_members m
    where m.household_id = hd_shopping_items.household_id and m.user_id = (select auth.uid())
  )) with check (exists (
    select 1 from public.hd_household_members m
    where m.household_id = hd_shopping_items.household_id and m.user_id = (select auth.uid())
  ));
create policy "Delete our shopping" on public.hd_shopping_items
  for delete to authenticated using (exists (
    select 1 from public.hd_household_members m
    where m.household_id = hd_shopping_items.household_id and m.user_id = (select auth.uid())
  ));

create policy "Read private or shared hd_events" on public.hd_events
  for select to authenticated using (
    (visibility = 'private' and owner_id = (select auth.uid()))
    or (visibility = 'shared' and exists (
      select 1 from public.hd_household_members m
      where m.household_id = hd_events.household_id and m.user_id = (select auth.uid())
    ))
  );
create policy "Insert allowed hd_events" on public.hd_events
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and (
      (visibility = 'private' and household_id is null) or
      (visibility = 'shared' and exists (
        select 1 from public.hd_household_members m
        where m.household_id = hd_events.household_id and m.user_id = (select auth.uid())
      ))
    )
  );
create policy "Update accessible hd_events" on public.hd_events
  for update to authenticated
  using (
    (visibility = 'private' and owner_id = (select auth.uid())) or
    (visibility = 'shared' and exists (
      select 1 from public.hd_household_members m
      where m.household_id = hd_events.household_id and m.user_id = (select auth.uid())
    ))
  )
  with check (
    (visibility = 'private' and owner_id = (select auth.uid())) or
    (visibility = 'shared' and exists (
      select 1 from public.hd_household_members m
      where m.household_id = hd_events.household_id and m.user_id = (select auth.uid())
    ))
  );
create policy "Delete accessible hd_events" on public.hd_events
  for delete to authenticated using (
    (visibility = 'private' and owner_id = (select auth.uid())) or
    (visibility = 'shared' and exists (
      select 1 from public.hd_household_members m
      where m.household_id = hd_events.household_id and m.user_id = (select auth.uid())
    ))
  );

-- Begrens API-tilganger. RLS er et ekstra lag, ikke erstatning for GRANT.
revoke all on public.hd_households, public.hd_household_members,
  public.hd_tasks, public.hd_shopping_items, public.hd_events from anon;
grant select on public.hd_households, public.hd_household_members to authenticated;
grant select, insert, update, delete on public.hd_tasks,
  public.hd_shopping_items, public.hd_events to authenticated;

-- Tilgjengeliggjør oppdateringer mellom de to klientene.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.hd_tasks, public.hd_shopping_items, public.hd_events;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
