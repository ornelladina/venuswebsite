import { soldOutLast } from '@/lib/soldOut';
import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Sale',
  alternates: { canonical: '/sale' },
};

// Every product with a sale_price set (and is_active = true) shows up here
// automatically — no new Supabase column needed, sale_price already exists
// on the products table and already powers the struck-through price on
// ProductCard everywhere else it's shown. To put a product "on sale", just
// fill in its sale_price in Table Editor; to take it off sale, clear that
// field back to empty/null.
async function getSaleProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .not('sale_price', 'is', null)
    .order('display_order', { ascending: true })
    // Tie-breaker for products sharing the same display_order (every new
    // product defaults to 0 unless manually reordered) — newest first.
    .order('created_at', { ascending: false });
  return soldOutLast(data ?? []);
}

export default async function SalePage() {
  const products = await getSaleProducts();

  return (
    <div data-page="sale" className="home-section">
      <h1 className="section-heading-eb center">Sale</h1>
      {products.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: 24 }}>Nothing on sale right now — check back soon!</p>
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
