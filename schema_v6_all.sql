-- EasyBuy: one SQL file for everything after schema.sql
-- (commerce features, security fixes and international selling). Safe to run more than once.
-- Do NOT run schema_v4.sql or schema_stage4.sql. This file replaces them.

-- EasyBuy v5: commerce features, admin role and security fixes.
-- Run AFTER schema.sql. Do NOT run schema_v4.sql / schema_stage4.sql (this file replaces them).
-- Safe to run more than once, and safe to run on a project where v4 was already applied.

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. Columns
-- =====================================================================
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

alter table public.products add column if not exists sku text not null default '';
alter table public.products add column if not exists tags text[] not null default '{}';
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists weight_grams integer not null default 0 check (weight_grams >= 0);
create unique index if not exists products_store_sku_uidx on public.products(store_id, sku) where sku <> '';

-- Stock: NULL = not tracked (unlimited). A number = tracked, 0 = sold out.
-- (v4 used 0 for "unlimited", which turned a sold-out product back into unlimited stock.)
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='products' and column_name='stock') then
    alter table public.products add column stock integer check (stock is null or stock >= 0);
  elsif exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='products' and column_name='stock' and is_nullable='NO') then
    alter table public.products alter column stock drop not null;
    alter table public.products alter column stock drop default;
    update public.products set stock = null where stock = 0;
  end if;
end $$;

alter table public.orders add column if not exists payment_method text not null default 'cod';
alter table public.orders add column if not exists discount integer not null default 0;
alter table public.orders add column if not exists shipping integer not null default 0;
alter table public.orders add column if not exists coupon_code text not null default '';
alter table public.orders add column if not exists payment_note text not null default '';

-- =====================================================================
-- 2. Profiles and admin role
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'seller' check (role in ('seller','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- SECURITY DEFINER so policies can ask "is this user an admin?" without
-- re-entering the profiles policy (v4 did that and crashed with "infinite recursion").
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists profiles_self   on public.profiles;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid() and role = 'seller');
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Users may edit only their own name and phone. The role column can be changed
-- only from the Supabase SQL editor (see README), never from the website.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- =====================================================================
-- 3. Row level security for stores, products, orders
-- =====================================================================
drop policy if exists stores_read   on public.stores;
drop policy if exists stores_insert on public.stores;
drop policy if exists stores_update on public.stores;
drop policy if exists stores_delete on public.stores;
create policy stores_read   on public.stores for select using (published or owner_id = auth.uid() or public.is_admin());
create policy stores_insert on public.stores for insert to authenticated with check (owner_id = auth.uid());
create policy stores_update on public.stores for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy stores_delete on public.stores for delete to authenticated using (owner_id = auth.uid() or public.is_admin());
-- Sellers cannot change slug, owner or the published flag (only an admin can unpublish).
revoke update on public.stores from anon, authenticated;
grant update (name, category, color, whatsapp, tagline, logo_url, banner_url, description, currency,
              shipping_fee, free_shipping_min, payment_methods, bank_details, easypaisa_number,
              jazzcash_number, theme) on public.stores to authenticated;

drop policy if exists products_read  on public.products;
drop policy if exists products_write on public.products;
create policy products_read on public.products for select
  using ((is_active and exists (select 1 from public.stores s where s.id = store_id and s.published)) or public.is_admin());
create policy products_write on public.products for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists orders_owner_read   on public.orders;
drop policy if exists orders_owner_update on public.orders;
drop policy if exists orders_admin_read   on public.orders;
create policy orders_owner_read on public.orders for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()) or public.is_admin());
create policy orders_owner_update on public.orders for update to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
-- Sellers can change the status of an order, nothing else (not the total, not the items).
revoke update on public.orders from anon, authenticated;
grant update (status) on public.orders to authenticated;

-- =====================================================================
-- 4. Customers, coupons, reviews
-- =====================================================================
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
  unique (store_id, phone)
);
create index if not exists customers_store_idx on public.customers(store_id, updated_at desc);
alter table public.customers enable row level security;
drop policy if exists customers_owner on public.customers;
create policy customers_owner on public.customers for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()) or public.is_admin());

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  discount_type text not null default 'percent' check (discount_type in ('percent','fixed')),
  discount_value integer not null check (discount_value > 0),
  min_order integer not null default 0 check (min_order >= 0),
  usage_limit integer not null default 0 check (usage_limit >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, code)
);
alter table public.coupons enable row level security;
drop policy if exists coupons_owner on public.coupons;
create policy coupons_owner on public.coupons for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()) or public.is_admin())
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()) or public.is_admin());

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  customer_name text not null,
  phone text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews(product_id, approved, created_at desc);
create unique index if not exists reviews_one_per_buyer on public.reviews(product_id, phone);
alter table public.reviews enable row level security;
-- No public read policy: reviews hold the buyer's phone number. The storefront reads
-- approved reviews through get_reviews() below, which leaves the phone out.
drop policy if exists reviews_public on public.reviews;
drop policy if exists reviews_owner  on public.reviews;
drop policy if exists reviews_owner_select on public.reviews;
drop policy if exists reviews_owner_update on public.reviews;
drop policy if exists reviews_owner_delete on public.reviews;
create policy reviews_owner_select on public.reviews for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()) or public.is_admin());
create policy reviews_owner_update on public.reviews for update to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy reviews_owner_delete on public.reviews for delete to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()) or public.is_admin());
revoke update on public.reviews from anon, authenticated;
grant update (approved) on public.reviews to authenticated;

-- =====================================================================
-- 5. Functions
-- =====================================================================
create or replace function public._norm_phone(p text) returns text
language sql immutable as $$
  select case
    when d ~ '^923[0-9]{9}$' then '0' || substr(d, 3)
    when d ~ '^3[0-9]{9}$'   then '0' || d
    else d end
  from (select regexp_replace(coalesce(p,''), '\D', '', 'g') as d) t;
$$;

create or replace function public._variant_label(v jsonb) returns text
language sql immutable as $$
  select concat_ws(' / ', nullif(trim(v->>'name'), ''), nullif(trim(v->>'option'), ''));
$$;

-- Old versions (v3 and v4). The old 6-argument place_order is dropped so nobody can call it
-- to skip shipping fees or stock checks.
drop function if exists public.place_order(uuid, text, text, text, text, jsonb);
drop function if exists public.place_order(uuid, text, text, text, text, jsonb, text);
drop function if exists public.validate_coupon(uuid, text, integer);
drop function if exists public.track_order(uuid, integer, text);

-- One pricing routine used by both the cart preview and the real order,
-- so the customer always sees the same numbers that get charged.
create or replace function public._price_cart(p_store uuid, p_items jsonb, p_coupon text, p_lock boolean)
returns table (subtotal integer, discount integer, shipping integer, total integer,
               coupon_id uuid, coupon_msg text, items jsonb)
language plpgsql security definer set search_path = public as $$
declare
  s stores%rowtype; p products%rowtype; c coupons%rowtype; r record; v_var jsonb;
  v_sub integer := 0; v_disc integer := 0; v_ship integer := 0; v_items jsonb := '[]'::jsonb;
  v_price integer; v_label text; v_msg text := ''; v_cid uuid;
begin
  select * into s from stores where id = p_store and published;
  if not found then raise exception 'Store not found'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Your cart is empty';
  end if;

  -- stock, checked per product across all of its cart lines
  for r in
    select (e->>'product_id')::uuid as pid,
           sum(greatest(least(coalesce((e->>'qty')::int, 1), 99), 1)) as qty
    from jsonb_array_elements(p_items) e group by 1
  loop
    if p_lock then
      select * into p from products where id = r.pid and store_id = p_store and is_active for update;
    else
      select * into p from products where id = r.pid and store_id = p_store and is_active;
    end if;
    if not found then raise exception 'A product in your cart is no longer available'; end if;
    if p.stock is not null and p.stock < r.qty then
      if p.stock = 0 then raise exception '% is sold out', p.name;
      else raise exception 'Only % left of %', p.stock, p.name; end if;
    end if;
  end loop;

  -- prices come from the database, including variant prices
  for r in
    select (e->>'product_id')::uuid as pid,
           nullif(trim(coalesce(e->>'variant', '')), '') as variant,
           greatest(least(coalesce((e->>'qty')::int, 1), 99), 1) as qty
    from jsonb_array_elements(p_items) e
  loop
    select * into p from products where id = r.pid and store_id = p_store and is_active;
    v_price := p.price; v_label := ''; v_var := null;
    if jsonb_array_length(p.variants) > 0 then
      if r.variant is null then raise exception 'Please choose an option for %', p.name; end if;
      select el.value into v_var from jsonb_array_elements(p.variants) el
        where public._variant_label(el.value) = r.variant limit 1;
      if v_var is null then raise exception 'That option is no longer available for %', p.name; end if;
      v_label := r.variant;
      if coalesce(v_var->>'price', '') ~ '^[0-9]+$' and (v_var->>'price')::int > 0 then
        v_price := (v_var->>'price')::int;
      end if;
    end if;
    v_sub := v_sub + v_price * r.qty;
    v_items := v_items || jsonb_build_object('product_id', p.id, 'name', p.name,
                 'variant', v_label, 'price', v_price, 'qty', r.qty);
  end loop;

  if nullif(trim(coalesce(p_coupon, '')), '') is not null then
    if p_lock then
      select * into c from coupons where store_id = p_store and upper(code) = upper(trim(p_coupon)) for update;
    else
      select * into c from coupons where store_id = p_store and upper(code) = upper(trim(p_coupon));
    end if;
    if not found or not c.active or (c.expires_at is not null and c.expires_at <= now()) then
      v_msg := 'Invalid or expired coupon';
    elsif c.usage_limit > 0 and c.used_count >= c.usage_limit then
      v_msg := 'This coupon has been fully used';
    elsif v_sub < c.min_order then
      v_msg := 'Minimum order for this coupon is Rs. ' || c.min_order;
    else
      v_disc := case when c.discount_type = 'percent'
                     then floor(v_sub * least(c.discount_value, 100) / 100.0)::integer
                     else c.discount_value end;
      v_disc := least(v_disc, v_sub); v_cid := c.id; v_msg := 'Coupon applied';
    end if;
  end if;

  v_ship := case when s.free_shipping_min > 0 and v_sub - v_disc >= s.free_shipping_min then 0 else s.shipping_fee end;
  return query select v_sub, v_disc, v_ship, v_sub - v_disc + v_ship, v_cid, v_msg, v_items;
end; $$;
revoke all on function public._price_cart(uuid, jsonb, text, boolean) from public, anon, authenticated;

-- Cart preview for the storefront (no order is created).
create or replace function public.quote_cart(p_store uuid, p_items jsonb, p_coupon text default '')
returns table (subtotal integer, discount integer, shipping integer, total integer, coupon_msg text)
language plpgsql security definer set search_path = public as $$
begin
  return query select q.subtotal, q.discount, q.shipping, q.total, q.coupon_msg
               from public._price_cart(p_store, p_items, p_coupon, false) q;
end; $$;
revoke all on function public.quote_cart(uuid, jsonb, text) from public;
grant execute on function public.quote_cart(uuid, jsonb, text) to anon, authenticated;

create or replace function public.place_order(
  p_store uuid, p_name text, p_phone text, p_city text, p_address text, p_items jsonb,
  p_coupon text default '', p_payment text default 'cod', p_note text default ''
) returns table (o_no integer, o_total integer, o_discount integer, o_shipping integer)
language plpgsql security definer set search_path = public as $$
declare
  s stores%rowtype; q record; v_no integer; v_phone text;
begin
  select * into s from stores where id = p_store and published;
  if not found then raise exception 'Store not found'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 or char_length(trim(coalesce(p_city, ''))) < 2
     or char_length(trim(coalesce(p_address, ''))) < 5 then
    raise exception 'Please fill in all delivery details';
  end if;
  if regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') !~ '^(92|0)?3[0-9]{9}$' then
    raise exception 'Enter a valid Pakistani mobile number';
  end if;
  if not (s.payment_methods ? coalesce(p_payment, 'cod')) then
    raise exception 'This payment method is not offered by the store';
  end if;

  select * into q from public._price_cart(p_store, p_items, p_coupon, true);
  if nullif(trim(coalesce(p_coupon, '')), '') is not null and q.coupon_id is null then
    raise exception '%', q.coupon_msg;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_store::text));
  select coalesce(max(o.order_no), 1000) + 1 into v_no from orders o where o.store_id = p_store;
  v_phone := public._norm_phone(p_phone);

  insert into orders (store_id, order_no, customer_name, customer_phone, city, address, items, total,
                      payment_method, discount, shipping, coupon_code, payment_note)
  values (p_store, v_no, trim(p_name), trim(p_phone), trim(p_city), trim(p_address), q.items, q.total,
          coalesce(p_payment, 'cod'), q.discount, q.shipping,
          case when q.coupon_id is null then '' else upper(trim(p_coupon)) end,
          left(trim(coalesce(p_note, '')), 200));

  update products pr set stock = pr.stock - t.qty
  from (select (e->>'product_id')::uuid as pid, sum((e->>'qty')::int) as qty
        from jsonb_array_elements(q.items) e group by 1) t
  where pr.id = t.pid and pr.stock is not null;

  if q.coupon_id is not null then
    update coupons set used_count = used_count + 1 where id = q.coupon_id;
  end if;

  insert into customers (store_id, phone, name, city, address, order_count, total_spent, updated_at)
  values (p_store, v_phone, trim(p_name), trim(p_city), trim(p_address), 1, q.total, now())
  on conflict (store_id, phone) do update
    set name = excluded.name, city = excluded.city, address = excluded.address,
        order_count = customers.order_count + 1,
        total_spent = customers.total_spent + excluded.total_spent, updated_at = now();

  return query select v_no, q.total, q.discount, q.shipping;
end; $$;
revoke all on function public.place_order(uuid, text, text, text, text, jsonb, text, text, text) from public;
grant execute on function public.place_order(uuid, text, text, text, text, jsonb, text, text, text) to anon, authenticated;

-- Customer order tracking: needs the order number AND the phone used on the order.
create or replace function public.track_order(p_store uuid, p_order_no integer, p_phone text)
returns table (order_no integer, status text, total integer, customer_name text, city text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select o.order_no, o.status, o.total, o.customer_name, o.city, o.created_at
  from orders o
  where o.store_id = p_store and o.order_no = p_order_no
    and public._norm_phone(o.customer_phone) = public._norm_phone(p_phone)
  limit 1;
$$;
revoke all on function public.track_order(uuid, integer, text) from public;
grant execute on function public.track_order(uuid, integer, text) to anon, authenticated;

-- Reviews: only someone who ordered the product (same phone number) can review it,
-- one review per buyer per product, and the seller approves it before it shows.
create or replace function public.submit_review(p_store uuid, p_product uuid, p_name text, p_phone text, p_rating integer, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Choose a rating from 1 to 5'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Please enter your name'; end if;
  if not exists (
    select 1 from orders o
    where o.store_id = p_store and o.status <> 'Cancelled'
      and public._norm_phone(o.customer_phone) = public._norm_phone(p_phone)
      and o.items @> jsonb_build_array(jsonb_build_object('product_id', p_product))
  ) then
    raise exception 'Only customers who ordered this product can review it. Use the phone number from your order.';
  end if;
  begin
    insert into reviews (store_id, product_id, customer_name, phone, rating, body)
    values (p_store, p_product, left(trim(p_name), 60), public._norm_phone(p_phone), p_rating, left(trim(coalesce(p_body, '')), 500));
  exception when unique_violation then
    raise exception 'You have already reviewed this product';
  end;
end; $$;
revoke all on function public.submit_review(uuid, uuid, text, text, integer, text) from public;
grant execute on function public.submit_review(uuid, uuid, text, text, integer, text) to anon, authenticated;

create or replace function public.get_reviews(p_store uuid)
returns table (product_id uuid, customer_name text, rating integer, body text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select r.product_id, r.customer_name, r.rating, r.body, r.created_at
  from reviews r join stores s on s.id = r.store_id
  where r.store_id = p_store and r.approved and s.published
  order by r.created_at desc limit 300;
$$;
revoke all on function public.get_reviews(uuid) from public;
grant execute on function public.get_reviews(uuid) to anon, authenticated;

-- Platform admin: publish or unpublish any store.
create or replace function public.admin_set_store_published(p_store uuid, p_published boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update stores set published = p_published where id = p_store;
end; $$;
revoke all on function public.admin_set_store_published(uuid, boolean) from public;
grant execute on function public.admin_set_store_published(uuid, boolean) to authenticated;

-- ####################################################################
-- Part 2: international selling
-- ####################################################################
-- EasyBuy v6: international selling (markets, currencies, shipping by country).
-- Run AFTER schema.sql and schema_v5.sql. Safe to run more than once.
--
-- How it works (same idea as Shopify Markets):
--  * A store has a home country and a store currency (default PK / PKR). Prices are entered in that currency.
--  * The seller adds "markets": a country, its currency, an exchange rate, shipping fee and payment methods.
--  * The customer picks a country. Prices, shipping and the total are shown in that market's currency.
--  * The server does all the maths, so the browser cannot change a price or a rate.
--  * Every order keeps the currency, the rate used and the amount the customer must pay,
--    plus the store-currency equivalent so dashboards and reports stay in one currency.

-- =====================================================================
-- 1. Columns and validation
-- =====================================================================
alter table public.stores add column if not exists home_country text not null default 'PK';
alter table public.stores add column if not exists markets jsonb not null default '[]'::jsonb;
alter table public.stores drop constraint if exists stores_home_country_chk;
alter table public.stores add constraint stores_home_country_chk check (home_country ~ '^[A-Z]{2}$');
alter table public.stores drop constraint if exists stores_currency_chk;
alter table public.stores add constraint stores_currency_chk check (currency ~ '^[A-Z]{3}$');
grant update (home_country, markets) on public.stores to authenticated;

alter table public.orders add column if not exists currency text not null default 'PKR';
alter table public.orders add column if not exists fx_rate numeric(18,8) not null default 1;
alter table public.orders add column if not exists charged_total numeric(14,3);
alter table public.orders add column if not exists country text not null default 'PK';
alter table public.orders add column if not exists state text not null default '';
alter table public.orders add column if not exists postal_code text not null default '';

create or replace function public._cur_dec(c text) returns integer
language sql immutable as $$
  select case when upper(c) in ('PKR','JPY','KRW','VND','CLP','ISK','UGX') then 0
              when upper(c) in ('KWD','BHD','OMR','JOD','TND') then 3
              else 2 end;
$$;

create or replace function public._check_store_markets() returns trigger
language plpgsql as $$
declare
  m jsonb; seen text[] := '{}';
begin
  if new.markets is null or jsonb_typeof(new.markets) <> 'array' then
    raise exception 'Markets must be a list';
  end if;
  if jsonb_array_length(new.markets) > 60 then raise exception 'Too many markets'; end if;
  for m in select value from jsonb_array_elements(new.markets) loop
    if coalesce(m->>'country', '') !~ '^[A-Z]{2}$' then raise exception 'Invalid country code'; end if;
    if m->>'country' = new.home_country then raise exception 'The home country cannot also be a market'; end if;
    if (m->>'country') = any (seen) then raise exception 'Duplicate market for %', m->>'country'; end if;
    seen := seen || (m->>'country');
    if coalesce(m->>'currency', '') !~ '^[A-Z]{3}$' then raise exception 'Invalid currency for %', m->>'country'; end if;
    if jsonb_typeof(m->'rate') <> 'number' or (m->>'rate')::numeric <= 0 or (m->>'rate')::numeric > 1000000 then
      raise exception 'Invalid exchange rate for %', m->>'country';
    end if;
    if jsonb_typeof(m->'shipping') <> 'number' or (m->>'shipping')::numeric < 0 then
      raise exception 'Invalid shipping fee for %', m->>'country';
    end if;
    if m ? 'free_min' and (jsonb_typeof(m->'free_min') <> 'number' or (m->>'free_min')::numeric < 0) then
      raise exception 'Invalid free shipping amount for %', m->>'country';
    end if;
    if jsonb_typeof(m->'payment_methods') <> 'array' or jsonb_array_length(m->'payment_methods') = 0
       or exists (select 1 from jsonb_array_elements_text(m->'payment_methods') x
                  where x not in ('cod','bank','easypaisa','jazzcash')) then
      raise exception 'Invalid payment methods for %', m->>'country';
    end if;
  end loop;
  return new;
end; $$;
drop trigger if exists stores_check_markets on public.stores;
create trigger stores_check_markets before insert or update of markets, home_country on public.stores
  for each row execute function public._check_store_markets();

-- The market that applies for a country: the home market, or one of the seller's markets.
create or replace function public._market_for(s public.stores, p_country text) returns jsonb
language plpgsql stable as $$
declare m jsonb; c text := upper(nullif(trim(coalesce(p_country, '')), ''));
begin
  if c is null or c = s.home_country then
    return jsonb_build_object('country', s.home_country, 'currency', s.currency, 'rate', 1,
             'shipping', s.shipping_fee, 'free_min', s.free_shipping_min,
             'payment_methods', s.payment_methods, 'home', true);
  end if;
  select el.value into m from jsonb_array_elements(s.markets) el where el.value->>'country' = c limit 1;
  if m is null then raise exception 'This store does not ship to that country'; end if;
  return jsonb_build_object('country', c, 'currency', m->>'currency', 'rate', (m->>'rate')::numeric,
           'shipping', (m->>'shipping')::numeric, 'free_min', coalesce((m->>'free_min')::numeric, 0),
           'payment_methods', m->'payment_methods', 'home', false);
end; $$;

-- =====================================================================
-- 2. Pricing, quote, order, tracking (replace the v5 versions)
-- =====================================================================
drop function if exists public.quote_cart(uuid, jsonb, text);
drop function if exists public.place_order(uuid, text, text, text, text, jsonb, text, text, text);
drop function if exists public.track_order(uuid, integer, text);
drop function if exists public._price_cart(uuid, jsonb, text, boolean);

create or replace function public._price_cart(p_store uuid, p_items jsonb, p_coupon text, p_lock boolean, p_country text default '')
returns table (subtotal integer, discount integer, shipping integer, total integer,
               coupon_id uuid, coupon_msg text, items jsonb,
               m_currency text, m_rate numeric, m_subtotal numeric, m_discount numeric,
               m_shipping numeric, m_total numeric, m_country text, m_pay jsonb)
language plpgsql security definer set search_path = public as $$
declare
  s stores%rowtype; p products%rowtype; c coupons%rowtype; r record; v_var jsonb; mk jsonb;
  v_sub integer := 0; v_items jsonb := '[]'::jsonb;
  v_price integer; v_label text; v_msg text := ''; v_cid uuid;
  rt numeric; dec integer; cur text; unit numeric;
  m_sub numeric := 0; m_disc numeric := 0; m_ship numeric := 0; m_tot numeric; free_min numeric;
begin
  select * into s from stores where id = p_store and published;
  if not found then raise exception 'Store not found'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Your cart is empty';
  end if;
  mk  := public._market_for(s, p_country);
  rt  := (mk->>'rate')::numeric;
  cur := mk->>'currency';
  dec := public._cur_dec(cur);

  for r in
    select (e->>'product_id')::uuid as pid,
           sum(greatest(least(coalesce((e->>'qty')::int, 1), 99), 1)) as qty
    from jsonb_array_elements(p_items) e group by 1
  loop
    if p_lock then
      select * into p from products where id = r.pid and store_id = p_store and is_active for update;
    else
      select * into p from products where id = r.pid and store_id = p_store and is_active;
    end if;
    if not found then raise exception 'A product in your cart is no longer available'; end if;
    if p.stock is not null and p.stock < r.qty then
      if p.stock = 0 then raise exception '% is sold out', p.name;
      else raise exception 'Only % left of %', p.stock, p.name; end if;
    end if;
  end loop;

  for r in
    select (e->>'product_id')::uuid as pid,
           nullif(trim(coalesce(e->>'variant', '')), '') as variant,
           greatest(least(coalesce((e->>'qty')::int, 1), 99), 1) as qty
    from jsonb_array_elements(p_items) e
  loop
    select * into p from products where id = r.pid and store_id = p_store and is_active;
    v_price := p.price; v_label := ''; v_var := null;
    if jsonb_array_length(p.variants) > 0 then
      if r.variant is null then raise exception 'Please choose an option for %', p.name; end if;
      select el.value into v_var from jsonb_array_elements(p.variants) el
        where public._variant_label(el.value) = r.variant limit 1;
      if v_var is null then raise exception 'That option is no longer available for %', p.name; end if;
      v_label := r.variant;
      if coalesce(v_var->>'price', '') ~ '^[0-9]+$' and (v_var->>'price')::int > 0 then
        v_price := (v_var->>'price')::int;
      end if;
    end if;
    unit  := round(v_price * rt, dec);
    v_sub := v_sub + v_price * r.qty;
    m_sub := m_sub + unit * r.qty;
    v_items := v_items || jsonb_build_object('product_id', p.id, 'name', p.name, 'variant', v_label,
                 'price', v_price, 'unit_price', unit, 'qty', r.qty);
  end loop;

  if nullif(trim(coalesce(p_coupon, '')), '') is not null then
    if p_lock then
      select * into c from coupons where store_id = p_store and upper(code) = upper(trim(p_coupon)) for update;
    else
      select * into c from coupons where store_id = p_store and upper(code) = upper(trim(p_coupon));
    end if;
    if not found or not c.active or (c.expires_at is not null and c.expires_at <= now()) then
      v_msg := 'Invalid or expired coupon';
    elsif c.usage_limit > 0 and c.used_count >= c.usage_limit then
      v_msg := 'This coupon has been fully used';
    elsif v_sub < c.min_order then
      v_msg := 'Minimum order for this coupon is Rs. ' || c.min_order;
    else
      if c.discount_type = 'percent' then
        m_disc := trunc(m_sub * least(c.discount_value, 100) / 100.0, dec);
      else
        m_disc := round(c.discount_value * rt, dec);
      end if;
      m_disc := least(m_disc, m_sub); v_cid := c.id; v_msg := 'Coupon applied';
    end if;
  end if;

  free_min := coalesce((mk->>'free_min')::numeric, 0);
  m_ship := case when free_min > 0 and m_sub - m_disc >= free_min then 0 else (mk->>'shipping')::numeric end;
  m_tot := m_sub - m_disc + m_ship;
  return query select v_sub, round(m_disc / rt)::integer, round(m_ship / rt)::integer, round(m_tot / rt)::integer,
                      v_cid, v_msg, v_items, cur, rt, m_sub, m_disc, m_ship, m_tot, mk->>'country', mk->'payment_methods';
end; $$;
revoke all on function public._price_cart(uuid, jsonb, text, boolean, text) from public, anon, authenticated;

create or replace function public.quote_cart(p_store uuid, p_items jsonb, p_coupon text default '', p_country text default '')
returns table (subtotal numeric, discount numeric, shipping numeric, total numeric,
               coupon_msg text, currency text, pay_methods jsonb, country text)
language plpgsql security definer set search_path = public as $$
begin
  return query select q.m_subtotal, q.m_discount, q.m_shipping, q.m_total, q.coupon_msg, q.m_currency, q.m_pay, q.m_country
               from public._price_cart(p_store, p_items, p_coupon, false, p_country) q;
end; $$;
revoke all on function public.quote_cart(uuid, jsonb, text, text) from public;
grant execute on function public.quote_cart(uuid, jsonb, text, text) to anon, authenticated;

create or replace function public.place_order(
  p_store uuid, p_name text, p_phone text, p_city text, p_address text, p_items jsonb,
  p_coupon text default '', p_payment text default 'cod', p_note text default '',
  p_country text default '', p_state text default '', p_postal text default ''
) returns table (o_no integer, o_total integer, o_discount integer, o_shipping integer,
                 o_currency text, o_charged numeric, o_m_discount numeric, o_m_shipping numeric)
language plpgsql security definer set search_path = public as $$
declare
  s stores%rowtype; q record; v_no integer; v_phone text; v_digits text; v_pay text := coalesce(nullif(trim(p_payment), ''), 'cod');
begin
  select * into s from stores where id = p_store and published;
  if not found then raise exception 'Store not found'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 or char_length(trim(coalesce(p_city, ''))) < 2
     or char_length(trim(coalesce(p_address, ''))) < 5 then
    raise exception 'Please fill in all delivery details';
  end if;

  select * into q from public._price_cart(p_store, p_items, p_coupon, true, p_country);
  if nullif(trim(coalesce(p_coupon, '')), '') is not null and q.coupon_id is null then
    raise exception '%', q.coupon_msg;
  end if;
  if not (q.m_pay ? v_pay) then
    raise exception 'This payment method is not offered for delivery to that country';
  end if;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if q.m_country = 'PK' then
    if v_digits !~ '^(92|0)?3[0-9]{9}$' then raise exception 'Enter a valid Pakistani mobile number'; end if;
  else
    if v_digits !~ '^[0-9]{7,15}$' then raise exception 'Enter a valid phone number with country code'; end if;
  end if;
  if q.m_country <> s.home_country and char_length(trim(coalesce(p_postal, ''))) < 3 then
    raise exception 'Please enter your postal code';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_store::text));
  select coalesce(max(o.order_no), 1000) + 1 into v_no from orders o where o.store_id = p_store;
  v_phone := public._norm_phone(p_phone);

  insert into orders (store_id, order_no, customer_name, customer_phone, city, address, items, total,
                      payment_method, discount, shipping, coupon_code, payment_note,
                      currency, fx_rate, charged_total, country, state, postal_code)
  values (p_store, v_no, trim(p_name), trim(p_phone), trim(p_city), trim(p_address), q.items, greatest(q.total, 1),
          v_pay, q.discount, q.shipping,
          case when q.coupon_id is null then '' else upper(trim(p_coupon)) end,
          left(trim(coalesce(p_note, '')), 200),
          q.m_currency, q.m_rate, q.m_total, q.m_country, left(trim(coalesce(p_state, '')), 80), left(trim(coalesce(p_postal, '')), 20));

  update products pr set stock = pr.stock - t.qty
  from (select (e->>'product_id')::uuid as pid, sum((e->>'qty')::int) as qty
        from jsonb_array_elements(q.items) e group by 1) t
  where pr.id = t.pid and pr.stock is not null;

  if q.coupon_id is not null then
    update coupons set used_count = used_count + 1 where id = q.coupon_id;
  end if;

  insert into customers (store_id, phone, name, city, address, order_count, total_spent, updated_at)
  values (p_store, v_phone, trim(p_name), trim(p_city), trim(p_address), 1, greatest(q.total, 0), now())
  on conflict (store_id, phone) do update
    set name = excluded.name, city = excluded.city, address = excluded.address,
        order_count = customers.order_count + 1,
        total_spent = customers.total_spent + excluded.total_spent, updated_at = now();

  return query select v_no, q.total, q.discount, q.shipping, q.m_currency, q.m_total, q.m_discount, q.m_shipping;
end; $$;
revoke all on function public.place_order(uuid, text, text, text, text, jsonb, text, text, text, text, text, text) from public;
grant execute on function public.place_order(uuid, text, text, text, text, jsonb, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.track_order(p_store uuid, p_order_no integer, p_phone text)
returns table (order_no integer, status text, total integer, customer_name text, city text, created_at timestamptz,
               currency text, charged_total numeric, country text)
language sql security definer set search_path = public as $$
  select o.order_no, o.status, o.total, o.customer_name, o.city, o.created_at, o.currency, o.charged_total, o.country
  from orders o
  where o.store_id = p_store and o.order_no = p_order_no
    and public._norm_phone(o.customer_phone) = public._norm_phone(p_phone)
  limit 1;
$$;
revoke all on function public.track_order(uuid, integer, text) from public;
grant execute on function public.track_order(uuid, integer, text) to anon, authenticated;
