alter table public.hd_shopping_items add column checked_at timestamptz;
-- Historical check-off times are unknown; give existing checked items 24 hours.
update public.hd_shopping_items set checked_at = now() where checked;

create function private.hd_stamp_shopping_checked()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    new.checked_at := case when new.checked then now() else null end;
  elsif new.checked is distinct from old.checked then
    new.checked_at := case when new.checked then now() else null end;
  else
    new.checked_at := old.checked_at;
  end if;
  return new;
end;
$$;
create trigger hd_shopping_checked_stamp before insert or update on public.hd_shopping_items
for each row execute function private.hd_stamp_shopping_checked();

alter table public.hd_shopping_items add constraint hd_shopping_checked_time
check ((checked and checked_at is not null) or (not checked and checked_at is null));
create index hd_shopping_expiry_idx on public.hd_shopping_items(checked_at) where checked;

-- Runs on app refresh with the caller's RLS permissions.
create function public.hd_cleanup_shopping()
returns void language sql security invoker set search_path = ''
as $$
  delete from public.hd_shopping_items
  where checked and checked_at <= now() - interval '24 hours';
$$;
revoke all on function public.hd_cleanup_shopping() from public, anon;
grant execute on function public.hd_cleanup_shopping() to authenticated;
