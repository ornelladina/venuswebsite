import { soldOutLastGrid } from '@/lib/soldOut';
import { supabase } from '@/lib/supabaseClient';
import { Product, Collection, GridItem } from '@/types';
import ProductCard from '@/components/ProductCard';
import CollectionCard from '@/components/CollectionCard';
import { withPriceRanges } from '@/lib/collectionPriceRange';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Best Sellers',
  alternates: { canonical: '/best-sellers' },
};

// Every product with is_best_seller = true (and is_active = true) shows up
// here automatically. Toggle it in Supabase's Table Editor to add/remove
// items, exactly like is_featured / is_hamsa_eye / is_shop_the_look
// already work elsewhere on the site.
async function getBestSellerProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .eq('is_best_seller', true)
    // best_seller_order (see supabase/migration_section_order.sql) — set
    // by dragging in the admin dashboard's Best Sellers list.
    .order('best_seller_order', { ascending: true });
  return data ?? [];
}

// Collection-side counterpart, same is_best_seller flag (see
// supabase/migration_collection_flags.sql).
async function getBestSellerCollections(): Promise<Collection[]> {
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .eq('is_best_seller', true)
    .order('best_seller_order', { ascending: true });
  return withPriceRanges(data ?? []);
}

export default async function BestSellersPage() {
  const [products, collections] = await Promise.all([getBestSellerProducts(), getBestSellerCollections()]);

  const sortedItems: GridItem[] = [
    ...products.map((product) => ({ type: 'product' as const, display_order: product.best_seller_order, product })),
    ...collections.map((collection) => ({
      type: 'collection' as const,
      display_order: collection.best_seller_order,
      collection,
    })),
  ].sort((a, b) => a.display_order - b.display_order);
  const items = soldOutLastGrid(sortedItems);

  return (
    <div data-page="best-sellers" className="home-section">
      <h1 className="section-heading-eb center">Best Sellers</h1>
      {items.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: 24 }}>No best sellers marked yet — check back soon!</p>
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
