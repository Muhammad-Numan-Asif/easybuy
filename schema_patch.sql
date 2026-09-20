-- Run this ONLY if you already ran the old schema.sql.
-- Hidden products (is_active = false) were still readable through the public API.
-- After this patch, only the store owner can see hidden products.
drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (is_active);
