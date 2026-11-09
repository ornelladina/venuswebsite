import { soldOutLast } from '@/lib/soldOut';
import { supabase } from '@/lib/supabaseClient';
import { Product, Collection } from '@/types';
import ProductCard from '@/components/ProductCard';
import CollectionCard from '@/components/CollectionCard';
import { withPriceRanges } from '@/lib/collectionPriceRange';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { STYLES } from '@/lib/styles';
import StyleSwipeNav from '@/components/StyleSwipeNav';

export const revalidate = 60;

// The fixed set of sections every style page can show, in this exact
// order. A category section only renders if that style actually has a
// product in it — nothing to toggle by hand; add/remove products (or tag
// a collection with a style) in Supabase and the sections follow
// automatically. "Shop The Look" pulls from the collections table (the
// same one that powers the homepage strip and /shop-the-look) instead of
// a category, since a "look" is several pieces styled together.
const CATEGORY_SLUGS = ['necklaces', 'bracelets', 'rings', 'sets'] as const;
const CATEGORY_SLUGS_AFTER_LOOK = ['earrings', 'anklets'] as const;

async function getProductsByStyleAndCategory(styleValue: string, categorySlug: string): Promise<Product[]> {
  const { data: category } = await supabase.from('categories').select('id, name').eq('slug', categorySlug).single();
  if (!category) return [];

  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .eq('style', styleValue)
    .eq('category_id', category.id)
    .order('display_order', { ascending: true })
    // Tie-breaker for products sharing the same display_order (every new
    // product defaults to 0 unless manually reordered) — newest first.
    .order('created_at', { ascending: false });
  return soldOutLast(data ?? []);
}

async function getCategoryName(categorySlug: string): Promise<string> {
  const { data } = await supabase.from('categories').select('name').eq('slug', categorySlug).single();
  return data?.name ?? categorySlug;
}

async function getCollectionsByStyle(styleValue: string): Promise<Collection[]> {
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .eq('style', styleValue)
    .order('display_order', { ascending: true });
  return withPriceRanges(data ?? []);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const style = STYLES.find((s) => s.slug === params.slug);
  if (!style) return {};

  return {
    title: `${style.tabLabel} Jewelry`,
    description: style.description,
    alternates: { canonical: `/style/${style.slug}` },
  };
}

export default async function StylePage({ params }: { params: { slug: string } }) {
  const style = STYLES.find((s) => s.slug === params.slug);
  if (!style) notFound();

  const [beforeLook, collections, afterLook] = await Promise.all([
    Promise.all(CATEGORY_SLUGS.map((slug) => getProductsByStyleAndCategory(style.value, slug))),
    getCollectionsByStyle(style.value),
    Promise.all(CATEGORY_SLUGS_AFTER_LOOK.map((slug) => getProductsByStyleAndCategory(style.value, slug))),
  ]);
  const beforeLookNames = await Promise.all(CATEGORY_SLUGS.map((slug) => getCategoryName(slug)));
  const afterLookNames = await Promise.all(CATEGORY_SLUGS_AFTER_LOOK.map((slug) => getCategoryName(slug)));

  const categorySections = [
    ...CATEGORY_SLUGS.map((slug, i) => ({ slug, name: beforeLookNames[i], products: beforeLook[i] })),
  ];
  const categorySectionsAfterLook = [
    ...CATEGORY_SLUGS_AFTER_LOOK.map((slug, i) => ({ slug, name: afterLookNames[i], products: afterLook[i] })),
  ];

  const hasAnything =
    categorySections.some((s) => s.products.length > 0) ||
    collections.length > 0 ||
    categorySectionsAfterLook.some((s) => s.products.length > 0);

  return (
    <StyleSwipeNav slugs={STYLES.map((s) => s.slug)} currentSlug={style.slug}>
    <div data-page="style">
      {/* Tabs: pressable text links for each style, sitting right under
          the header. Current style is marked data-active for styling. */}
      <nav className="style-tabs" aria-label="Shop by style">
        {STYLES.map((s) => (
          <Link key={s.slug} href={`/style/${s.slug}`} data-active={s.slug === style.slug}>
            {s.tabLabel}
          </Link>
        ))}
      </nav>

      <h1 className="section-heading-eb center" style={{ marginTop: 40 }}>
        {style.tabLabel}
      </h1>

      <p className="style-description">{style.description}</p>

      {!hasAnything && (
        <p style={{ textAlign: 'center', marginTop: 24, marginBottom: 64 }}>
          No {style.tabLabel.toLowerCase()} pieces yet — check back soon!
        </p>
      )}

      {categorySections.map(
        (section) =>
          section.products.length > 0 && (
            <section key={section.slug} className="home-section">
              <h2 className="section-heading-eb center">{section.name}</h2>
              <div data-grid="products" style={{ marginTop: 40 }}>
                {section.products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )
      )}

      {collections.length > 0 && (
        <section className="shop-the-look-section">
          <h2 className="section-heading-eb center">Shop The Look</h2>
          <div className="shop-the-look-grid" style={{ marginTop: 40 }}>
            {collections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        </section>
      )}

      {categorySectionsAfterLook.map(
        (section) =>
          section.products.length > 0 && (
            <section key={section.slug} className="home-section">
              <h2 className="section-heading-eb center">{section.name}</h2>
              <div data-grid="products" style={{ marginTop: 40 }}>
                {section.products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )
      )}
    </div>
    </StyleSwipeNav>
  );
}
