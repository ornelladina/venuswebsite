import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import DeleteCollectionButton from './DeleteCollectionButton';
import HomepageToggle from './HomepageToggle';
import SignOutButton from '../SignOutButton';

export const dynamic = 'force-dynamic';

async function getCollections() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data } = await supabaseAdmin
    .from('collections')
    .select('*, categories(name), collection_products(id)')
    .order('display_order', { ascending: true });

  return data ?? [];
}

export default async function AdminCollectionsPage() {
  const collections = await getCollections();

  return (
    <div data-page="admin-products">
      <div data-admin-dashboard-header>
        <h1>Collections ({collections.length})</h1>
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
          <Link href="/admin/dashboard/homepage" data-admin-btn-secondary>
            Homepage Sections
          </Link>
          <Link href="/admin/dashboard/collections/new" data-admin-btn-primary>
            + Add Collection
          </Link>
          <SignOutButton />
        </div>
      </div>

      <p data-admin-form-hint>
        Collections power &ldquo;Shop The Look&rdquo; — a curated group of products shown
        together, with its own cover photo and page.
      </p>

      {collections.length === 0 && (
        <p data-admin-empty>No collections yet — add your first one to get started.</p>
      )}

      <div data-admin-product-list>
        {collections.map((c: any) => (
          <div key={c.id} data-admin-product-row>
            <div data-admin-product-thumb>
              {c.cover_image_url ? (
                <Image src={c.cover_image_url} alt={c.name} width={64} height={64} />
              ) : (
                <div data-admin-order-item-noimage>No photo</div>
              )}
            </div>

            <div data-admin-product-info>
              <p data-admin-product-name>{c.name}</p>
              <p data-admin-product-meta>
                {c.categories?.name ?? 'No category'} · {c.collection_products?.length ?? 0}{' '}
                product{c.collection_products?.length === 1 ? '' : 's'}
              </p>
              <div data-admin-product-badges>
                {!c.is_active && <span data-admin-badge data-admin-badge-muted>Hidden</span>}
              </div>
              <HomepageToggle collectionId={c.id} initialValue={c.show_on_homepage ?? false} />
            </div>

            <div data-admin-product-actions>
              <Link href={`/admin/dashboard/collections/${c.id}`} data-admin-btn-secondary>
                Edit
              </Link>
              <DeleteCollectionButton id={c.id} name={c.name} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
