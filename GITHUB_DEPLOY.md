# EasyBuy — GitHub Pages deployment

1. Upload ALL files in this folder to the ROOT of the `easybuy` GitHub repository.
2. Make sure `index.html` is directly in the repository root (not inside another folder).
3. Before using seller/database features, open `config.js` and replace the two placeholders with your Supabase Project URL and `anon public` key.
4. Never put the Supabase `service_role`/secret key in this repository.
5. In GitHub: Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save.
6. Open: `https://muhammad-numan-asif.github.io/easybuy/`

SQL files included:
- `schema.sql`
- `schema_v4.sql`
- `schema_stage4.sql`
- `schema_stage5.sql`

Run the appropriate schema in Supabase SQL Editor before expecting database features to work.
