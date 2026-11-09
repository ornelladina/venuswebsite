import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import SignOutButton from '../SignOutButton';
import { STYLES } from '@/lib/styles';
import ProductSearchList from './ProductSearchList';

export const dynamic = 'force-dynamic';

async function getProducts() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data } = await supabaseAdmin
    .from('products')
    .select(
      '*, categories(name), product_images(image_url, display_order), product_variations(id, variation_type, variation_value, stock_quantity, display_order)'
    )
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .order('display_order', { foreignTable: 'product_variations', ascending: true })
    .order('created_at', { ascending: false });

  return data ?? [];
}

async function getCategories() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data } = await supabaseAdmin.from('categories').select('*').order('display_order');
  return data ?? [];
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { style?: string; category?: string; group?: string };
}) {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  // Groups the same "style" (material) column already set per-product via
  // the checkbox/dropdown on each product's own edit page — nothing new to
  // set up, this just re-sorts what's already there. Order matches the
  // dropdown order in lib/styles.ts, with untagged products last.
  const styleGroups = [
    ...STYLES.map((s) => ({
      key: s.slug,
      label: s.tabLabel,
      items: products.filter((p: any) => p.style === s.value),
    })),
    {
      key: 'none',
      label: 'No Style Set',
      items: products.filter((p: any) => !p.style),
    },
  ];

  // Same idea, but by Category (Rings, Bracelets, Necklaces...) — one
  // section per category, in the same order as your Shop page's category
  // list, with anything uncategorized last.
  const categoryGroups = [
    ...categories.map((c: any) => ({
      key: c.slug,
      label: c.name,
      items: products.filter((p: any) => p.category_id === c.id),
    })),
    {
      key: 'none',
      label: 'Uncategorized',
      items: products.filter((p: any) => !p.category_id),
    },
  ];

  // Two independent ways to slice the same list — pick one at a time via
  // the "By Style" / "By Category" toggle, then optionally jump to just
  // one group within whichever is active.
  const groupBy = searchParams?.group === 'category' ? 'category' : 'style';
  const groups = groupBy === 'category' ? categoryGroups : styleGroups;
  const activeKey = groupBy === 'category' ? searchParams?.category : searchParams?.style;
  const activeGroup = groups.find((g) => g.key === activeKey);
  const visibleGroups = activeGroup ? [activeGroup] : groups;
  const groupParamName = groupBy === 'category' ? 'category' : 'style';

  return (
    <div data-page="admin-products">
      <div data-admin-dashboard-header>
        <h1>Products ({products.length})</h1>
        <div data-admin-header-actions>
          <Link href="/admin/dashboard" data-admin-btn-secondary>
            Orders
          </Link>
          <Link href="/admin/dashboard/sold-out" data-admin-btn-secondary>
            Sold Out
          </Link>
          <Link href="/admin/dashboard/collections" data-admin-btn-secondary>
            Collections
          </Link>
          <Link href="/admin/dashboard/homepage" data-admin-btn-secondary>
            Homepage Sections
          </Link>
          <Link href="/admin/dashboard/products/new" data-admin-btn-primary>
            + Add Product
          </Link>
          <SignOutButton />
        </div>
      </div>

      {products.length === 0 && (
        <p data-admin-empty>No products yet — add your first one to get started.</p>
      )}

      {products.length > 0 && (
        <>
          <p data-admin-form-hint>
            Grouped by Style or by Category — whichever you pick below. Style comes from the Style
            field on each product&rsquo;s edit page; Category comes from the Category dropdown there.
            Jump to just one group, or view All to see everything grouped together.
          </p>

          <div data-admin-style-filter>
            <Link
              href="/admin/dashboard/products?group=style"
              {...(groupBy === 'style' ? { 'data-admin-btn-primary': true } : { 'data-admin-btn-secondary': true })}
            >
              By Style
            </Link>
            <Link
              href="/admin/dashboard/products?group=category"
              {...(groupBy === 'category' ? { 'data-admin-btn-primary': true } : { 'data-admin-btn-secondary': true })}
            >
              By Category
            </Link>
          </div>

          <div data-admin-style-filter>
            <Link
              href={`/admin/dashboard/products?group=${groupBy}`}
              {...(!activeGroup ? { 'data-admin-btn-primary': true } : { 'data-admin-btn-secondary': true })}
            >
              All ({products.length})
            </Link>
            {groups.map((g) => (
              <Link
                key={g.key}
                href={`/admin/dashboard/products?group=${groupBy}&${groupParamName}=${g.key}`}
                {...(activeKey === g.key
                  ? { 'data-admin-btn-primary': true }
                  : { 'data-admin-btn-secondary': true })}
              >
                {g.label} ({g.items.length})
              </Link>
            ))}
          </div>

          <ProductSearchList groups={visibleGroups} showGroupHeaders={!activeGroup} />
        </>
      )}
    </div>
  );
}
