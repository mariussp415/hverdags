alter table public.hd_shopping_items
 add column quantity numeric not null default 1 check(quantity > 0 and quantity <= 99999),
 add column unit text not null default 'stk' check(unit in ('stk','g','kg','ml','dl','l','pk','ss','ts'));

-- One transaction for the entire selection; RLS applies to every read and write.
create function public.hd_add_shopping(p_household uuid, p_visibility text, p_items jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare item jsonb; v_name text; v_unit text; v_quantity numeric; v_target uuid;
begin
 if auth.uid() is null then raise exception 'Du må logge inn'; end if;
 if p_visibility is null or p_visibility not in ('shared','private') then raise exception 'Ugyldig liste'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Ugyldige varer'; end if;
 if jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Velg mellom 1 og 100 varer'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
   v_name := trim(item->>'name'); v_unit := item->>'unit'; v_quantity := (item->>'quantity')::numeric;
   v_target := nullif(item->>'merge_id','')::uuid;
   if v_name is null or char_length(v_name) not between 1 and 100
      or v_unit is null or v_unit not in ('stk','g','kg','ml','dl','l','pk','ss','ts')
      or v_quantity is null or not(v_quantity > 0 and v_quantity <= 99999)
   then raise exception 'Kontroller navn, mengde og enhet'; end if;
   if v_target is null then
     insert into public.hd_shopping_items(household_id,added_by,visibility,name,quantity,unit)
     values(p_household,auth.uid(),p_visibility,v_name,v_quantity,v_unit);
   else
     update public.hd_shopping_items set quantity=quantity+v_quantity
     where id=v_target and household_id=p_household and visibility=p_visibility
       and not checked and unit=v_unit
       and lower(regexp_replace(trim(name),'\s+',' ','g'))=lower(regexp_replace(v_name,'\s+',' ','g'));
     if not found then raise exception 'Varen er endret eller kjøpt. Oppdater listen og prøv igjen.'; end if;
   end if;
 end loop;
end;
$$;
revoke all on function public.hd_add_shopping(uuid,text,jsonb) from public,anon;
grant execute on function public.hd_add_shopping(uuid,text,jsonb) to authenticated;
