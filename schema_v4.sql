-- EasyBuy Stage 4/4: full Pakistan-focused commerce schema
create extension if not exists pgcrypto;

-- Existing core tables are preserved; add store-level commerce settings.
alter table public.stores add column if not exists logo_url text not null default '';
alter table public.stores add column if not exists banner_url text not null default '';
alter table public.stores add column if not exists description text not null default '';
alter table public.stores add column if not exists currency text not null default 'PKR';
alter table public.stores add column if not exists shipping_fee integer not null default 0 check (shipping_fee >= 0);
alter table public.stores add column if not exists free_shipping_min integer not null default 0 check (free_shipping_min >= 0);
alter table public.stores add column if not exists payment_methods jsonb not null default '["cod"]'::jsonb;
alter table public.stores add column if not exists bank_details text not null default '';
alter table public.stores add column if not exists easypaisa_number text not null default '';
alter table public.stores add column if not exists jazzcash_number text not null default '';
alter table public.stores add column if not exists theme text not null default 'classic';
alter table public.stores add column if not exists published boolean not null default true;

alter table public.products add column if not exists stock integer not null default 0 check (stock >= 0);
alter table public.products add column if not exists sku text not null default '';
alter table public.products add column if not exists tags text[] not null default '{}';
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists weight_grams integer not null default 0 check (weight_grams >= 0);
create unique index if not exists products_store_sku_uidx on public.products(store_id, sku) where sku <> '';

-- Seller profile / roles. Set role='admin' manually for the platform owner.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'seller' check(role in ('seller','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select to authenticated using (id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check(id=auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin')) with check(id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin'));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id) values(new.id) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Customers and reusable addresses.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  phone text not null,
  name text not null default '',
  city text not null default '',
  address text not null default '',
  order_count integer not null default 0,
  total_spent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id,phone)
);
create index if not exists customers_store_idx on customers(store_id,updated_at desc);
alter table public.customers enable row level security;
create policy customers_owner on customers for all to authenticated using(exists(select 1 from stores s where s.id=store_id and (s.owner_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin')))) with check(exists(select 1 from stores s where s.id=store_id and (s.owner_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin'))));

-- Coupons.
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  discount_type text not null default 'percent' check(discount_type in ('percent','fixed')),
  discount_value integer not null check(discount_value>0),
  min_order integer not null default 0 check(min_order>=0),
  usage_limit integer not null default 0 check(usage_limit>=0),
  used_count integer not null default 0 check(used_count>=0),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(store_id,code)
);
alter table public.coupons enable row level security;
create policy coupons_owner on coupons for all to authenticated using(exists(select 1 from stores s where s.id=store_id and (s.owner_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin')))) with check(exists(select 1 from stores s where s.id=store_id and (s.owner_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin'))));

-- Reviews.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  customer_name text not null,
  phone text not null,
  rating integer not null check(rating between 1 and 5),
  body text not null default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on reviews(product_id,approved,created_at desc);
alter table public.reviews enable row level security;
create policy reviews_public on reviews for select using(approved=true);
create policy reviews_owner on reviews for all to authenticated using(exists(select 1 from stores s where s.id=store_id and (s.owner_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin')))) with check(exists(select 1 from stores s where s.id=store_id and (s.owner_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin'))));

-- Safe public order tracking: customer must know both order number and phone.
create or replace function public.track_order(p_store uuid,p_order_no integer,p_phone text)
returns table(order_no integer,status text,total integer,customer_name text,city text,created_at timestamptz)
language sql security definer set search_path=public as $$
  select o.order_no,o.status,o.total,o.customer_name,o.city,o.created_at
  from orders o where o.store_id=p_store and o.order_no=p_order_no and regexp_replace(o.customer_phone,'\D','','g')=regexp_replace(p_phone,'\D','','g') limit 1;
$$;
revoke all on function public.track_order(uuid,integer,text) from public;
grant execute on function public.track_order(uuid,integer,text) to anon,authenticated;

-- Coupon validation without exposing the whole coupon table.
create or replace function public.validate_coupon(p_store uuid,p_code text,p_subtotal integer)
returns table(valid boolean,discount integer,message text)
language plpgsql security definer set search_path=public as $$
declare c coupons%rowtype; d integer;
begin
 select * into c from coupons where store_id=p_store and upper(code)=upper(trim(p_code)) and active=true and (expires_at is null or expires_at>now()) limit 1;
 if not found then return query select false,0,'Invalid or expired coupon'; return; end if;
 if c.usage_limit>0 and c.used_count>=c.usage_limit then return query select false,0,'Coupon usage limit reached'; return; end if;
 if p_subtotal<c.min_order then return query select false,0,'Minimum order is Rs. '||c.min_order; return; end if;
 d:=case when c.discount_type='percent' then floor(p_subtotal*c.discount_value/100.0)::integer else c.discount_value end;
 d:=least(d,p_subtotal); return query select true,d,'Coupon applied';
end; $$;
revoke all on function public.validate_coupon(uuid,text,integer) from public;
grant execute on function public.validate_coupon(uuid,text,integer) to anon,authenticated;

-- Replace order function with stock, shipping, customer and coupon support.
create or replace function public.place_order(p_store uuid,p_name text,p_phone text,p_city text,p_address text,p_items jsonb,p_coupon text default '')
returns table(o_no integer,o_total integer,o_discount integer,o_shipping integer)
language plpgsql security definer set search_path=public as $$
declare v_no integer; v_sub integer:=0; v_total integer:=0; v_discount integer:=0; v_shipping integer:=0; v_items jsonb:='[]'::jsonb; r record; p record; c coupons%rowtype; cust customers%rowtype;
begin
 if not exists(select 1 from stores where id=p_store and published=true) then raise exception 'Store not found'; end if;
 if char_length(trim(coalesce(p_name,'')))<2 or char_length(trim(coalesce(p_city,'')))<2 or char_length(trim(coalesce(p_address,'')))<5 then raise exception 'Please fill in all delivery details'; end if;
 if regexp_replace(coalesce(p_phone,''),'\D','','g') !~ '^(92|0)?3[0-9]{9}$' then raise exception 'Enter a valid Pakistani mobile number'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>50 then raise exception 'Your cart is empty'; end if;
 for r in select (e->>'product_id')::uuid pid,greatest(least((e->>'qty')::int,99),1) qty from jsonb_array_elements(p_items)e loop
   select * into p from products where id=r.pid and store_id=p_store and is_active for update;
   if not found then raise exception 'A product in your cart is no longer available'; end if;
   if p.stock>0 and p.stock<r.qty then raise exception 'Not enough stock for %',p.name; end if;
   v_sub:=v_sub+p.price*r.qty; v_items:=v_items||jsonb_build_object('product_id',p.id,'name',p.name,'price',p.price,'qty',r.qty);
 end loop;
 if nullif(trim(coalesce(p_coupon,'')),'') is not null then
   select * into c from coupons where store_id=p_store and upper(code)=upper(trim(p_coupon)) and active=true and (expires_at is null or expires_at>now()) for update;
   if found and (c.usage_limit=0 or c.used_count<c.usage_limit) and v_sub>=c.min_order then
     v_discount:=case when c.discount_type='percent' then floor(v_sub*c.discount_value/100.0)::integer else c.discount_value end; v_discount:=least(v_discount,v_sub); c.used_count:=c.used_count+1; update coupons set used_count=c.used_count where id=c.id;
   end if;
 end if;
 select case when s.free_shipping_min>0 and v_sub-v_discount>=s.free_shipping_min then 0 else s.shipping_fee end into v_shipping from stores s where s.id=p_store;
 v_total:=greatest(v_sub-v_discount,0)+v_shipping;
 perform pg_advisory_xact_lock(hashtext(p_store::text)); select coalesce(max(o.order_no),1000)+1 into v_no from orders o where o.store_id=p_store;
 insert into orders(store_id,order_no,customer_name,customer_phone,city,address,items,total) values(p_store,v_no,trim(p_name),trim(p_phone),trim(p_city),trim(p_address),v_items,v_total);
 for r in select (e->>'product_id')::uuid pid,greatest(least((e->>'qty')::int,99),1) qty from jsonb_array_elements(p_items)e loop update products set stock=case when stock>0 then stock-r.qty else stock end where id=r.pid; end loop;
 insert into customers(store_id,phone,name,city,address,order_count,total_spent,updated_at) values(p_store,trim(p_phone),trim(p_name),trim(p_city),trim(p_address),1,v_total,now()) on conflict(store_id,phone) do update set name=excluded.name,city=excluded.city,address=excluded.address,order_count=customers.order_count+1,total_spent=customers.total_spent+excluded.total_spent,updated_at=now();
 return query select v_no,v_total,v_discount,v_shipping;
end; $$;
revoke all on function public.place_order(uuid,text,text,text,text,jsonb,text) from public;
grant execute on function public.place_order(uuid,text,text,text,text,jsonb,text) to anon,authenticated;
