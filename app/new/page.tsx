import { soldOutLast } from '@/lib/soldOut';
import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'New Arrivals',
  alternates: { canonical: '/new' },
};

async function getNewProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .eq('is_new', true)
    .order('created_at', { ascending: false });
  return soldOutLast(data ?? []);
}

export default async function NewItemsPage() {
  const products = await getNewProducts();

  return (
    <div data-page="new-items" className="home-section">
      <h1 className="section-heading-eb center">New Arrivals</h1>
      {products.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: 24 }}>No new items right now — check back soon!</p>
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
