# EasyBuy update: international selling

Files:
- `schema_v6_all.sql`  Supabase par Run karni hai (GitHub par upload nahi)
- `index.html`         GitHub par upload karni hai (purani index.html replace hogi)
- `config.js`          Haath mat lagana, us mein aap ki keys hain

## Order (zaroori)

1. Supabase, SQL Editor, New query. `schema_v6_all.sql` ka poora text paste karo, Run.
   Ye ek hi file sab kuch karti hai (pehle wale fixes + international). Pehle kuch chalaya ho ya na chalaya ho, dono surat mein theek hai.
   schema_v4.sql aur schema_stage4.sql kabhi Run mat karna.
2. GitHub, repo easybuy, Add file, Upload files, `index.html` drag karo, Commit changes.
3. 1 minute baad site kholo, hard refresh karo.

## International kaise use karein

Dashboard, Analytics & tools, "International selling (Markets)":
1. Home country aur store currency check karo (default Pakistan, PKR).
2. "Add a market": country chuno (jaise UAE), currency (AED), aaj ka rate ("1 AED = kitne PKR"),
   shipping fee AED mein, aur payment method (bank transfer waghera).
3. Store kholo: upar country selector aa jata hai. Customer country chunta hai to prices, shipping aur total us currency mein dikhte hain.

Rate aap khud dalte ho, wo apne aap update nahi hota. Jab rate badle to market hata kar dobara add karo.

## Quick test (5 minute)

1. Ek market add karo (UAE, AED, rate, shipping 30, bank transfer).
2. Store mein country UAE karo, product cart mein daalo. Totals AED mein dikhne chahiye.
3. Postal code aur "+971..." phone ke saath order do. Dashboard, Orders mein order AED mein dikhega (PKR barabar ke saath).
4. Pakistan wapas chuno aur COD order do, pehle jaisa chalna chahiye.
