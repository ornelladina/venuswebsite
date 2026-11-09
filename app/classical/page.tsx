import { soldOutLast } from '@/lib/soldOut';
import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Classical Collection',
  alternates: { canonical: '/classical' },
};

// Every product with is_classical = true (and is_active = true) shows up
// here, no limit — same pattern as /hamsa-eye. See
// supabase/migration_classical.sql for how to add/remove products from
// this page (toggle the column in Table Editor, no redeploy needed).
async function getClassicalProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .eq('is_classical', true)
    .order('display_order', { ascending: true })
    // Tie-breaker for products sharing the same display_order (every new
    // product defaults to 0 unless manually reordered) — newest first.
    .order('created_at', { ascending: false });
  return soldOutLast(data ?? []);
}

export default async function ClassicalPage() {
  const products = await getClassicalProducts();

  return (
    <div data-page="classical" className="home-section">
      <h1 className="section-heading-eb center">Classical Collection</h1>
      {products.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: 24 }}>No items marked yet — check back soon!</p>
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
