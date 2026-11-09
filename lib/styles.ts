// Shared "style" (material) config, used by the header dropdown, the
// /style/[slug] page, and the /category/[slug] page (which now shows a
// section per style, filtered to that category).
//
// IMPORTANT: `value` must stay an exact match for whatever is stored in
// the products.style / collections.style column in Supabase (set via the
// dropdown in Table Editor — see supabase/migration_style.sql). That
// stored value is "Gold Plated" (no hyphen), so `value` is left as-is.
// `tabLabel` is just the on-screen text and can be changed freely without
// touching stored data — it's now "Gold-Plated" with a hyphen everywhere
// it's displayed.
export const STYLES: { slug: string; value: string; tabLabel: string; description: string }[] = [
  {
    slug: 'gold-plated',
    value: 'Gold Plated',
    tabLabel: 'Gold-Plated',
    description:
      'Gold-plated brass pieces made in Turkey, chosen for how well the plating holds up over time. ' +
      'The color is built to last through daily wear, and every piece is waterproof and hypoallergenic — ' +
      'safe for sensitive skin and unaffected by water or humidity.',
  },
  {
    slug: 'stainless-steel',
    value: 'Stainless Steel',
    tabLabel: 'Stainless Steel',
    description:
      'Stainless steel jewelry built for everyday wear without the upkeep — tarnish-free, waterproof, and ' +
      'unaffected by perfume or sweat. The color stays exactly as it was on day one, no matter how often ' +
      "it's worn.",
  },
  {
    slug: 'vintage',
    value: 'Vintage',
    tabLabel: 'Vintage Accessories',
    description:
      'A curated edit of vintage-inspired accessories, chosen for design as much as quality — pieces that ' +
      "bring an older sensibility into looks that feel current, without cutting corners on how they're made.",
  },
  {
    slug: 'silver-plated',
    value: 'Silver-Plated',
    tabLabel: 'Silver-Plated',
    description:
      'Silver-plated, Pandora-style charm bracelets built to mix and match — add, swap, or stack charms over ' +
      'time. Made to the same high-quality standard as the rest of the collection: waterproof, hypoallergenic, ' +
      'and finished to hold up to everyday wear.',
  },
];

// Formats a raw products.style / collections.style value (as stored in
// Supabase, e.g. "Gold Plated") for on-screen display (e.g. "Gold-Plated"),
// without touching the stored value itself.
export function formatStyleLabel(style: string): string {
  return style.replace(/Gold Plated/gi, 'Gold-Plated');
}
