import { soldOutLastGrid } from '@/lib/soldOut';
import { supabase } from '@/lib/supabaseClient';
import { Product, Collection, GridItem } from '@/types';
import ProductCard from '@/components/ProductCard';
import CollectionCard from '@/components/CollectionCard';
import { withPriceRanges } from '@/lib/collectionPriceRange';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Hamsa & Eye Collection',
  alternates: { canonical: '/hamsa-eye' },
};

// Every product with is_hamsa_eye = true (and is_active = true) shows up
// here, no limit — this is the full collection. The homepage only shows a
// hand-picked 6 of these (see is_hamsa_eye_home in
// supabase/migration_hamsa_eye_home.sql); this page is where the rest of
// them live.
async function getHamsaEyeProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .eq('is_hamsa_eye', true)
    .order('display_order', { ascending: true })
    // Tie-breaker for products sharing the same display_order (every new
    // product defaults to 0 unless manually reordered) — newest first.
    .order('created_at', { ascending: false });
  return data ?? [];
}

// Collection-side counterpart, same is_hamsa_eye flag (see
// supabase/migration_collection_flags.sql) — no is_hamsa_eye_home
// requirement here either, same as the product query above: this page
// shows the full collection, home is_hamsa_eye_home just curates the
// homepage strip.
async function getHamsaEyeCollections(): Promise<Collection[]> {
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .eq('is_hamsa_eye', true)
    .order('display_order', { ascending: true });
  return withPriceRanges(data ?? []);
}

export default async function HamsaEyePage() {
  const [products, collections] = await Promise.all([getHamsaEyeProducts(), getHamsaEyeCollections()]);

  const sortedItems: GridItem[] = [
    ...products.map((product) => ({ type: 'product' as const, display_order: product.display_order, product })),
    ...collections.map((collection) => ({
      type: 'collection' as const,
      display_order: collection.display_order,
      collection,
    })),
  ].sort((a, b) => a.display_order - b.display_order);
  const items = soldOutLastGrid(sortedItems);

  return (
    <div data-page="hamsa-eye" className="home-section">
      <h1 className="section-heading-eb center">Hamsa & Eye Collection</h1>
      {items.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: 24 }}>No items marked yet — check back soon!</p>
      ) : (
        <div data-grid="products" style={{ marginTop: 40 }}>
          {items.map((item) =>
            item.type === 'product' ? (
              <ProductCard key={`product-${item.product.id}`} product={item.product} />
            ) : (
              <CollectionCard key={`collection-${item.collection.id}`} collection={item.collection} />
            )
          )}
        </div>
      )}
    </div>
  );
}
