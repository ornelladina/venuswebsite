import { soldOutLast } from '@/lib/soldOut';
import { supabase } from '@/lib/supabaseClient';
import { Product, Collection } from '@/types';
import ProductCard from '@/components/ProductCard';
import CollectionHeroGallery from '@/components/CollectionHeroGallery';
import { notFound } from 'next/navigation';

export const revalidate = 60;

async function getCollection(slug: string): Promise<Collection | null> {
  const { data } = await supabase
    .from('collections')
    .select('*, collection_images(*)')
    .order('display_order', { foreignTable: 'collection_images', ascending: true })
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  return data;
}

async function getCollectionProducts(collectionId: string): Promise<Product[]> {
  const { data } = await supabase
    .from('collection_products')
    .select('display_order, featured_image_id, products(*, product_images(*), product_variations(*))')
    .order('display_order', { foreignTable: 'products.product_images', ascending: true })
    .eq('collection_id', collectionId)
    .order('display_order', { ascending: true });
  if (!data) return [];
  const list: Product[] = data
    .map((row: any) => {
      const product = row.products;
      if (!product) return null;
      // If this product's card was pointed at a specific photo for this
      // look (see supabase/migration_collection_product_image.sql —
      // picked in the admin dashboard, e.g. the blue variation's photo
      // instead of the product's normal default), move that photo to the
      // front of its own image list. ProductCard always shows
      // product_images[0] as the default/first photo, so this is enough
      // to make that photo the one this card opens on — everything else
      // (hover-cycling through the rest, the product's own page) is
      // untouched.
      if (row.featured_image_id && product.product_images?.length > 1) {
        const idx = product.product_images.findIndex((img: any) => img.id === row.featured_image_id);
        if (idx > 0) {
          const images = [...product.product_images];
          const [featured] = images.splice(idx, 1);
          images.unshift(featured);
          product.product_images = images;
        }
      }
      return product;
    })
    .filter(Boolean);
  return soldOutLast(list);
}

async function getSetItems(setProductId: string): Promise<Product[]> {
  const { data } = await supabase
    .from('set_items')
    .select('display_order, products:item_product_id(*, product_images(*), product_variations(*))')
    .order('display_order', { foreignTable: 'products.product_images', ascending: true })
    .eq('set_product_id', setProductId)
    .order('display_order', { ascending: true });
  if (!data) return [];
  return soldOutLast(data.map((row: any) => row.products).filter(Boolean));
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = await getCollection(params.slug);
  if (!collection) notFound();

  const products = await getCollectionProducts(collection.id);
  const individualItems = products.filter((p) => !p.is_set);
  const setProducts = products.filter((p) => p.is_set);

  // Cover photo always first, then any extra photos from
  // collection_images (in display_order) — see
  // supabase/migration_collection_images.sql. A collection with no extra
  // photos just gets the one-item array, so CollectionHeroGallery
  // renders exactly like the old static image with no swipe/dots.
  const heroImages = [
    collection.cover_image_url,
    ...(collection.collection_images ?? []).map((img) => img.image_url),
  ].filter(Boolean);

  const setsWithItems = await Promise.all(
    setProducts.map(async (set) => ({ set, items: await getSetItems(set.id) }))
  );

  return (
    <div data-page="collection">
      <div className="collection-layout">
        <div className="collection-hero">
          <CollectionHeroGallery images={heroImages} title={collection.name} />
        </div>

        <div className="collection-content" id="collection-items">
          {individualItems.length > 0 && (
            <section className="home-section">
              <h2 className="section-heading-eb">Shop The Items</h2>
              <div data-grid="products">
                {individualItems.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {setsWithItems.map(({ set, items }) => (
            <section key={set.id} className="home-section tinted">
              <div>
                <h2 className="section-heading-eb">{set.name}</h2>
                <div data-grid="products">
                  <ProductCard product={set} />
                </div>
                {items.length > 0 && (
                  <>
                    <p className="section-subheading-uppercase" style={{ marginTop: 40 }}>
                      What&apos;s in this set
                    </p>
                    <div data-grid="products">
                      {items.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
