import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/types';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/ProductDetail';
import ProductCard from '@/components/ProductCard';
import { getRelatedProducts } from '@/lib/related';
import type { Metadata } from 'next';

export const revalidate = 60;

async function getProduct(slug: string): Promise<Product | null> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};

  const image = product.product_images?.[0]?.image_url;
  const description =
    product.description ??
    `Shop the ${product.name} — trendy, hypoallergenic, gold-plated jewelry. Cash on delivery across Lebanon.`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    alternates: {
      canonical: `/product/${product.slug}`,
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product);
  const price = product.sale_price ?? product.price;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? product.name,
    image: product.product_images?.map((img) => img.image_url) ?? [],
    sku: product.sku ?? undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price,
      availability:
        product.stock_quantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      areaServed: 'LB',
    },
  };

  return (
    <div data-page="product">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} />

      {related.length > 0 && (
        <section data-section="related-products">
          <h2 className="section-heading-eb">You May Also Like</h2>
          <div data-grid="products">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
