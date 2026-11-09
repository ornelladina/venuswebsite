'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

// Both sections are just the is_best_seller / is_featured booleans already
// on the products and collections tables (see ProductFormFields.tsx /
// CollectionFormFields.tsx) — this page is a dedicated place to flip them
// without opening each product/collection's own edit page one at a time.
function revalidateHomepage() {
  revalidatePath('/admin/dashboard/homepage');
  revalidatePath('/admin/dashboard/products');
  revalidatePath('/admin/dashboard/collections');
  revalidatePath('/');
  revalidatePath('/best-sellers');
  revalidatePath('/collection/[slug]', 'page');
}

// Every item id passed around this section is "product:<uuid>" or
// "collection:<uuid>" (see AddItemForm.tsx / SortableItemList.tsx) — one
// shared format so products and collections can sit in a single
// drag-reorderable list per section. This splits it back apart.
function parseItemId(itemId: string): { kind: 'product' | 'collection'; id: string } {
  const [kind, id] = itemId.split(':');
  if ((kind !== 'product' && kind !== 'collection') || !id) {
    throw new Error(`Invalid item id: ${itemId}`);
  }
  return { kind, id };
}

function tableFor(kind: 'product' | 'collection') {
  return kind === 'product' ? 'products' : 'collections';
}

// Ascending order means the smallest number sits first/"on top" — so to
// make a newly-added item land at the top of its list, it needs a number
// one lower than whatever's currently lowest there (checked across BOTH
// products and collections in that section, since they share one visual
// order), or just 0 if the section is empty.
async function nextTopOrder(
  supabase: ReturnType<typeof adminClient>,
  column: 'featured_order' | 'best_seller_order' | 'hamsa_eye_home_order',
  flagColumn: 'is_featured' | 'is_best_seller' | 'is_hamsa_eye_home'
): Promise<number> {
  const [productsResult, collectionsResult] = await Promise.all([
    supabase.from('products').select(column).eq(flagColumn, true).order(column, { ascending: true }).limit(1).maybeSingle(),
    supabase
      .from('collections')
      .select(column)
      .eq(flagColumn, true)
      .order(column, { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const lowestProduct = (productsResult.data as any)?.[column];
  const lowestCollection = (collectionsResult.data as any)?.[column];
  const candidates = [lowestProduct, lowestCollection].filter((n): n is number => typeof n === 'number');

  return candidates.length > 0 ? Math.min(...candidates) - 1 : 0;
}

async function addItem(
  formData: FormData,
  orderColumn: 'featured_order' | 'best_seller_order' | 'hamsa_eye_home_order',
  flagColumn: 'is_featured' | 'is_best_seller' | 'is_hamsa_eye_home'
) {
  const itemId = String(formData.get('item_id') || '').trim();
  if (!itemId) throw new Error('Pick a product or collection to add.');
  const { kind, id } = parseItemId(itemId);

  const supabase = adminClient();
  const order = await nextTopOrder(supabase, orderColumn, flagColumn);
  const update: Record<string, unknown> = { [flagColumn]: true, [orderColumn]: order };
  // Hamsa & Eye Home is a curated subset of the full Hamsa & Eye
  // collection (is_hamsa_eye) — showing something on the homepage strip
  // without it also being a member of that collection wouldn't make
  // sense, so adding here turns both on.
  if (flagColumn === 'is_hamsa_eye_home') {
    update.is_hamsa_eye = true;
  }
  const { error } = await supabase.from(tableFor(kind)).update(update).eq('id', id);

  if (error) throw new Error(`Could not add item: ${error.message}`);
  revalidateHomepage();
}

async function removeItem(itemId: string, flagColumn: 'is_featured' | 'is_best_seller' | 'is_hamsa_eye_home') {
  const { kind, id } = parseItemId(itemId);
  const supabase = adminClient();
  const { error } = await supabase.from(tableFor(kind)).update({ [flagColumn]: false }).eq('id', id);

  if (error) throw new Error(`Could not remove item: ${error.message}`);
  revalidateHomepage();
}

async function removeAllItems(flagColumn: 'is_featured' | 'is_best_seller' | 'is_hamsa_eye_home') {
  const supabase = adminClient();
  const [productsResult, collectionsResult] = await Promise.all([
    supabase.from('products').update({ [flagColumn]: false }).eq(flagColumn, true),
    supabase.from('collections').update({ [flagColumn]: false }).eq(flagColumn, true),
  ]);

  if (productsResult.error) throw new Error(`Could not clear this section: ${productsResult.error.message}`);
  if (collectionsResult.error) throw new Error(`Could not clear this section: ${collectionsResult.error.message}`);
  revalidateHomepage();
}

// orderedItemIds is the full section list in its new order after a drag —
// each item's order column becomes its index in that list (0 = top),
// whether it's a product or a collection.
async function reorderItems(
  orderedItemIds: string[],
  orderColumn: 'featured_order' | 'best_seller_order' | 'hamsa_eye_home_order'
) {
  const supabase = adminClient();
  const results = await Promise.all(
    orderedItemIds.map((itemId, index) => {
      const { kind, id } = parseItemId(itemId);
      return supabase.from(tableFor(kind)).update({ [orderColumn]: index }).eq('id', id);
    })
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Could not save the new order: ${failed.error.message}`);
  revalidateHomepage();
}

// ---------- Best Sellers ----------

export async function addBestSeller(formData: FormData) {
  return addItem(formData, 'best_seller_order', 'is_best_seller');
}

export async function reorderBestSellers(orderedItemIds: string[]) {
  return reorderItems(orderedItemIds, 'best_seller_order');
}

export async function removeBestSeller(itemId: string) {
  return removeItem(itemId, 'is_best_seller');
}

export async function removeAllBestSellers() {
  return removeAllItems('is_best_seller');
}

// ---------- Featured Items ----------

export async function addFeatured(formData: FormData) {
  return addItem(formData, 'featured_order', 'is_featured');
}

export async function reorderFeatured(orderedItemIds: string[]) {
  return reorderItems(orderedItemIds, 'featured_order');
}

export async function removeFeatured(itemId: string) {
  return removeItem(itemId, 'is_featured');
}

export async function removeAllFeatured() {
  return removeAllItems('is_featured');
}

// ---------- Hamsa & Eye (homepage strip) ----------
// is_hamsa_eye_home is a curated subset of is_hamsa_eye (full /hamsa-eye
// page membership) — see supabase/migration_hamsa_eye_home.sql. Adding an
// item here turns both flags on (handled in addItem above); removing only
// turns is_hamsa_eye_home off, so the item stays on the full /hamsa-eye
// page, same "doesn't delete it, just stops showing here" behavior as
// every other section on this page.

export async function addHamsaEyeHome(formData: FormData) {
  return addItem(formData, 'hamsa_eye_home_order', 'is_hamsa_eye_home');
}

export async function reorderHamsaEyeHome(orderedItemIds: string[]) {
  return reorderItems(orderedItemIds, 'hamsa_eye_home_order');
}

export async function removeHamsaEyeHome(itemId: string) {
  return removeItem(itemId, 'is_hamsa_eye_home');
}

export async function removeAllHamsaEyeHome() {
  return removeAllItems('is_hamsa_eye_home');
}

// ---------- Shop the Look (homepage strip) ----------
// Collections-only — show_on_homepage only exists on the collections
// table (there's no "shop the look" flag for individual products), so
// this doesn't reuse the generic products+collections helpers above.

async function nextTopShopTheLookOrder(supabase: ReturnType<typeof adminClient>): Promise<number> {
  const { data } = await supabase
    .from('collections')
    .select('shop_the_look_order')
    .eq('show_on_homepage', true)
    .order('shop_the_look_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  const lowest = (data as any)?.shop_the_look_order;
  return typeof lowest === 'number' ? lowest - 1 : 0;
}

export async function addShopTheLook(formData: FormData) {
  const itemId = String(formData.get('item_id') || '').trim();
  if (!itemId) throw new Error('Pick a collection to add.');
  const { kind, id } = parseItemId(itemId);
  if (kind !== 'collection') throw new Error('Only collections can be added to Shop the Look.');

  const supabase = adminClient();
  const order = await nextTopShopTheLookOrder(supabase);
  const { error } = await supabase
    .from('collections')
    .update({ show_on_homepage: true, shop_the_look_order: order })
    .eq('id', id);

  if (error) throw new Error(`Could not add collection: ${error.message}`);
  revalidateHomepage();
}

export async function reorderShopTheLook(orderedItemIds: string[]) {
  const supabase = adminClient();
  const results = await Promise.all(
    orderedItemIds.map((itemId, index) => {
      const { id } = parseItemId(itemId);
      return supabase.from('collections').update({ shop_the_look_order: index }).eq('id', id);
    })
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Could not save the new order: ${failed.error.message}`);
  revalidateHomepage();
}

export async function removeShopTheLook(itemId: string) {
  const { id } = parseItemId(itemId);
  const supabase = adminClient();
  const { error } = await supabase.from('collections').update({ show_on_homepage: false }).eq('id', id);

  if (error) throw new Error(`Could not remove collection: ${error.message}`);
  revalidateHomepage();
}

export async function removeAllShopTheLook() {
  const supabase = adminClient();
  const { error } = await supabase
    .from('collections')
    .update({ show_on_homepage: false })
    .eq('show_on_homepage', true);

  if (error) throw new Error(`Could not clear this section: ${error.message}`);
  revalidateHomepage();
}

// The small uppercase line under the "Featured Items" heading on the
// homepage (site_settings.featured_subtitle — see
// supabase/migration_featured_subtitle.sql). Same singleton-row update
// pattern as the hero slideshow settings in
// app/admin/dashboard/homepage/images/actions.ts.
export async function updateFeaturedSubtitle(formData: FormData) {
  const text = String(formData.get('featured_subtitle') ?? '').trim();
  if (!text) throw new Error('Subtitle can\'t be empty.');

  const supabase = adminClient();
  const { error } = await supabase.from('site_settings').update({ featured_subtitle: text }).eq('id', true);

  if (error) throw new Error(error.message);
  revalidateHomepage();
}
