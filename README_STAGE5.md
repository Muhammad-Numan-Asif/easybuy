# EasyBuy Stage 5 — Shopify-style merchant workspace

Stage 5 turns the Stage 4 prototype into a much more complete Shopify-style merchant experience while keeping EasyBuy Pakistan-first.

## Added
- Shopify-style merchant shell with sidebar navigation
- Home overview, orders, products, customers, analytics, discounts, reviews
- Marketing workspace and tracking-ID fields
- Online Store theme editor + live preview
- Theme presets, brand colour, headline and homepage description controls
- Custom-domain request UI (DNS/hosting is still required for a real domain)
- Finance: COD, bank transfer, Easypaisa and JazzCash settings
- Shipping fee + free-shipping threshold
- Apps/integrations hub for WhatsApp, analytics, pixels, courier and payment providers
- Platform admin area
- Inventory/low-stock visibility
- Coupon creation and deletion
- Review moderation
- Customer search
- Mobile merchant navigation
- Stage 5 SQL migration with safer non-recursive admin checks
- Store policies/social/navigation/SEO fields
- Store-domain table
- Customer-address and wishlist foundations
- Discount usage audit trail
- Abandoned-cart foundation
- Atomic order placement with row locks, normalized Pakistani phone numbers and discount usage logging

## Supabase setup
Run the migrations in order after your original schema:
1. `schema.sql`
2. `schema_v4.sql` (or the existing Stage 4 migration you use)
3. `schema_stage5.sql`

Then configure `config.js` with the Supabase project URL and anon key.

## Still requires provider credentials / infrastructure
A real payment gateway, courier API, WhatsApp/SMS provider, Meta/TikTok tracking and custom domains require credentials/API contracts and hosting/DNS configuration. The UI does not pretend these integrations are live without those credentials.
