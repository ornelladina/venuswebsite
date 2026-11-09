import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { createProduct } from '../actions';
import ProductFormFields from '../ProductFormFields';

export const dynamic = 'force-dynamic';

async function getCategories() {
  const { data } = await supabase.from('categories').select('id, name').order('display_order');
  return data ?? [];
}

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div data-page="admin-product-form">
      <div data-admin-dashboard-header>
        <h1>Add Product</h1>
        <Link href="/admin/dashboard/products" data-admin-btn-secondary>
          Back to Products
        </Link>
      </div>

      <form action={createProduct} data-admin-product-form>
        <ProductFormFields categories={categories} />
        <div data-admin-form-actions>
          <button type="submit" data-admin-btn-primary>
            Create Product
          </button>
          <p data-admin-form-hint>
            Fields marked * are required. You&rsquo;ll add photos (and variations, if you ticked the box) right after this.
          </p>
        </div>
      </form>
    </div>
  );
}
