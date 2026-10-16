begin;
do $test$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); h uuid:=gen_random_uuid(); shared_id uuid; private_id uuid; n integer;
begin
 insert into auth.users(id) values(a),(b),(outsider);
 insert into public.hd_households(id,name,created_by) values(h,'Quantity test',a);
 insert into public.hd_household_members(household_id,user_id) values(h,a),(h,b);
 perform set_config('request.jwt.claim.sub',a::text,true); perform set_config('role','authenticated',true);
 perform public.hd_add_shopping(h,'shared','[{"name":"Melk","quantity":1.5,"unit":"l"},{"name":"Egg","quantity":2,"unit":"stk"}]'::jsonb);
 select id into shared_id from public.hd_shopping_items where household_id=h and name='Melk';
 if not exists(select 1 from public.hd_shopping_items where id=shared_id and quantity=1.5 and unit='l') then raise exception 'Decimal insertion failed'; end if;
 perform public.hd_add_shopping(h,'private','[{"name":"Melk","quantity":2,"unit":"l"}]'::jsonb);
 select id into private_id from public.hd_shopping_items where household_id=h and visibility='private';
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.hd_add_shopping(h,'shared',jsonb_build_array(jsonb_build_object('name',' melk ','quantity',2,'unit','l','merge_id',shared_id)));
 if not exists(select 1 from public.hd_shopping_items where id=shared_id and quantity=3.5) then raise exception 'Atomic increase failed'; end if;
 update public.hd_shopping_items set name='Lettmelk',quantity=4,unit='stk' where id=shared_id;
 if not found then raise exception 'Partner edit failed'; end if;
 begin
 perform public.hd_add_shopping(h,'private',jsonb_build_array(jsonb_build_object('name','Melk','quantity',1,'unit','l','merge_id',private_id)));
 raise exception 'TEST: private merge allowed';
 exception when raise_exception then if sqlerrm like 'TEST:%' then raise; end if; end;
 begin
 perform public.hd_add_shopping(h,'shared',jsonb_build_array(jsonb_build_object('name','Lettmelk','quantity',1,'unit','l','merge_id',shared_id)));
 raise exception 'TEST: mixed units merged';
 exception when raise_exception then if sqlerrm like 'TEST:%' then raise; end if; end;
 begin
 perform public.hd_add_shopping(h,'shared','[{"name":"Rollback me","quantity":1,"unit":"stk"},{"name":"Invalid","quantity":0,"unit":"g"}]'::jsonb);
 raise exception 'TEST: zero quantity accepted';
 exception when raise_exception then if sqlerrm like 'TEST:%' then raise; end if; end;
 if exists(select 1 from public.hd_shopping_items where household_id=h and name='Rollback me') then raise exception 'Partial batch saved'; end if;
 update public.hd_shopping_items set checked=true where id=shared_id;
 begin
 perform public.hd_add_shopping(h,'shared',jsonb_build_array(jsonb_build_object('name','Lettmelk','quantity',1,'unit','stk','merge_id',shared_id)));
 raise exception 'TEST: checked item merged';
 exception when raise_exception then if sqlerrm like 'TEST:%' then raise; end if; end;
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 begin
 perform public.hd_add_shopping(h,'shared','[{"name":"Forbidden","quantity":1,"unit":"stk"}]'::jsonb);
 raise exception 'TEST: outsider inserted';
 exception when insufficient_privilege then null; end;
 perform set_config('role','postgres',true);
end $test$;
rollback;
select 'PASS: quantities, batch insert, shared editing, atomic increments, privacy, unit mismatch, all-or-nothing import, checked item protection, outsider isolation' as result;
