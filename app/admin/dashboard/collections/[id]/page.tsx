import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/formatPrice';
import {
  updateCollection,
  replaceCollectionCover,
  addCollectionImages,
  updateCollectionProductOrder,
  updateCollectionProductImage,
} from '../actions';
import CollectionFormFields from '../CollectionFormFields';
import CollectionImageManager from './CollectionImageManager';
import AddCollectionProductForm from './AddCollectionProductForm';
import RemoveCollectionProductButton from './RemoveCollectionProductButton';

export const dynamic = 'force-dynamic';

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

async function getCollection(id: string) {
  const { data } = await adminDb()
    .from('collections')
    .select('*, collection_images(*)')
    .eq('id', id)
    .order('display_order', { foreignTable: 'collection_images', ascending: true })
    .single();
  return data;
}

async function getCollectionProducts(collectionId: string) {
  const { data } = await adminDb()
    .from('collection_products')
    .select(
      'id, display_order, featured_image_id, products(id, name, price, product_images(id, image_url, label, color_tag, display_order))'
    )
    .eq('collection_id', collectionId)
    .order('display_order', { foreignTable: 'products.product_images', ascending: true })
    .order('display_order', { ascending: true });
  return data ?? [];
}

async function getCategories() {
  const { data } = await supabase.from('categories').select('id, name').order('display_order');
  return data ?? [];
}

async function getAllProducts() {
  const { data } = await adminDb().from('products').select('id, name').order('name');
  return data ?? [];
}

export default async function EditCollectionPage({ params }: { params: { id: string } }) {
  const [collection, categories, linkedRows, allProducts] = await Promise.all([
    getCollection(params.id),
    getCategories(),
    getCollectionProducts(params.id),
    getAllProducts(),
  ]);

  if (!collection) {
    notFound();
  }

  const extraImages = collection.collection_images ?? [];
  const linkedProductIds = new Set(linkedRows.map((r: any) => r.products?.id).filter(Boolean));
  const availableProducts = allProducts.filter((p) => !linkedProductIds.has(p.id));

  return (
    <div data-page="admin-product-form">
      <div data-admin-dashboard-header>
        <h1>Edit Collection</h1>
        <Link href="/admin/dashboard/collections" data-admin-btn-secondary>
          Back to Collections
        </Link>
      </div>

      <form action={updateCollection.bind(null, collection.id)} data-admin-product-form>
        <CollectionFormFields collection={collection} categories={categories} />
        <div data-admin-form-actions>
          <button type="submit" data-admin-btn-primary>
            Save Changes
          </button>
        </div>
      </form>

      {/* ---------- Cover photo ---------- */}
      <section data-admin-subsection>
        <h2>Cover Photo</h2>
        <p data-admin-form-hint>Shown first on the collection&rsquo;s card and page.</p>

        <div data-admin-image-grid>
          <div data-admin-image-card>
            <div data-admin-image-thumb-wrap>
              <Image
                src={collection.cover_image_url}
                alt={collection.name}
                width={120}
                height={120}
                style={{ objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>

        <form
          action={replaceCollectionCover.bind(null, collection.id)}
          data-admin-upload-form
          encType="multipart/form-data"
        >
          <input type="file" name="cover_image" accept="image/*" required />
          <button type="submit" data-admin-btn-secondary>
            Replace Cover Photo
          </button>
        </form>
      </section>

      {/* ---------- Extra photos ---------- */}
      <section data-admin-subsection>
        <h2>Extra Photos</h2>
        <p data-admin-form-hint>
          Optional. Additional photos people can swipe through on the collection&rsquo;s page,
          after the cover photo.
        </p>

        {extraImages.length > 0 && (
          <CollectionImageManager collectionId={collection.id} images={extraImages} />
        )}

        <form
          action={addCollectionImages.bind(null, collection.id)}
          data-admin-upload-form
          encType="multipart/form-data"
        >
          <input type="file" name="images" accept="image/*" multiple required />
          <button type="submit" data-admin-btn-secondary>
            Upload Photos
          </button>
        </form>
      </section>

      {/* ---------- Products in this look ---------- */}
      <section data-admin-subsection>
        <h2>Products in this Look</h2>
        <p data-admin-form-hint>
          The pieces that make up this collection. Add any product already in your catalog —
          upload its photos from the Products page first if it doesn&rsquo;t have any yet.
        </p>

        {linkedRows.length > 0 && (
          <div data-admin-variation-list>
            {linkedRows.map((row: any) => {
              const product = row.products;
              if (!product) return null;
              const productImages = product.product_images ?? [];
              const thumb = productImages[0]?.image_url as string | undefined;
              return (
                // A plain div, not a <form> — RemoveCollectionProductButton
                // below renders its own <form>, and a <form> nested inside
                // another <form> is invalid HTML: the browser collapses
                // them into one, so clicking "Remove" was actually
                // re-submitting "Save Order" instead of removing anything.
                // The order form just wraps its own fields+button with
                // display:contents so it doesn't affect this row's layout.
                <div key={row.id} data-admin-variation-row>
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={product.name}
                      width={40}
                      height={40}
                      style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div data-admin-order-item-noimage style={{ width: 40, height: 40, flexShrink: 0 }}>
                      No photo
                    </div>
                  )}
                  <span style={{ flex: 1, minWidth: 120, fontSize: 13 }}>
                    {product.name} — ${formatPrice(product.price)}
                  </span>
                  {/* Which of this product's own photos (e.g. a specific
                      color) shows on its card within this one look —
                      see supabase/migration_collection_product_image.sql.
                      Only worth showing when the product actually has
                      more than one photo to choose between. Same
                      display:contents trick as the Save Order form
                      below, for the same nested-<form> reason. */}
                  {productImages.length > 1 && (
                    <form
                      action={updateCollectionProductImage.bind(null, row.id, collection.id)}
                      style={{ display: 'contents' }}
                    >
                      <select name="featured_image_id" defaultValue={row.featured_image_id ?? ''}>
                        <option value="">Default photo</option>
                        {productImages.map((img: any, i: number) => (
                          <option key={img.id} value={img.id}>
                            {img.label || img.color_tag || `Photo ${i + 1}`}
                          </option>
                        ))}
                      </select>
                      <button type="submit" data-admin-btn-secondary>
                        Save Photo
                      </button>
                    </form>
                  )}
                  {/* Two SIBLING forms, not one wrapping the other — an
                      earlier version nested RemoveCollectionProductButton's
                      own <form> inside this Save Order <form>, which is
                      invalid HTML. Browsers collapse nested forms into the
                      outer one, so clicking "Remove" was actually
                      re-submitting "Save Order" and never removing anything. */}
                  <div data-admin-variation-row-actions>
                    <form
                      action={updateCollectionProductOrder.bind(null, row.id, collection.id)}
                      style={{ display: 'contents' }}
                    >
                      <input
                        type="number"
                        name="display_order"
                        placeholder="Order"
                        step="1"
                        defaultValue={row.display_order ?? 0}
                        style={{ maxWidth: 80 }}
                      />
                      <button type="submit" data-admin-btn-secondary>
                        Save Order
                      </button>
                    </form>
                    <RemoveCollectionProductButton rowId={row.id} collectionId={collection.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AddCollectionProductForm collectionId={collection.id} options={availableProducts} />
      </section>
    </div>
  );
}
