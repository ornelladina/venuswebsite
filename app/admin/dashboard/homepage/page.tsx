import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  addBestSeller,
  removeBestSeller,
  removeAllBestSellers,
  reorderBestSellers,
  addFeatured,
  removeFeatured,
  removeAllFeatured,
  reorderFeatured,
  addHamsaEyeHome,
  removeHamsaEyeHome,
  removeAllHamsaEyeHome,
  reorderHamsaEyeHome,
  addShopTheLook,
  removeShopTheLook,
  removeAllShopTheLook,
  reorderShopTheLook,
} from './actions';
import RemoveAllButton from './RemoveAllButton';
import AddItemForm from './AddItemForm';
import EditFeaturedSubtitleForm from './EditFeaturedSubtitleForm';
import SortableItemList, { SectionItem } from './SortableItemList';
import SignOutButton from '../SignOutButton';
import { getSiteSettings } from '@/lib/siteSettings';

export const dynamic = 'force-dynamic';

async function getProducts() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data } = await supabaseAdmin
    .from('products')
    .select(
      'id, name, price, is_best_seller, is_featured, is_hamsa_eye, is_hamsa_eye_home, best_seller_order, featured_order, hamsa_eye_home_order, product_images(image_url, display_order)'
    )
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .order('name');

  return data ?? [];
}

// Collections (a "shop the look" set) can be added into these sections
// too, alongside regular products — see supabase/migration_collection_flags.sql
// for the is_featured/is_best_seller columns on collections, and
// supabase/migration_section_order.sql for their own featured_order /
// best_seller_order.
async function getCollections() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data } = await supabaseAdmin
    .from('collections')
    .select(
      'id, name, cover_image_url, is_best_seller, is_featured, is_hamsa_eye, is_hamsa_eye_home, show_on_homepage, best_seller_order, featured_order, hamsa_eye_home_order, shop_the_look_order'
    )
    .order('name');

  return data ?? [];
}

export default async function HomepageSectionsPage() {
  const [products, collections, settings] = await Promise.all([getProducts(), getCollections(), getSiteSettings()]);

  // Each section sorts by its own order column, shared across products
  // and collections (see supabase/migration_section_order.sql) so
  // dragging in one section never moves an item in the other, and a
  // product and a collection can be interleaved in the same list.
  const bestSellerItems: SectionItem[] = [
    ...products
      .filter((p) => p.is_best_seller)
      .map((p) => ({
        itemId: `product:${p.id}`,
        kind: 'product' as const,
        name: p.name,
        price: Number(p.price),
        thumb: p.product_images?.[0]?.image_url,
        order: p.best_seller_order,
      })),
    ...collections
      .filter((c) => c.is_best_seller)
      .map((c) => ({
        itemId: `collection:${c.id}`,
        kind: 'collection' as const,
        name: c.name,
        thumb: c.cover_image_url,
        order: c.best_seller_order,
      })),
  ]
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...item }) => item);

  const featuredItems: SectionItem[] = [
    ...products
      .filter((p) => p.is_featured)
      .map((p) => ({
        itemId: `product:${p.id}`,
        kind: 'product' as const,
        name: p.name,
        price: Number(p.price),
        thumb: p.product_images?.[0]?.image_url,
        order: p.featured_order,
      })),
    ...collections
      .filter((c) => c.is_featured)
      .map((c) => ({
        itemId: `collection:${c.id}`,
        kind: 'collection' as const,
        name: c.name,
        thumb: c.cover_image_url,
        order: c.featured_order,
      })),
  ]
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...item }) => item);

  const hamsaEyeHomeItems: SectionItem[] = [
    ...products
      .filter((p) => p.is_hamsa_eye_home)
      .map((p) => ({
        itemId: `product:${p.id}`,
        kind: 'product' as const,
        name: p.name,
        price: Number(p.price),
        thumb: p.product_images?.[0]?.image_url,
        order: p.hamsa_eye_home_order,
      })),
    ...collections
      .filter((c) => c.is_hamsa_eye_home)
      .map((c) => ({
        itemId: `collection:${c.id}`,
        kind: 'collection' as const,
        name: c.name,
        thumb: c.cover_image_url,
        order: c.hamsa_eye_home_order,
      })),
  ]
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...item }) => item);

  // Collections-only — there's no "shop the look" flag for individual
  // products, since a look is inherently a multi-product set.
  const shopTheLookItems: SectionItem[] = collections
    .filter((c) => c.show_on_homepage)
    .sort((a, b) => a.shop_the_look_order - b.shop_the_look_order)
    .map((c) => ({
      itemId: `collection:${c.id}`,
      kind: 'collection' as const,
      name: c.name,
      thumb: c.cover_image_url,
    }));

  const availableProducts = (flag: 'is_best_seller' | 'is_featured' | 'is_hamsa_eye_home') =>
    products.filter((p) => !p[flag]).map((p) => ({ id: p.id, name: p.name }));
  const availableCollections = (flag: 'is_best_seller' | 'is_featured' | 'is_hamsa_eye_home' | 'show_on_homepage') =>
    collections.filter((c) => !c[flag]).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div data-page="admin-products">
      <div data-admin-dashboard-header>
        <h1>Homepage Sections</h1>
        <div data-admin-header-actions>
          <Link href="/admin/dashboard" data-admin-btn-secondary>
            Orders
          </Link>
          <Link href="/admin/dashboard/products" data-admin-btn-secondary>
            Products
          </Link>
          <Link href="/admin/dashboard/sold-out" data-admin-btn-secondary>
            Sold Out
          </Link>
          <Link href="/admin/dashboard/collections" data-admin-btn-secondary>
            Collections
          </Link>
          <Link href="/admin/dashboard/homepage/images" data-admin-btn-secondary>
            Cover Images
          </Link>
          <SignOutButton />
        </div>
      </div>

      <p data-admin-form-hint>
        Add or remove products and collections from the Best Sellers and Featured Items sections
        here, without opening each one&rsquo;s own page. Removing an item from a section
        doesn&rsquo;t delete it — it just stops showing up there. Newly-added items start at the
        top of their section; drag the handle on any row to move it, and the live site updates to
        match right away.
      </p>

      {/* ---------- Best Sellers ---------- */}
      <section data-admin-subsection>
        <div data-admin-dashboard-header>
          <h2>Best Sellers ({bestSellerItems.length})</h2>
          <RemoveAllButton
            sectionName="Best Sellers"
            count={bestSellerItems.length}
            action={removeAllBestSellers}
          />
        </div>

        {bestSellerItems.length === 0 ? (
          <p data-admin-empty>Nothing marked as a Best Seller yet.</p>
        ) : (
          <SortableItemList
            initialItems={bestSellerItems}
            reorderAction={reorderBestSellers}
            removeAction={removeBestSeller}
          />
        )}

        <AddItemForm
          productOptions={availableProducts('is_best_seller')}
          collectionOptions={availableCollections('is_best_seller')}
          action={addBestSeller}
          emptyMessage="Every active product and collection is already a Best Seller."
        />
      </section>

      {/* ---------- Featured Items ---------- */}
      <section data-admin-subsection>
        <div data-admin-dashboard-header>
          <h2>Featured Items ({featuredItems.length})</h2>
          <RemoveAllButton
            sectionName="Featured Items"
            count={featuredItems.length}
            action={removeAllFeatured}
          />
        </div>

        <EditFeaturedSubtitleForm initialValue={settings.featured_subtitle} />

        {featuredItems.length === 0 ? (
          <p data-admin-empty>Nothing marked as Featured yet.</p>
        ) : (
          <SortableItemList
            initialItems={featuredItems}
            reorderAction={reorderFeatured}
            removeAction={removeFeatured}
          />
        )}

        <AddItemForm
          productOptions={availableProducts('is_featured')}
          collectionOptions={availableCollections('is_featured')}
          action={addFeatured}
          emptyMessage="Every active product and collection is already Featured."
        />
      </section>

      {/* ---------- Hamsa & Eye (homepage strip) ---------- */}
      <section data-admin-subsection>
        <div data-admin-dashboard-header>
          <h2>Hamsa &amp; Eye ({hamsaEyeHomeItems.length})</h2>
          <RemoveAllButton
            sectionName="Hamsa & Eye"
            count={hamsaEyeHomeItems.length}
            action={removeAllHamsaEyeHome}
          />
        </div>

        <p data-admin-form-hint>
          This is the curated set shown on the homepage strip. Adding an item here also adds it to
          the full <code>/hamsa-eye</code> page if it wasn&rsquo;t already there; removing it here
          only takes it off the homepage strip, it stays on the full page.
        </p>

        {hamsaEyeHomeItems.length === 0 ? (
          <p data-admin-empty>Nothing in the Hamsa &amp; Eye homepage strip yet.</p>
        ) : (
          <SortableItemList
            initialItems={hamsaEyeHomeItems}
            reorderAction={reorderHamsaEyeHome}
            removeAction={removeHamsaEyeHome}
          />
        )}

        <AddItemForm
          productOptions={availableProducts('is_hamsa_eye_home')}
          collectionOptions={availableCollections('is_hamsa_eye_home')}
          action={addHamsaEyeHome}
          emptyMessage="Every active product and collection is already in the Hamsa & Eye homepage strip."
        />
      </section>

      {/* ---------- Shop the Look (homepage strip) ---------- */}
      <section data-admin-subsection>
        <div data-admin-dashboard-header>
          <h2>Shop the Look ({shopTheLookItems.length})</h2>
          <RemoveAllButton
            sectionName="Shop the Look"
            count={shopTheLookItems.length}
            action={removeAllShopTheLook}
          />
        </div>

        <p data-admin-form-hint>
          Collections only — every active collection always shows on the full{' '}
          <code>/shop-the-look</code> page regardless of this list; this just controls the curated
          strip on the homepage.
        </p>

        {shopTheLookItems.length === 0 ? (
          <p data-admin-empty>Nothing in the Shop the Look homepage strip yet.</p>
        ) : (
          <SortableItemList
            initialItems={shopTheLookItems}
            reorderAction={reorderShopTheLook}
            removeAction={removeShopTheLook}
          />
        )}

        <AddItemForm
          productOptions={[]}
          collectionOptions={availableCollections('show_on_homepage')}
          action={addShopTheLook}
          emptyMessage="Every active collection is already in the Shop the Look homepage strip."
        />
      </section>
    </div>
  );
}
