'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

// Reuses the same bucket product photos already upload into, just under a
// "collections/" prefix — so there's no second Storage bucket to create by
// hand. See supabase/STORAGE_SETUP.md.
const IMAGES_BUCKET = 'product-images';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

function extractStoragePath(imageUrl: string): string | null {
  const marker = `/storage/v1/object/public/${IMAGES_BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return imageUrl.slice(idx + marker.length);
}

async function uploadImage(
  supabase: ReturnType<typeof adminClient>,
  file: File,
  folder: string
): Promise<string> {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: false });

  if (uploadError) {
    throw new Error(
      `Could not upload "${file.name}": ${uploadError.message}. Make sure the "${IMAGES_BUCKET}" storage bucket exists and is public — see supabase/STORAGE_SETUP.md.`
    );
  }

  const { data: pub } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

// Reads every collection field out of a submitted form. Shared by create
// and update so the two can't drift out of sync with each other.
function readCollectionFields(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const slugInput = String(formData.get('slug') || '').trim();
  const categoryId = String(formData.get('category_id') || '').trim();
  const styleRaw = String(formData.get('style') || '').trim();

  return {
    name,
    slug: slugify(slugInput || name),
    category_id: categoryId || null,
    style: styleRaw || null,
    display_order: Number(formData.get('display_order') || 0),
    is_active: formData.get('is_active') === 'on',
    show_on_homepage: formData.get('show_on_homepage') === 'on',
    is_featured: formData.get('is_featured') === 'on',
    is_best_seller: formData.get('is_best_seller') === 'on',
    is_hamsa_eye: formData.get('is_hamsa_eye') === 'on',
    is_hamsa_eye_home: formData.get('is_hamsa_eye_home') === 'on',
  };
}

// Collections require a cover photo from the moment they exist (the
// storefront's collection card/page has nowhere to fall back to without
// one), so — unlike products, where photos get added after creation on the
// edit page — the cover upload happens right here in the same submit as
// creating the row.
export async function createCollection(formData: FormData) {
  const supabase = adminClient();
  const fields = readCollectionFields(formData);

  if (!fields.name) {
    throw new Error('Collection name is required.');
  }

  const coverFile = formData.get('cover_image');
  if (!(coverFile instanceof File) || coverFile.size === 0) {
    throw new Error('A cover photo is required to create a collection.');
  }

  const coverUrl = await uploadImage(supabase, coverFile, 'collections');

  const { data, error } = await supabase
    .from('collections')
    .insert({ ...fields, cover_image_url: coverUrl })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Could not create collection: ${error.message}`);
  }

  revalidatePath('/admin/dashboard/collections');
  redirect(`/admin/dashboard/collections/${data.id}`);
}

export async function toggleCollectionHomepage(collectionId: string, nextValue: boolean) {
  const supabase = adminClient();

  const update: Record<string, unknown> = { show_on_homepage: nextValue };

  // Turning it on: give it a proper spot at the top of the Shop the Look
  // order instead of leaving shop_the_look_order at its column default
  // (0), which would land it on top of — or overlapping — whatever
  // already has that same default. Turning off doesn't need this; the
  // order value just stops being used once show_on_homepage is false.
  if (nextValue) {
    const { data } = await supabase
      .from('collections')
      .select('shop_the_look_order')
      .eq('show_on_homepage', true)
      .order('shop_the_look_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    const lowest = (data as any)?.shop_the_look_order;
    update.shop_the_look_order = typeof lowest === 'number' ? lowest - 1 : 0;
  }

  const { error } = await supabase.from('collections').update(update).eq('id', collectionId);

  if (error) {
    throw new Error(`Could not update "Shop the Look" visibility: ${error.message}`);
  }

  revalidatePath('/admin/dashboard/collections');
  revalidatePath('/admin/dashboard/homepage');
  revalidatePath('/shop-the-look');
}

export async function updateCollection(collectionId: string, formData: FormData) {
  const supabase = adminClient();
  const fields = readCollectionFields(formData);

  if (!fields.name) {
    throw new Error('Collection name is required.');
  }

  const { error } = await supabase.from('collections').update(fields).eq('id', collectionId);

  if (error) {
    throw new Error(`Could not save collection: ${error.message}`);
  }

  revalidatePath('/admin/dashboard/collections');
  revalidatePath(`/admin/dashboard/collections/${collectionId}`);
  revalidatePath('/collection/[slug]', 'page');
  revalidatePath('/shop-the-look');
  revalidatePath('/collections');
}

export async function replaceCollectionCover(collectionId: string, formData: FormData) {
  const supabase = adminClient();
  const file = formData.get('cover_image');

  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const { data: existing } = await supabase
    .from('collections')
    .select('cover_image_url')
    .eq('id', collectionId)
    .single();

  const newUrl = await uploadImage(supabase, file, 'collections');

  const { error } = await supabase
    .from('collections')
    .update({ cover_image_url: newUrl })
    .eq('id', collectionId);

  if (error) {
    throw new Error(`Could not save cover photo: ${error.message}`);
  }

  if (existing?.cover_image_url) {
    const oldPath = extractStoragePath(existing.cover_image_url);
    if (oldPath) {
      await supabase.storage.from(IMAGES_BUCKET).remove([oldPath]);
    }
  }

  revalidatePath('/admin/dashboard/collections');
  revalidatePath(`/admin/dashboard/collections/${collectionId}`);
  revalidatePath('/collection/[slug]', 'page');
}

export async function deleteCollection(collectionId: string) {
  const supabase = adminClient();

  const { data: collection } = await supabase
    .from('collections')
    .select('cover_image_url')
    .eq('id', collectionId)
    .single();

  const { data: extraImages } = await supabase
    .from('collection_images')
    .select('image_url')
    .eq('collection_id', collectionId);

  const paths = [collection?.cover_image_url, ...(extraImages ?? []).map((i) => i.image_url)]
    .filter((url): url is string => Boolean(url))
    .map((url) => extractStoragePath(url))
    .filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    await supabase.storage.from(IMAGES_BUCKET).remove(paths);
  }

  const { error } = await supabase.from('collections').delete().eq('id', collectionId);

  if (error) {
    throw new Error(`Could not delete collection: ${error.message}`);
  }

  revalidatePath('/admin/dashboard/collections');
  redirect('/admin/dashboard/collections');
}

// ---------- Extra photos (collection_images) ----------

export async function addCollectionImages(collectionId: string, formData: FormData) {
  const supabase = adminClient();
  const files = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return;
  }

  const { data: existing } = await supabase
    .from('collection_images')
    .select('display_order')
    .eq('collection_id', collectionId)
    .order('display_order', { ascending: false })
    .limit(1);

  let nextOrder = existing && existing[0] ? existing[0].display_order + 1 : 0;

  for (const file of files) {
    const url = await uploadImage(supabase, file, 'collections');
    const { error } = await supabase
      .from('collection_images')
      .insert({ collection_id: collectionId, image_url: url, display_order: nextOrder });

    if (error) {
      throw new Error(`Could not save "${file.name}": ${error.message}`);
    }
    nextOrder++;
  }

  revalidatePath(`/admin/dashboard/collections/${collectionId}`);
  revalidatePath('/collection/[slug]', 'page');
}

export async function reorderCollectionImages(collectionId: string, orderedImageIds: string[]) {
  const supabase = adminClient();

  const results = await Promise.all(
    orderedImageIds.map((imageId, index) =>
      supabase.from('collection_images').update({ display_order: index }).eq('id', imageId)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(`Could not save photo order: ${failed.error.message}`);
  }

  revalidatePath(`/admin/dashboard/collections/${collectionId}`);
  revalidatePath('/collection/[slug]', 'page');
}

export async function deleteCollectionImage(imageId: string, collectionId: string) {
  const supabase = adminClient();

  const { data: image } = await supabase
    .from('collection_images')
    .select('image_url')
    .eq('id', imageId)
    .single();

  if (image) {
    const path = extractStoragePath(image.image_url);
    if (path) {
      await supabase.storage.from(IMAGES_BUCKET).remove([path]);
    }
  }

  const { error } = await supabase.from('collection_images').delete().eq('id', imageId);

  if (error) {
    throw new Error(`Could not remove photo: ${error.message}`);
  }

  revalidatePath(`/admin/dashboard/collections/${collectionId}`);
  revalidatePath('/collection/[slug]', 'page');
}

// ---------- Products in this collection/look (collection_products) ----------

export async function addCollectionProduct(collectionId: string, formData: FormData) {
  const supabase = adminClient();
  const productId = String(formData.get('product_id') || '').trim();

  if (!productId) {
    throw new Error('Pick a product to add.');
  }

  const { data: existing } = await supabase
    .from('collection_products')
    .select('display_order')
    .eq('collection_id', collectionId)
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing[0] ? existing[0].display_order + 1 : 0;

  const { error } = await supabase
    .from('collection_products')
    .insert({ collection_id: collectionId, product_id: productId, display_order: nextOrder });

  if (error) {
    throw new Error(`Could not add product: ${error.message}`);
  }

  revalidatePath(`/admin/dashboard/collections/${collectionId}`);
  revalidatePath('/collection/[slug]', 'page');
}

export async function updateCollectionProductOrder(
  rowId: string,
  collectionId: string,
  formData: FormData
) {
  const supabase = adminClient();
  const displayOrder = Number(formData.get('display_order') || 0);

  const { error } = await supabase
    .from('collection_products')
    .update({ display_order: displayOrder })
    .eq('id', rowId);

  if (error) {
    throw new Error(`Could not save order: ${error.message}`);
  }

  revalidatePath(`/admin/dashboard/collections/${collectionId}`);
  revalidatePath('/collection/[slug]', 'page');
}

export async function removeCollectionProduct(rowId: string, collectionId: string) {
  const supabase = adminClient();
  const { error } = await supabase.from('collection_products').delete().eq('id', rowId);

  if (error) {
    throw new Error(`Could not remove product: ${error.message}`);
  }

  revalidatePath(`/admin/dashboard/collections/${collectionId}`);
  revalidatePath('/collection/[slug]', 'page');
}

// Which of this product's own photos shows on its card within THIS
// collection (e.g. the blue variation's photo, for a look that's
// specifically styled in blue) — see
// supabase/migration_collection_product_image.sql. An empty selection
// clears it back to the product's normal default photo.
export async function updateCollectionProductImage(
  rowId: string,
  collectionId: string,
  formData: FormData
) {
  const supabase = adminClient();
  const raw = String(formData.get('featured_image_id') || '').trim();

  const { error } = await supabase
    .from('collection_products')
    .update({ featured_image_id: raw === '' ? null : raw })
    .eq('id', rowId);

  if (error) {
    throw new Error(`Could not save that photo choice: ${error.message}`);
  }

  revalidatePath(`/admin/dashboard/collections/${collectionId}`);
  revalidatePath('/collection/[slug]', 'page');
}
