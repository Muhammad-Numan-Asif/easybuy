# EasyBuy — Pakistan Shopify-style Stage 4

This build upgrades the Stage 3 prototype into a broader Pakistan-focused store builder.

## Included
- Seller authentication and multi-store dashboard
- Public storefronts with search, categories, product detail modal and COD checkout
- Product image uploads
- Product variants (stored as structured JSON)
- SKU and stock/inventory management
- Low-stock visibility in the seller tools
- Orders + status workflow
- Customer records and spend/order counts
- Coupon creation and server-side coupon validation
- Store analytics: revenue, orders, average order, city sales and order pipeline
- Store commerce settings: shipping fee, free-shipping threshold and payment-method configuration
- Bank/Easypaisa/JazzCash detail fields for manual payment workflows
- Customer order tracking page using store slug + order number + phone verification
- Review moderation UI
- Platform admin UI for users/stores/products/order value
- Store publish/unpublish control for admins
- Mobile-responsive seller and customer interfaces

## Database setup
1. Create a Supabase project.
2. Run the original `schema.sql` once in Supabase SQL Editor.
3. Run `schema_v4.sql` after it. This migration adds the Stage 4 tables, columns, policies and RPCs.
4. Copy `config.example.js` to `config.js` and put your Supabase URL and anon key in it.
5. Serve the folder from a web server (for example GitHub Pages, Netlify, Vercel or any static host). Opening `index.html` directly can cause browser restrictions.

## Admin
The first registered user is a normal seller. To make a platform operator an admin, run this in Supabase after that user exists:

```sql
update public.profiles set role='admin' where id='YOUR_AUTH_USER_UUID';
```

Only admins get the Platform Admin area.

## Payment and courier note
The interface is prepared for COD, bank transfer, Easypaisa and JazzCash, but a real payment gateway or courier API still needs that provider's merchant credentials/API contract. The build does not invent or fake live payment/courier connectivity.

## Custom domains
The store layer is prepared around unique slugs (`#/s/store-slug`). A production custom-domain system needs hosting/DNS routing in front of this static app. The UI can later be wired to a domain-mapping service without changing the commerce data model.
