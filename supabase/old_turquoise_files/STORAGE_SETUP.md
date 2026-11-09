# One-time setup: product photo storage

The new admin **Products** section (`/admin/dashboard/products`) lets you
upload photos straight from the browser instead of doing it manually in
Supabase. For that to work, it needs one Storage bucket to upload into —
this can't be done via SQL migration (Storage buckets are created in the
Supabase dashboard UI, not the database), so it's a one-time manual step.

## Steps

1. In your Supabase project, go to **Storage** in the left sidebar.
2. Click **New bucket**.
3. Name it exactly: `product-images`
4. Toggle **Public bucket** to ON (so the photos are visible on your live
   site — this matches how `site-assets`, the bucket your logo/homepage
   images already live in, is set up).
5. Click **Create bucket**. That's it — no further configuration needed.

## Why this is safe

The admin Products pages upload through a Server Action that runs only on
the server, using your Supabase **service role** key (the same key
`app/admin/dashboard/page.tsx` already uses to read orders). That key
bypasses Storage's access rules entirely, so the bucket itself doesn't
need any special upload policy — it only needs to be public so the
uploaded photos can be *displayed* on the storefront afterward, exactly
like `site-assets` already is.

## Already have a differently-named bucket for product photos?

If your existing product photos already live in a different bucket (for
example, if you were uploading manually to `site-assets` before), you
have two options:

- **Easiest:** just create `product-images` as described above for new
  uploads going forward. Existing photos keep working wherever they
  already are — you don't need to move them.
- **Or:** open `app/admin/dashboard/products/actions.ts` and change the
  line `const PRODUCT_IMAGES_BUCKET = 'product-images';` near the top to
  your existing bucket's name instead.
