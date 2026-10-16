begin;
do $test$
declare
 a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
 h uuid := gen_random_uuid(); own_item uuid := gen_random_uuid(); shared_item uuid := gen_random_uuid();
 n integer;
begin
 insert into auth.users(id) values(a),(b),(outsider);
 insert into public.hd_households(id,name,created_by) values(h,'Shopping RLS test',a);
 insert into public.hd_household_members(household_id,user_id) values(h,a),(h,b);
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('role','authenticated',true);
 insert into public.hd_shopping_items(id,household_id,added_by,name,visibility) values
 (own_item,h,a,'Private test','private'),(shared_item,h,a,'Shared test','shared');
 select count(*) into n from public.hd_shopping_items where id in (own_item,shared_item);
 if n<>2 then raise exception 'Owner cannot read both lists'; end if;
 update public.hd_shopping_items set checked=true where id=own_item;
 if not found then raise exception 'Owner cannot update'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 select count(*) into n from public.hd_shopping_items where id in (own_item,shared_item);
 if n<>1 then raise exception 'Partner can read private item'; end if;
 update public.hd_shopping_items set checked=false where id=own_item;
 if found then raise exception 'Partner can update private item'; end if;
 delete from public.hd_shopping_items where id=own_item;
 if found then raise exception 'Partner can delete private item'; end if;
 update public.hd_shopping_items set checked=true where id=shared_item;
 if not found then raise exception 'Partner cannot update shared'; end if;
 begin
 insert into public.hd_shopping_items(household_id,added_by,name,visibility) values(h,a,'Forged owner','private');
 raise exception 'Forged owner allowed';
 exception when insufficient_privilege then null;
 end;
 begin
 update public.hd_shopping_items set visibility='private' where id=shared_item;
 raise exception 'Scope mutation allowed';
 exception when raise_exception then
 if sqlerrm='Scope mutation allowed' then raise; end if;
 end;
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 select count(*) into n from public.hd_shopping_items where id in (own_item,shared_item);
 if n<>0 then raise exception 'Outsider can read household'; end if;
 begin
 insert into public.hd_shopping_items(household_id,added_by,name) values(h,outsider,'Outsider');
 raise exception 'Outsider insert allowed';
 exception when insufficient_privilege then null;
 end;
 perform set_config('request.jwt.claim.sub',b::text,true);
 delete from public.hd_shopping_items where id=shared_item;
 if not found then raise exception 'Partner cannot delete shared'; end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 delete from public.hd_shopping_items where id=own_item;
 if not found then raise exception 'Owner cannot delete private'; end if;
 perform set_config('role','postgres',true);
end $test$;
rollback;
select 'PASS: owner CRUD, partner sharing, private isolation, forged owner, immutable scope, outsider isolation; fixtures rolled back' as result;
