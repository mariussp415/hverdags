-- Existing items remain shared. Membership policies continue to apply.
alter table public.hd_shopping_items
  add column visibility text not null default 'shared'
  check (visibility in ('private', 'shared'));

-- Restrictive policies are ANDed with the existing household policies.
create policy "Shopping privacy" on public.hd_shopping_items
  as restrictive for all to authenticated
  using (visibility = 'shared' or added_by = (select auth.uid()))
  with check (visibility = 'shared' or added_by = (select auth.uid()));

create or replace function private.hd_immutable_shopping_scope()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.added_by is distinct from old.added_by
     or new.household_id is distinct from old.household_id
     or new.visibility is distinct from old.visibility then
    raise exception 'Vareeier, hjem og liste kan ikke endres';
  end if;
  return new;
end;
$$;

