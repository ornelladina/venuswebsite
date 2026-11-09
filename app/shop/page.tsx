import { soldOutLast } from '@/lib/soldOut';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Product, Category } from '@/types';
import CategoryCarousel from '@/components/CategoryCarousel';

export const revalidate = 60;

async function getCategories(): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').order('display_order');
  return data ?? [];
}

async function getAllProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    // Tie-breaker for products that share the same display_order (every
    // new product defaults to 0 unless manually reordered) — newest
    // first, rather than an unpredictable order among the ties.
    .order('created_at', { ascending: false });
  return soldOutLast(data ?? []);
}

export default async function ShopPage() {
  const [categories, products] = await Promise.all([getCategories(), getAllProducts()]);

  // One carousel per category (Necklaces, Bracelets, etc.), in the same
  // order as the category list, skipping any category with nothing in it.
  const sections = categories
    .map((category) => ({
      category,
      products: products.filter((p) => p.category_id === category.id),
    }))
    .filter((section) => section.products.length > 0);

  return (
    <div data-page="shop" className="home-section">
      <h1 className="section-heading-eb">Shop All</h1>
      {sections.length === 0 ? (
        <p>No products yet — check back soon!</p>
      ) : (
        <div className="shop-all-sections">
          {sections.map(({ category, products }) => (
            <section key={category.id} className="shop-all-category-section">
              <div className="shop-all-category-header">
                <h2 className="section-heading-eb">{category.name}</h2>
                <Link href={`/category/${category.slug}`} className="shop-all-category-link">
                  See All →
                </Link>
              </div>
              <CategoryCarousel products={products} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
