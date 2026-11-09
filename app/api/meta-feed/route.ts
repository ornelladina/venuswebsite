import { createClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

// A product feed for Meta Commerce Manager (and Google Merchant Center,
// which uses the same RSS + <g:...> tag format) — add this URL as a
// "Scheduled fetch" feed in Commerce Manager:
//   https://<your-domain>/api/meta-feed
// Meta re-fetches it on its own schedule (daily by default), so new
// products, price changes, and sold-out items stay in sync automatically
// with no manual re-upload.
//
// Only products with is_active = true are included. Each product's PAGE
// (not this feed) is what customers actually land on when they tap an ad
// or shop tag — see /product/[slug].
//
// This lists one entry per PRODUCT, using its base price (or sale_price,
// if set) — not one entry per color/size variation. That's the standard
// simple setup and is fine for Meta/Instagram Shopping. If individual
// variations ever need their own separate listings, that's a bigger
// follow-up change, not something to try to hand-edit into this file.
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, description, price, sale_price, stock_quantity, is_active, categories(name), product_images(image_url, display_order)')
    .eq('is_active', true)
    .order('display_order', { foreignTable: 'product_images', ascending: true });

  const items = (products ?? [])
    .map((p: any) => {
      const image = p.product_images?.[0]?.image_url;
      // Meta requires at least a title, price, and image per listing —
      // skip anything missing a photo rather than submit a broken row
      // that Meta would just reject anyway.
      if (!image) return null;

      const link = `${SITE_URL}/product/${p.slug}`;
      const basePrice = Number(p.price).toFixed(2);
      const hasSale = p.sale_price != null && Number(p.sale_price) < Number(p.price);
      const availability = p.stock_quantity > 0 ? 'in stock' : 'out of stock';
      // Strip HTML/newlines from the description — it's stored as plain
      // text today, but this keeps the feed valid even if that changes.
      const description = (p.description || p.name).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

      return `
    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <title>${escapeXml(p.name)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${basePrice} USD</g:price>
      ${hasSale ? `<g:sale_price>${Number(p.sale_price).toFixed(2)} USD</g:sale_price>` : ''}
      <g:brand>Venus Bijoux</g:brand>
      ${p.categories?.name ? `<g:product_type>${escapeXml(p.categories.name)}</g:product_type>` : ''}
      <g:identifier_exists>false</g:identifier_exists>
    </item>`;
    })
    .filter(Boolean)
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Venus Bijoux Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Product feed for Meta/Instagram Shopping</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Meta re-fetches on its own schedule — no need for visitors'
      // browsers or the PWA service worker to cache this in between.
      'Cache-Control': 'no-store',
    },
  });
}

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
