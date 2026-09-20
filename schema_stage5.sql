-- EasyBuy Stage 5: production-oriented commerce extensions and safer RLS helpers.
-- Run after schema_v4.sql / schema_stage4.sql.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;

-- Replace recursive profile policies with the security-definer helper.
drop policy if exists profiles_self on public.profiles;
drop policy if exists profiles_admin on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select_safe on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profiles_insert_safe on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profiles_update_safe on public.profiles for update to authenticated using(id=auth.uid() or public.is_admin()) with check(id=auth.uid() or public.is_admin());

-- Storefront customization.
alter table public.stores add column if not exists navigation jsonb not null default '[]'::jsonb;
alter table public.stores add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.stores add column if not exists announcement text not null default '';
alter table public.stores add column if not exists return_policy text not null default '';
alter table public.stores add column if not exists privacy_policy text not null default '';
alter table public.stores add column if not exists terms_policy text not null default '';
alter table public.stores add column if not exists seo_title text not null default '';
alter table public.stores add column if not exists seo_description text not null default '';

create table if not exists public.store_domains (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  domain text not null unique,
  verified boolean not null default false,
  primary_domain boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.store_domains enable row level security;
drop policy if exists store_domains_owner on public.store_domains;
create policy store_domains_owner on public.store_domains for all to authenticated
using(exists(select 1 from public.stores s where s.id=store_id and (s.owner_id=auth.uid() or public.is_admin())))
with check(exists(select 1 from public.stores s where s.id=store_id and (s.owner_id=auth.uid() or public.is_admin())));

-- Customer addresses and wishlist foundation.
create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  phone text not null,
  label text not null default 'Default',
  name text not null default '',
  city text not null default '',
  address text not null default '',
  created_at timestamptz not null default now()
);
alter table public.customer_addresses enable row level security;
create policy customer_addresses_owner on public.customer_addresses for all to authenticated
using(exists(select 1 from public.stores s where s.id=store_id and (s.owner_id=auth.uid() or public.is_admin())))
with check(exists(select 1 from public.stores s where s.id=store_id and (s.owner_id=auth.uid() or public.is_admin())));

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  phone text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(store_id,phone,product_id)
);
alter table public.wishlists enable row level security;
create policy wishlists_owner on public.wishlists for all to authenticated
using(exists(select 1 from public.stores s where s.id=store_id and (s.owner_id=auth.uid() or public.is_admin())))
with check(exists(select 1 from public.stores s where s.id=store_id and (s.owner_id=auth.uid() or public.is_admin())));

-- Discount usage audit trail.
create table if not exists public.discount_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  order_no integer not null,
  phone text not null default '',
  discount integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.discount_usages enable row level security;
create policy discount_usages_owner on public.discount_usages for select to authenticated
using(exists(select 1 from public.stores s where s.id=store_id and (s.owner_id=auth.uid() or public.is_admin())));

-- Abandoned-cart foundation; no sensitive card data is stored.
create table if not exists public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  phone text not null default '',
  cart jsonb not null default '[]'::jsonb,
  subtotal integer not null default 0,
  recovered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.abandoned_carts enable row level security;
create policy abandoned_carts_owner on public.abandoned_carts for all to authenticated
using(exists(select 1 from public.stores s where s.id=store_id and (s.owner_id=auth.uid() or public.is_admin())))
with check(exists(select 1 from public.stores s where s.id=store_id and (s.owner_id=auth.uid() or public.is_admin())));

-- Make admin checks non-recursive in store/product/order visibility policies where these policies exist.
-- New/updated policies use public.is_admin() rather than querying profiles from inside profiles policies.

-- Safer public tracking: only expose the minimal tracking fields already required by checkout verification.
create or replace function public.track_order(p_store uuid,p_order_no integer,p_phone text)
returns table(order_no integer,status text,total integer,customer_name text,city text,created_at timestamptz)
language sql security definer set search_path=public as $$
  select o.order_no,o.status,o.total,o.customer_name,o.city,o.created_at
  from public.orders o
  where o.store_id=p_store and o.order_no=p_order_no
    and regexp_replace(o.customer_phone,'\D','','g')=regexp_replace(p_phone,'\D','','g')
  limit 1;
$$;
revoke all on function public.track_order(uuid,integer,text) from public;
grant execute on function public.track_order(uuid,integer,text) to anon,authenticated;

-- Atomic order placement with row locks, normalized phone and a usage audit row.
create or replace function public.place_order(p_store uuid,p_name text,p_phone text,p_city text,p_address text,p_items jsonb,p_coupon text default '')
returns table(o_no integer,o_total integer,o_discount integer,o_shipping integer)
language plpgsql security definer set search_path=public as $$
declare
  v_no integer; v_sub integer:=0; v_total integer:=0; v_discount integer:=0; v_shipping integer:=0; v_items jsonb:='[]'::jsonb;
  r record; p record; c public.coupons%rowtype; v_phone text; v_used integer;
begin
  if not exists(select 1 from public.stores where id=p_store and published=true) then raise exception 'Store not found'; end if;
  if char_length(trim(coalesce(p_name,'')))<2 or char_length(trim(coalesce(p_city,'')))<2 or char_length(trim(coalesce(p_address,'')))<5 then raise exception 'Please fill in all delivery details'; end if;
  v_phone:=regexp_replace(coalesce(p_phone,''),'\D','','g');
  if v_phone like '0%' then v_phone:='92'||substr(v_phone,2); end if;
  if v_phone !~ '^923[0-9]{9}$' then raise exception 'Enter a valid Pakistani mobile number'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>50 then raise exception 'Your cart is empty'; end if;
  for r in select (e->>'product_id')::uuid pid,greatest(least(coalesce((e->>'qty')::int,1),99),1) qty from jsonb_array_elements(p_items)e loop
    select * into p from public.products where id=r.pid and store_id=p_store and is_active=true for update;
    if not found then raise exception 'A product in your cart is no longer available'; end if;
    if p.stock>0 and p.stock<r.qty then raise exception 'Not enough stock for %',p.name; end if;
    v_sub:=v_sub+p.price*r.qty;
    v_items:=v_items||jsonb_build_object('product_id',p.id,'name',p.name,'price',p.price,'qty',r.qty,'sku',p.sku);
  end loop;
  if nullif(trim(coalesce(p_coupon,'')),'') is not null then
    select * into c from public.coupons where store_id=p_store and upper(code)=upper(trim(p_coupon)) and active=true and (expires_at is null or expires_at>now()) for update;
    if found then
      if c.usage_limit>0 and c.used_count>=c.usage_limit then raise exception 'Coupon usage limit reached'; end if;
      if v_sub<c.min_order then raise exception 'Minimum order for this coupon is Rs. %',c.min_order; end if;
      v_discount:=case when c.discount_type='percent' then floor(v_sub*c.discount_value/100.0)::integer else c.discount_value end;
      v_discount:=least(v_discount,v_sub);
      update public.coupons set used_count=used_count+1 where id=c.id;
    end if;
  end if;
  select case when s.free_shipping_min>0 and v_sub-v_discount>=s.free_shipping_min then 0 else s.shipping_fee end into v_shipping from public.stores s where s.id=p_store;
  v_total:=greatest(v_sub-v_discount,0)+v_shipping;
  perform pg_advisory_xact_lock(hashtext(p_store::text));
  select coalesce(max(o.order_no),1000)+1 into v_no from public.orders o where o.store_id=p_store;
  insert into public.orders(store_id,order_no,customer_name,customer_phone,city,address,items,total)
  values(p_store,v_no,trim(p_name),v_phone,trim(p_city),trim(p_address),v_items,v_total);
  for r in select (e->>'product_id')::uuid pid,greatest(least(coalesce((e->>'qty')::int,1),99),1) qty from jsonb_array_elements(p_items)e loop
    update public.products set stock=case when stock>0 then stock-r.qty else stock end where id=r.pid and store_id=p_store;
  end loop;
  if c.id is not null then insert into public.discount_usages(coupon_id,store_id,order_no,phone,discount) values(c.id,p_store,v_no,v_phone,v_discount); end if;
  insert into public.customers(store_id,phone,name,city,address,order_count,total_spent,updated_at)
  values(p_store,v_phone,trim(p_name),trim(p_city),trim(p_address),1,v_total,now())
  on conflict(store_id,phone) do update set name=excluded.name,city=excluded.city,address=excluded.address,order_count=public.customers.order_count+1,total_spent=public.customers.total_spent+excluded.total_spent,updated_at=now();
  return query select v_no,v_total,v_discount,v_shipping;
end; $$;
revoke all on function public.place_order(uuid,text,text,text,text,jsonb,text) from public;
grant execute on function public.place_order(uuid,text,text,text,text,jsonb,text) to anon,authenticated;
