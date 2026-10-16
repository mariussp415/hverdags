begin;
do $test$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); h uuid:=gen_random_uuid();
 expired uuid:=gen_random_uuid(); recent uuid:=gen_random_uuid(); undone uuid:=gen_random_uuid(); other_private uuid:=gen_random_uuid(); n integer;
begin
 insert into auth.users(id) values(a),(b);
 insert into public.hd_households(id,name,created_by) values(h,'Cleanup test',a);
 insert into public.hd_household_members(household_id,user_id) values(h,a),(h,b);
 insert into public.hd_shopping_items(id,household_id,added_by,name,visibility,checked) values
 (expired,h,a,'Old shared','shared',true),(recent,h,a,'Recent','shared',true),
 (undone,h,a,'Undo','shared',true),(other_private,h,b,'Other private','private',true);
 alter table public.hd_shopping_items disable trigger hd_shopping_checked_stamp;
 update public.hd_shopping_items set checked_at=now()-interval '25 hours' where id in (expired,undone,other_private);
 alter table public.hd_shopping_items enable trigger hd_shopping_checked_stamp;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('role','authenticated',true);
 update public.hd_shopping_items set checked=false where id=undone;
 if not exists(select 1 from public.hd_shopping_items where id=undone and checked_at is null) then raise exception 'Undo did not reset timestamp'; end if;
 perform public.hd_cleanup_shopping();
 if exists(select 1 from public.hd_shopping_items where id=expired) then raise exception 'Expired item remains'; end if;
 select count(*) into n from public.hd_shopping_items where id in(recent,undone);
 if n<>2 then raise exception 'Recent or unchecked item deleted'; end if;
 update public.hd_shopping_items set checked=true where id=undone;
 if not exists(select 1 from public.hd_shopping_items where id=undone and checked_at=now()) then raise exception 'Recheck did not restart timer'; end if;
 update public.hd_shopping_items set checked_at=now()-interval '3 days' where id=recent;
 if not exists(select 1 from public.hd_shopping_items where id=recent and checked_at=now()) then raise exception 'Client can forge timestamp'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if not exists(select 1 from public.hd_shopping_items where id=other_private) then raise exception 'Partner private item deleted by caller'; end if;
 perform public.hd_cleanup_shopping();
 if exists(select 1 from public.hd_shopping_items where id=other_private) then raise exception 'Own expired private item remains'; end if;
 perform set_config('role','postgres',true);
end $test$;
rollback;
select 'PASS: expiry, recent retention, undo, restarted timer, server timestamp and private cleanup isolation' as result;
