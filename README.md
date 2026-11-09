# Venus Bijoux website

Next.js + Supabase + Vercel. Cash on delivery, Lebanon.

## Setting up from zero (order matters)

1. GitHub: new repository; upload the contents of the site folder.
2. Supabase: new project. Storage: public buckets site-assets and
   product-images. Authentication > Email: turn OFF "Confirm email", keep
   sign-ups ON.
3. Vercel: new project linked to the repo. Settings > Environment Variables:
   see "Vercel settings used" in PROJECT_NOTES.md.
4. Supabase > SQL Editor: paste and run supabase/setup.sql ONCE.
5. Deploy (Vercel does it when the code is uploaded).
6. Supabase > SQL Editor: open supabase/setup_order_alerts.sql, replace
   YOUR-DOMAIN-HERE and YOUR-WEBHOOK-SECRET-HERE, run it.
7. Supabase > Authentication > Users > Add user, using the ADMIN_EMAILS email.
   Then log in at /admin/login.
8. Upload the homepage decoration images to site-assets (list in
   PROJECT_NOTES.md) and the hero photos in Admin > Homepage Sections.
9. Test: add a product, place a test order, check the alert, delete the test.
