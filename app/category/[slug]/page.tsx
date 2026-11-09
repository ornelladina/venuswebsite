import { soldOutLastGrid } from '@/lib/soldOut';
import { supabase } from '@/lib/supabaseClient';
import { Product, Collection } from '@/types';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { STYLES } from '@/lib/styles';
import { withPriceRanges } from '@/lib/collectionPriceRange';
import CategoryStyleTabs from '@/components/CategoryStyleTabs';
import { compareNewestUnlessPinned } from '@/lib/ordering';

export const revalidate = 60;

async function getCategory(slug: string) {
  const { data } = await supabase.from('categories').select('*').eq('slug', slug).single();
  return data;
}

// All active products in this category, style included, so we can group
// them into one section per style without extra round trips.
async function getProducts(categoryId: string): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    // Tie-breaker for products sharing the same display_order (every new
    // product defaults to 0 unless manually reordered) — newest first
    // among the ties, rather than an unpredictable order.
    .order('created_at', { ascending: false });
  return data ?? [];
}

// Any "Shop The Look" collection tagged with this category (see
// supabase/migration_collection_category.sql) — its card slots in among
// this category's products, inside the matching style section, alongside
// its usual spot on /shop-the-look. A collection also needs a style set
// to land in one of the sections below; category alone isn't enough.
async function getCollections(categoryId: string): Promise<Collection[]> {
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  return withPriceRanges(data ?? []);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategory(params.slug);
  if (!category) return {};

  const title = `${category.name} in Lebanon`;
  const description = `Shop ${category.name.toLowerCase()} in Lebanon — trendy, hypoallergenic, gold-plated jewelry with cash on delivery.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/category/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategory(params.slug);
  if (!category) notFound();

  const [products, collections] = await Promise.all([
    getProducts(category.id),
    getCollections(category.id),
  ]);

  // One section per style (Gold-Plated, Stainless Steel, Vintage
  // Accessories), each showing only this category's products for
  // that style — same style groupings as the "All Products" (/style/[slug])
  // page, just scoped to this one category instead of scoped to one style
  // across every category. A style section only renders if it actually has
  // a matching product or collection; nothing to toggle by hand — tag a
  // product's (or collection's) style in Supabase and it slots into the
  // right section automatically.
  //
  // NOTE: a product only shows up here once it has a `style` value set in
  // Supabase (Table Editor → products → style column). Untagged products
  // won't appear on this page until they're tagged. Same goes for
  // collections tagged with this category (see getCollections above) —
  // they also need a style set to land in a section here.
  //
  // Products and any matching collection cards are merged into one list
  // per section, ordered by their shared display_order — set a
  // collection's display_order in Table Editor to place its card earlier
  // or later among the products around it.
  const styleSections = STYLES.map((s) => {
    const sortedItems = [
      ...products
        .filter((p) => p.style === s.value)
        .map((product) => ({ type: 'product' as const, display_order: product.display_order, product })),
      ...collections
        .filter((c) => c.style === s.value)
        .map((collection) => ({
          type: 'collection' as const,
          display_order: collection.display_order,
          collection,
        })),
    ].sort((a, b) =>
      // Products and Shop The Look cards are mixed together, newest added
      // first. A display order you typed (1, 2, 3...) pins that item to the
      // front instead. Before, equal display orders left every collection
      // card stuck below all the products. See lib/ordering.ts.
      compareNewestUnlessPinned(
        {
          display_order: a.display_order,
          created_at: a.type === 'product' ? a.product.created_at : a.collection.created_at,
        },
        {
          display_order: b.display_order,
          created_at: b.type === 'product' ? b.product.created_at : b.collection.created_at,
        }
      )
    );
    const items = soldOutLastGrid(sortedItems);

    return { ...s, items };
  }).filter((s) => s.items.length > 0);

  const hasAnything = styleSections.length > 0;

  return (
    <div data-page="category">
      <h1 className="section-heading-eb">{category.name}</h1>

      {/* Same tab row shown at the top of the "All Products" page, so the
          styling is visually consistent — but here pressing a tab swaps the
          grid below in place (no navigation, no scrolling to a different
          part of the page). Handled client-side in CategoryStyleTabs. */}
      {!hasAnything ? (
        <p>No products in this category yet.</p>
      ) : (
        <CategoryStyleTabs sections={styleSections} />
      )}
    </div>
  );
}
