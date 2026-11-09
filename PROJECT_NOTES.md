# Project notes (read this first if you are a new chat picking this up)

THIS IS THE VENUS BIJOUX COPY of the Turquoise site (made from Turquoise v26).
It is a separate business with its own GitHub repo, Vercel project and Supabase
project. Never point it at Turquoise's Supabase or reuse Turquoise's keys.

Owner: Ornella. She does not code. She needs the FULL project returned as ONE
zip every time, ready to upload to GitHub (deployed on Vercel, database on
Supabase). Stack: Next.js / TypeScript, Supabase, custom CSS in app/globals.css.

## What is different from Turquoise

- Brand name shown to customers: "Venus Bijoux". Instagram @venusbijoux.lb.
- Colors: the old turquoise/teal accents and buttons are now #37152F (deep
  plum, same transparency as before). Hover = #6B3A5C, darkest = #240D1F. The
  old dark-brown text is also #37152F. The old mid beige (#A6917C) is #D8AF8A
  and the old light beige borders/backgrounds are #E8CBB7. Very light creams
  (#FBF4EE etc.) were kept. The CSS variable is still called --tq-turquoise
  (internal name only; it now holds the plum).
- Logo = emblem + divider + "VENUS" over "BIJOUX" (Cormorant Garamond), built
  in components/Header.tsx and the "Logo lockup" block at the END of
  globals.css. Emblem files: public/venus-emblem.png and
  public/venus-emblem-beige.png (beige shows over the home hero). They are in
  the code, not in Supabase. Icons in public/icons and app/icon.png are made
  from the emblem.
- Site address comes from the SITE_DOMAIN setting in Vercel (next.config.js ->
  lib/siteUrl.ts). Google Analytics ID comes from NEXT_PUBLIC_GA_ID (nothing
  loads while empty). Search Console code: GOOGLE_SITE_VERIFICATION.
- Images that used to be fetched from TURQUOISE's Supabase now come from this
  site's own site-assets bucket (lib/assets.ts + CSS variables set in
  app/layout.tsx). Files that must be uploaded to site-assets for the homepage
  decoration to appear: heroimg.png, banner-bckgd-pattern.png, banner-img.png,
  banner-line.png, bestseller-patternbckgd.png, hamsa-icon-design.png,
  stainlesssteelcoverimg.webp, vintagecoverimg.webp, goldplatedcoverimg.webp.
  Category covers are uploaded in Admin > Homepage Sections > Cover Images.
  Until the hero photos are uploaded there, the hero shows a plain beige
  placeholder (public/hero-water*.webp).
- The add-to-cart icon is now an inline SVG (it used to be a file in
  Turquoise's storage).
- Order numbers start with VB- (VB-1001...), not WL-.
- Database: ONE file, supabase/setup.sql, builds everything on a fresh project
  (it also adds products.is_best_seller, which Turquoise had created by hand and
  was missing from its migration files). supabase/setup_order_alerts.sql is run
  separately after the first deploy (needs the site address and WEBHOOK_SECRET).
  The ~37 old Turquoise SQL files are in supabase/old_turquoise_files/ for
  reference only. Future database changes: add a new migration file in supabase/.
- Footer and About page still show the phone/WhatsApp number +961 81 191 446
  (Footer.tsx, About page) and the About text still says "established in 2018" and
  "made in Turkey" - copied from Turquoise as asked; confirm for Venus.
- Vercel settings used: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS, ADMIN_VIEW_KEY, WEBHOOK_SECRET,
  SITE_DOMAIN, NOTIFY_EMAIL_TO, RESEND_API_KEY, CALLMEBOT_PHONE,
  CALLMEBOT_APIKEY, NEXT_PUBLIC_GA_ID, GOOGLE_SITE_VERIFICATION.

## Everything below is the history of the Turquoise project it was copied from

## Changes in v22 (latest)

- Featured Items banner is taller (220px phone -> 420px wide desktop). Change
  the clamp() numbers on .featured-banner in globals.css to adjust.
- Style Correctly "View All Types" button text is the same teal as the title.
- Admin shortcut: signed-in ADMIN_EMAILS see an "Admin Dashboard" button on the
  Account page and an ADMIN link in the desktop header (app/api/is-admin,
  lib/useIsAdmin.ts). Everyone else sees nothing; the dashboard stays locked
  by middleware regardless.
- Product form: category, material/type and price are required; a "has
  variations" box decides whether Stock is required (no variations) or each
  variation's own Stock is required (0 or more). Enforced in the browser and
  on the server (products/actions.ts).
- Shop The Look items can ALREADY be added to Best Sellers, Featured Items
  and Hamsa & Eye: Admin > Homepage Sections > the "+ Add" row under each
  section lists Collections (Shop The Look) next to Products.

## Changes in v21

- Homepage: optional full-width banner above the Featured Items cards, lined up
  with the cards on both sides. Edit it at Admin > Homepage Sections > Cover
  Images > "Featured Items Banner" (replace photo, drag to move, Ctrl/Cmd +
  scroll or pinch to zoom, Remove). Needs supabase/migration_featured_banner.sql
  run ONCE in the Supabase SQL Editor. Height: .featured-banner in globals.css.

## Changes in v20

- Admin > Products: every row now has a stock box next to Edit/Copy Link/View/
  Delete. Type a number, press Enter or click Save (only stock changes).
  Products with options (colors/sizes/letters) get a "Stock: total" dropdown
  with one box per option. Out-of-stock products show a red badge.
  Files: app/admin/dashboard/products/StockEditor.tsx (uses restockProduct /
  restockVariation in actions.ts).

## Changes in v19

- Sold out products now sort to the END of every product list (home sections,
  category, style, collection, new, sale, classical, shop, best sellers, hamsa
  & eye). Your display order is kept otherwise. Logic: lib/soldOut.ts.
  Search results keep their relevance order; Favorites keep your own order.
- Mobile header: all icons share one size/gap (end of globals.css) so the
  3 right icons fit and leave room around the logo.
- Google button on /account is hidden by default. Show it again by adding
  NEXT_PUBLIC_SHOW_GOOGLE_LOGIN = true in Vercel and redeploying.

## Changes in v17

- Account page: "Continue with Google" button (app/account/page.tsx). Needs the
  Google provider turned on in Supabase (Authentication > Sign In / Providers).
  Google Search Console verification tag added in app/layout.tsx (do not remove).
  /privacy page added (Google requires a privacy policy URL to publish the app) and
  linked in the footer. Email sign up also needs "Allow new users to sign up" ON in Supabase.

## Changes in v16

- Search (app/search/page.tsx, lib/searchText.ts): any word typed can match a
  product's name, category, SKU or description. Whole words only ("ring" does
  not match "earring"), plurals ignored, start of a word works ("zirc").
  Results are ranked (name > category > SKU > description).
- You May Also Like (lib/related.ts): first pieces from the same Shop The Look,
  then pieces sharing distinctive words (zircon, eye, ...) / style / tags across
  categories, then same-category fallback. Shows up to 8.
- Homepage: wave divider under the hero removed (spacing restored).
- Admin dashboard orders: separate "New / Pending" and "Completed" sections;
  each card shows "Placed" and (for completed) "Confirmed" times in Beirut time.
  Uses orders.completed_at (button still works if the migration isn't run yet).
- Ordering (lib/ordering.ts): Shop The Look page and category pages show newest
  first; a display_order above 0 pins an item to the front. On category pages
  Shop The Look cards and regular products are mixed together by date.
- Optional customer accounts: /account (sign in / create account / My Orders),
  Account link in the header, orders placed while signed in are saved to the
  account (orders.user_id). Checkout still works as a guest. lib/customerClient.ts.
- SECURITY: customers and the admin share Supabase Auth, so middleware.ts now only
  lets the emails in the ADMIN_EMAILS Vercel setting (comma-separated) into
  /admin/dashboard. If ADMIN_EMAILS is missing, nobody can enter the dashboard.
- SQL to run once: supabase/migration_accounts_and_order_dates.sql (it includes
  everything from migration_free_delivery.sql, so that one doesn't need re-running).
- Supabase setting to change by hand: Authentication > Providers > Email >
  turn OFF "Confirm email" (otherwise new customers must confirm by email, which
  Supabase's free email sender delivers unreliably).
- Not built: "forgot password" for customer accounts. Passwords can be reset by
  hand in Supabase > Authentication > Users.

## Changes in v13 - v15

### Delivery pricing (lib/delivery.ts)
- $4 Beirut, $5 elsewhere, FREE from $75 of items (FREE_DELIVERY_THRESHOLD).
- The comparison uses the whole-dollar subtotal, like the site displays it.
- The real fee is ALSO calculated inside the database function place_order
  (supabase/migration_free_delivery.sql). The browser's fee is ignored.
  If the threshold changes, change it in BOTH lib/delivery.ts and that SQL
  (the `>= 75` line), then re-run the SQL in Supabase.
- Item prices/line totals are still taken from the browser (not re-checked
  against the products table). Known gap, not fixed yet.
- Free delivery is advertised in: components/AnnouncementBar.tsx (header bar,
  4 rotating messages), a strip on the homepage (app/page.tsx, between Shop The
  Look and Style Correctly, `.free-delivery-strip`), cart, checkout, /shipping.

### Order confirmation to the customer
- Admin dashboard order cards have a "Message customer" WhatsApp button
  (app/admin/dashboard/OrderActions.tsx). It opens wa.me with a ready message
  built in lib/orderMessages.ts (edit the wording there).
- Branded confirmation EMAIL (lib/orderEmail.ts, sent from markOrderCompleted in
  app/admin/dashboard/actions.ts) exists but is currently dormant: the email
  field was REMOVED from checkout because there is no verified domain in Resend.
  To bring it back: buy a domain, verify it in Resend, set RESEND_FROM_EMAIL in
  Vercel, and re-add an optional email input in app/checkout/page.tsx that sends
  p_email to place_order. The database already accepts p_email.

## SQL to run in Supabase (SQL Editor), in the project's supabase/ folder
- migration_accounts_and_order_dates.sql - the newest one (v16); includes free delivery. Safe to re-run.
- migration_free_delivery.sql  - previous version of the same function. Safe to re-run. It
  also adds the optional orders.email / orders.customer_notified_at columns and
  replaces place_order() with the version that works out the delivery fee.
- migration_customer_email.sql - earlier version of the same function (email
  only, no free delivery). Superseded by migration_free_delivery.sql.
All other files in supabase/ are older migrations from earlier versions.

## Environment variables used by orders (Vercel)
ADMIN_EMAILS (required since v16: your admin login email), RESEND_API_KEY, NOTIFY_EMAIL_TO,
RESEND_FROM_EMAIL (only for customer email),
plus the existing Supabase and CallMeBot settings.

## Cart + favorites follow the signed-in customer (v26)
- Signed-in customers: cart and favorites are saved to their account and appear on any device they sign in on.
  Guests are unchanged (browser only).
- First time a device meets an account, the browser's list and the account's list are merged; after that the
  account's list wins (removing an item on one device removes it everywhere). Refreshes when the tab is reopened.
- Signing out clears cart and favorites from that browser (shared-device privacy).
- Code: lib/useAccountSync.ts, used by components/CartContext.tsx and components/FavoritesContext.tsx.
- SQL to run ONCE in Supabase: supabase/migration_saved_cart_favorites.sql (creates table customer_saved).
  Until it is run, everything keeps working exactly as before (browser only).
- lib/featureFlags.ts: SHOW_ACCOUNT (true = Account icon + checkout sign-in line shown).
