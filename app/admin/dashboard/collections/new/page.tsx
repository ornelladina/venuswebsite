import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { createCollection } from '../actions';
import CollectionFormFields from '../CollectionFormFields';

export const dynamic = 'force-dynamic';

async function getCategories() {
  const { data } = await supabase.from('categories').select('id, name').order('display_order');
  return data ?? [];
}

export default async function NewCollectionPage() {
  const categories = await getCategories();

  return (
    <div data-page="admin-product-form">
      <div data-admin-dashboard-header>
        <h1>Add Collection</h1>
        <Link href="/admin/dashboard/collections" data-admin-btn-secondary>
          Back to Collections
        </Link>
      </div>

      <form action={createCollection} data-admin-product-form encType="multipart/form-data">
        <CollectionFormFields categories={categories} />

        <label data-admin-field>
          <span>Cover Photo *</span>
          <input type="file" name="cover_image" accept="image/*" required />
        </label>

        <div data-admin-form-actions>
          <button type="submit" data-admin-btn-primary>
            Create Collection
          </button>
          <p data-admin-form-hint>
            You&rsquo;ll be able to add more photos and pick which products belong to this look
            right after this.
          </p>
        </div>
      </form>
    </div>
  );
}
