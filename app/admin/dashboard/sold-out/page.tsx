import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import SignOutButton from '../SignOutButton';
import { formatPrice } from '@/lib/formatPrice';
import RestockProductField from './RestockProductField';
import RestockVariationField from './RestockVariationField';

export const dynamic = 'force-dynamic';

async function getProducts() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, categories(name), product_images(image_url, display_order), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .order('display_order', { foreignTable: 'product_variations', ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(`Could not load products: ${error.message}`);
  return data ?? [];
}

export default async function SoldOutPage() {
  const products = await getProducts();

  // A product with no variation rows is "sold out" purely by its own
  // stock_quantity — same rule ProductCard.tsx uses on the live site to
  // show the "Out of Stock" badge/disable Add to Cart.
  const soldOutSimpleProducts = products.filter(
    (p: any) => (p.product_variations?.length ?? 0) === 0 && p.stock_quantity <= 0
  );

  // A product WITH variations can be partially sold out (e.g. Gold is
  // out but Silver isn't) — list it here with just its zero-stock
  // variations, so a color/size can be restocked before the whole
  // product runs out, not only once every option has hit 0.
  const productsWithSoldOutVariations = products
    .map((p: any) => ({
      ...p,
      soldOutVariations: (p.product_variations ?? []).filter((v: any) => v.stock_quantity <= 0),
    }))
    .filter((p: any) => p.soldOutVariations.length > 0);

  const totalCount = soldOutSimpleProducts.length + productsWithSoldOutVariations.length;
  const totalSoldOutVariations = productsWithSoldOutVariations.reduce(
    (sum: number, p: any) => sum + p.soldOutVariations.length,
    0
  );

  return (
    <div data-page="admin-sold-out">
      <div data-admin-dashboard-header>
        <h1>Sold Out ({totalCount})</h1>
        <div data-admin-header-actions>
          <Link href="/admin/dashboard" data-admin-btn-secondary>
            Orders
          </Link>
          <Link href="/admin/dashboard/products" data-admin-btn-secondary>
            Products
          </Link>
          <Link href="/admin/dashboard/collections" data-admin-btn-secondary>
            Collections
          </Link>
          <Link href="/admin/dashboard/homepage" data-admin-btn-secondary>
            Homepage Sections
          </Link>
          <SignOutButton />
        </div>
      </div>

      {totalCount === 0 ? (
        <p data-admin-empty>Nothing&rsquo;s sold out right now 🎉</p>
      ) : (
        <p data-admin-form-hint>
          {soldOutSimpleProducts.length} product{soldOutSimpleProducts.length === 1 ? '' : 's'} fully out
          of stock
          {productsWithSoldOutVariations.length > 0 && (
            <>
              {' '}
              &middot; {totalSoldOutVariations} variation{totalSoldOutVariations === 1 ? '' : 's'} out of
              stock across {productsWithSoldOutVariations.length} product
              {productsWithSoldOutVariations.length === 1 ? '' : 's'}
            </>
          )}
          . Type a new stock number and hit Restock — it goes live right away.
        </p>
      )}

      {soldOutSimpleProducts.length > 0 && (
        <section data-admin-subsection>
          <h2>Fully Out of Stock ({soldOutSimpleProducts.length})</h2>
          <div data-admin-product-list>
            {soldOutSimpleProducts.map((product: any) => {
              const thumb = product.product_images?.[0]?.image_url as string | undefined;
              return (
                <div key={product.id} data-admin-product-row>
                  <div data-admin-product-thumb>
                    {thumb ? (
                      <Image src={thumb} alt={product.name} width={64} height={64} />
                    ) : (
                      <div data-admin-order-item-noimage>No photo</div>
                    )}
                  </div>
                  <div data-admin-product-info>
                    <p data-admin-product-name>{product.name}</p>
                    <p data-admin-product-meta>
                      {product.categories?.name ?? 'Uncategorized'} · ${formatPrice(product.price)} ·
                      Stock {product.stock_quantity}
                    </p>
                    <div data-admin-product-badges>
                      <span data-admin-badge data-admin-badge-danger>
                        Out of Stock
                      </span>
                      {!product.is_active && (
                        <span data-admin-badge data-admin-badge-muted>
                          Hidden
                        </span>
                      )}
                    </div>
                  </div>
                  <RestockProductField productId={product.id} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {productsWithSoldOutVariations.length > 0 && (
        <section data-admin-subsection>
          <h2>Sold-Out Variations ({productsWithSoldOutVariations.length} products)</h2>
          <p data-admin-form-hint>
            The product itself still shows as in stock (other options are available) — just these
            specific options are out.
          </p>
          <div data-admin-product-list>
            {productsWithSoldOutVariations.map((product: any) => {
              const thumb = product.product_images?.[0]?.image_url as string | undefined;
              return (
                <div key={product.id} data-admin-product-row style={{ alignItems: 'flex-start' }}>
                  <div data-admin-product-thumb>
                    {thumb ? (
                      <Image src={thumb} alt={product.name} width={64} height={64} />
                    ) : (
                      <div data-admin-order-item-noimage>No photo</div>
                    )}
                  </div>
                  <div data-admin-product-info>
                    <p data-admin-product-name>{product.name}</p>
                    <p data-admin-product-meta>
                      {product.categories?.name ?? 'Uncategorized'} ·{' '}
                      <Link href={`/admin/dashboard/products/${product.id}`}>Edit product</Link>
                    </p>
                    <div>
                      {product.soldOutVariations.map((v: any) => (
                        <div key={v.id} data-admin-sold-out-variation-row>
                          <div data-admin-sold-out-variation-info>
                            <span data-admin-sold-out-variation-label>{v.variation_type}: </span>
                            {v.variation_value}
                          </div>
                          <RestockVariationField variationId={v.id} productId={product.id} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
