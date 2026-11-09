import { redirect, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/**
 * Cart and checkout line items always have a stable product_id, but only
 * items added after slug-tracking was introduced also carry a `slug`.
 * Rather than leaving older cart items un-clickable, every "view product"
 * link from the cart/checkout goes through here: it looks the id up and
 * redirects to the canonical `/product/[slug]` page. This keeps the real
 * product page slug-based (better for SEO/URLs) while making every cart
 * item clickable regardless of when it was added.
 */
export default async function ProductByIdRedirect({ params }: { params: { id: string } }) {
  const { data } = await supabase
    .from('products')
    .select('slug')
    .eq('id', params.id)
    .eq('is_active', true)
    .single();

  if (!data?.slug) notFound();

  redirect(`/product/${data.slug}`);
}
