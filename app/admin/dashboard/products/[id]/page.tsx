import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  updateProduct,
  addProductImages,
  addVariation,
  updateVariation,
  deleteVariation,
} from '../actions';
import ProductFormFields from '../ProductFormFields';
import ImageManager from './ImageManager';
import DeleteVariationButton from './DeleteVariationButton';

export const dynamic = 'force-dynamic';

async function getProduct(id: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data } = await supabaseAdmin
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .eq('id', id)
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .order('display_order', { foreignTable: 'product_variations', ascending: true })
    .single();

  return data;
}

async function getCategories() {
  const { data } = await supabase.from('categories').select('id, name').order('display_order');
  return data ?? [];
}

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { addVariations?: string };
}) {
  const [product, categories] = await Promise.all([getProduct(params.id), getCategories()]);

  if (!product) {
    notFound();
  }

  const images = product.product_images ?? [];
  const variations = product.product_variations ?? [];

  return (
    <div data-page="admin-product-form">
      <div data-admin-dashboard-header>
        <h1>Edit Product</h1>
        <Link href="/admin/dashboard/products" data-admin-btn-secondary>
          Back to Products
        </Link>
      </div>

      {searchParams?.addVariations === '1' && variations.length === 0 && (
        <p data-admin-form-hint>
          Product created. It&rsquo;s marked as having variations, so scroll down to{' '}
          <strong>Variations</strong> and add each one with its stock number &mdash; until you do, the
          product shows as sold out.
        </p>
      )}

      <form action={updateProduct.bind(null, product.id)} data-admin-product-form>
        <ProductFormFields product={product} categories={categories} hasVariations={variations.length > 0} />
        <div data-admin-form-actions>
          <button type="submit" data-admin-btn-primary>
            Save Changes
          </button>
        </div>
      </form>

      {/* ---------- Photos ---------- */}
      <section data-admin-subsection>
        <h2>Photos</h2>
        <p data-admin-form-hint>The first photo is the main image shown on product cards.</p>

        {images.length > 0 && <ImageManager productId={product.id} images={images} />}

        <form action={addProductImages.bind(null, product.id)} data-admin-upload-form>
          <input type="file" name="images" accept="image/*" multiple required />
          <button type="submit" data-admin-btn-secondary>
            Upload Photos
          </button>
        </form>
      </section>

      {/* ---------- Variations ---------- */}
      <section data-admin-subsection>
        <h2>Variations</h2>
        <p data-admin-form-hint>
          Only for products with options. Add a row for each size/color/style it comes in &mdash; the
          Stock number on every row is required (0 or more). Leave empty for a product with no
          variations.
        </p>

        {variations.length > 0 && (
          <div data-admin-variation-list>
            {variations.map((v: any) => (
              // Same nested-<form> fix as the collection product list above
              // — DeleteVariationButton renders its own <form>, so this row
              // can't be a <form> too.
              <div key={v.id} data-admin-variation-row>
                <form
                  action={updateVariation.bind(null, v.id, product.id)}
                  style={{ display: 'contents' }}
                >
                  <input
                    type="text"
                    name="variation_type"
                    placeholder="Type (e.g. Color)"
                    defaultValue={v.variation_type}
                    required
                  />
                  <input
                    type="text"
                    name="variation_value"
                    placeholder="Value (e.g. Gold)"
                    defaultValue={v.variation_value}
                    required
                  />
                  <input
                    type="number"
                    name="price_override"
                    placeholder="Price override"
                    step="0.01"
                    min="0"
                    defaultValue={v.price_override ?? ''}
                  />
                  <input
                    type="number"
                    name="stock_quantity"
                    placeholder="Stock *"
                    step="1"
                    min="0"
                    required
                    defaultValue={v.stock_quantity ?? 0}
                  />
                  <input type="text" name="sku" placeholder="SKU" defaultValue={v.sku ?? ''} />
                  <input
                    type="number"
                    name="display_order"
                    placeholder="Order"
                    step="1"
                    defaultValue={v.display_order ?? 0}
                  />
                  <div data-admin-variation-row-actions>
                    <button type="submit" data-admin-btn-secondary>
                      Save
                    </button>
                    <DeleteVariationButton variationId={v.id} productId={product.id} />
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={addVariation.bind(null, product.id)} data-admin-variation-row data-admin-variation-row-new>
          <input type="text" name="variation_type" placeholder="Type (e.g. Color)" required />
          <input type="text" name="variation_value" placeholder="Value (e.g. Gold)" required />
          <input type="number" name="price_override" placeholder="Price override" step="0.01" min="0" />
          <input type="number" name="stock_quantity" placeholder="Stock *" step="1" min="0" required />
          <input type="text" name="sku" placeholder="SKU" />
          <input type="number" name="display_order" placeholder="Order" step="1" defaultValue={0} />
          <div data-admin-variation-row-actions>
            <button type="submit" data-admin-btn-primary>
              + Add Variation
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
