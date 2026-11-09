import { soldOutLast } from '@/lib/soldOut';
import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Sets & Collections',
  alternates: { canonical: '/collections' },
};

// "Sets & Collections" links out to individual SET products — any product
// with is_set = true (and is_active = true) shows up here automatically.
// Toggle is_set in Supabase's Table Editor > products to add/remove a
// product from this page, exactly like is_featured works elsewhere.
async function getSetProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .eq('is_set', true)
    .order('display_order', { ascending: true });
  return soldOutLast(data ?? []);
}

export default async function CollectionsPage() {
  const products = await getSetProducts();

  return (
    <div data-page="collections" className="home-section">
      <h1 className="section-heading-eb center">Sets &amp; Collections</h1>
      {products.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: 24 }}>No sets yet — check back soon.</p>
      ) : (
        <div data-grid="products" style={{ marginTop: 40 }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
