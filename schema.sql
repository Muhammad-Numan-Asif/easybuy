-- EasyBuy Stage 2: database schema, security rules and image storage
-- Run this whole file once in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,30}$'),
  name        text not null check (char_length(name) between 1 and 60),
  category    text not null default 'Other',
  color       text not null default '#0a7d55' check (color ~ '^#[0-9a-fA-F]{6}$'),
  whatsapp    text not null default '',
  tagline     text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  price        integer not null check (price > 0),
  old_price    integer not null default 0 check (old_price >= 0),
  category     text not null default '',
  description  text not null default '',
  image_url    text not null default '',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists products_store_idx on public.products(store_id);

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  order_no        integer not null,
  customer_name   text not null,
  customer_phone  text not null,
  city            text not null,
  address         text not null,
  items           jsonb not null,
  total           integer not null check (total > 0),
  status          text not null default 'New' check (status in ('New','Confirmed','Shipped','Delivered','Cancelled')),
  created_at      timestamptz not null default now(),
  unique (store_id, order_no)
);
create index if not exists orders_store_idx on public.orders(store_id, created_at desc);

-- ---------- row level security ----------
alter table public.stores   enable row level security;
alter table public.products enable row level security;
alter table public.orders   enable row level security;

-- stores: anyone can read (needed for public storefronts), only the owner can change
drop policy if exists stores_read   on public.stores;
drop policy if exists stores_insert on public.stores;
drop policy if exists stores_update on public.stores;
drop policy if exists stores_delete on public.stores;
create policy stores_read   on public.stores for select using (true);
create policy stores_insert on public.stores for insert to authenticated with check (owner_id = auth.uid());
create policy stores_update on public.stores for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy stores_delete on public.stores for delete to authenticated using (owner_id = auth.uid());

-- products: anyone can read ACTIVE products; the owner (products_write below) can see and change all of them
drop policy if exists products_read   on public.products;
drop policy if exists products_write  on public.products;
create policy products_read  on public.products for select using (is_active);
create policy products_write on public.products for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- orders: only the store owner can read or update. Nobody inserts directly;
-- customers go through place_order() below, which checks prices on the server.
drop policy if exists orders_owner_read   on public.orders;
drop policy if exists orders_owner_update on public.orders;
create policy orders_owner_read on public.orders for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy orders_owner_update on public.orders for update to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- ---------- place_order: the only way a customer creates an order ----------
create or replace function public.place_order(
  p_store   uuid,
  p_name    text,
  p_phone   text,
  p_city    text,
  p_address text,
  p_items   jsonb
) returns table (o_no integer, o_total integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_no    integer;
  v_total integer := 0;
  v_items jsonb := '[]'::jsonb;
  r       record;
  p       record;
begin
  if not exists (select 1 from stores where id = p_store) then
    raise exception 'Store not found';
  end if;
  if char_length(trim(coalesce(p_name,''))) < 2
     or char_length(trim(coalesce(p_city,''))) < 2
     or char_length(trim(coalesce(p_address,''))) < 5 then
    raise exception 'Please fill in all delivery details';
  end if;
  if regexp_replace(coalesce(p_phone,''), '\D', '', 'g') !~ '^(92|0)?3[0-9]{9}$' then
    raise exception 'Enter a valid Pakistani mobile number';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Your cart is empty';
  end if;

  for r in
    select (e->>'product_id')::uuid as pid,
           greatest(least((e->>'qty')::int, 99), 1) as qty
    from jsonb_array_elements(p_items) e
  loop
    select * into p from products where id = r.pid and store_id = p_store and is_active;
    if not found then
      raise exception 'A product in your cart is no longer available';
    end if;
    v_total := v_total + p.price * r.qty;
    v_items := v_items || jsonb_build_object('product_id', p.id, 'name', p.name, 'price', p.price, 'qty', r.qty);
  end loop;

  perform pg_advisory_xact_lock(hashtext(p_store::text));
  select coalesce(max(o.order_no), 1000) + 1 into v_no from orders o where o.store_id = p_store;

  insert into orders (store_id, order_no, customer_name, customer_phone, city, address, items, total)
  values (p_store, v_no, trim(p_name), trim(p_phone), trim(p_city), trim(p_address), v_items, v_total);

  return query select v_no, v_total;
end;
$$;

revoke all on function public.place_order(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.place_order(uuid, text, text, text, text, jsonb) to anon, authenticated;

-- ---------- product image storage ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images public read"  on storage.objects;
drop policy if exists "product images owner insert" on storage.objects;
drop policy if exists "product images owner update" on storage.objects;
drop policy if exists "product images owner delete" on storage.objects;
create policy "product images public read" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "product images owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "product images owner update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "product images owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
-- EasyBuy Stage 6: International Expansion Patch

-- 1. Store settings update for Multi-Currency & Payments
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS supported_currencies JSONB NOT NULL DEFAULT '["USD", "EUR", "GBP", "PKR", "AED", "SAR"]'::jsonb,
ADD COLUMN IF NOT EXISTS payment_gateways JSONB NOT NULL DEFAULT '{"stripe": {"enabled": false}, "paypal": {"enabled": false}, "cod": {"enabled": true}}'::jsonb,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00;

-- 2. Shipping Zones Table for Worldwide Shipping
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL, -- e.g., "North America", "Europe", "GCC Countries", "Rest of World"
  countries JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g., ["US", "CA", "GB", "AE", "SA"]
  rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  min_order_amount NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Security for Shipping Zones
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY shipping_zones_select ON public.shipping_zones 
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY shipping_zones_all_owner ON public.shipping_zones 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = shipping_zones.store_id AND s.owner_id = auth.uid()));

-- 3. International Address & Payment details in Orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS postal_code TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS state_province TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'cod', -- stripe, paypal, cod
ADD COLUMN IF NOT EXISTS transaction_id TEXT DEFAULT '';
