'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Server Actions only ever run on the server, so it's safe to use the
// service role key here (same pattern already used by
// app/admin/dashboard/page.tsx and app/api/order-notify/route.ts) — it
// bypasses the RLS policies in supabase/schema.sql, which only allow the
// public to READ products, not write them. This is what lets the admin
// forms below insert/update/delete despite that.
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

// Storage bucket the product photo uploads go into. Must exist already —
// see supabase/STORAGE_SETUP.md for the one-time setup (Supabase Storage
// has no SQL migration path, it's created in the dashboard UI).
const PRODUCT_IMAGES_BUCKET = 'product-images';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

// Reads every product field out of a submitted form. Shared by create and
// update so the two can't drift out of sync with each other.
function readProductFields(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const slugInput = String(formData.get('slug') || '').trim();
  const priceRaw = String(formData.get('price') || '').trim();
  const salePriceRaw = String(formData.get('sale_price') || '').trim();
  const originalPriceRaw = String(formData.get('original_price') || '').trim();
  const skuRaw = String(formData.get('sku') || '').trim();
  const categoryId = String(formData.get('category_id') || '').trim();
  const styleRaw = String(formData.get('style') || '').trim();
  const hasVariations = formData.get('has_variations') === 'on';
  const stockRaw = String(formData.get('stock_quantity') ?? '').trim();

  // Required fields — the form enforces these in the browser too, but this
  // is the real safety net (e.g. if the page was open before an update).
  if (!name) throw new Error('Product name is required.');
  if (!categoryId) throw new Error('Choose a category before saving.');
  if (!styleRaw) throw new Error('Choose a material / type (gold-plated, stainless steel, etc.) before saving.');
  const price = Number(priceRaw);
  if (!priceRaw || !Number.isFinite(price) || price < 0) throw new Error('Enter a price before saving.');

  let stock: number | undefined;
  if (!hasVariations) {
    stock = Number(stockRaw);
    if (!stockRaw || !Number.isInteger(stock) || stock < 0) {
      throw new Error('Enter a stock quantity (a whole number, 0 or more) — or tick "has variations" and set stock on each variation.');
    }
  }

  return {
    hasVariations,
    fields: {
      name,
      slug: slugify(slugInput || name),
      description: String(formData.get('description') || '').trim() || null,
      sku: skuRaw || null,
      category_id: categoryId,
      price,
      sale_price: salePriceRaw ? Number(salePriceRaw) : null,
      original_price: originalPriceRaw ? Number(originalPriceRaw) : null,
      // With variations, the stock lives on each variation, so the product's
      // own number is left exactly as it was instead of being overwritten.
      ...(stock !== undefined ? { stock_quantity: stock } : {}),
      style: styleRaw,
      display_order: Number(formData.get('display_order') || 0),
      is_active: formData.get('is_active') === 'on',
      is_new: formData.get('is_new') === 'on',
      is_featured: formData.get('is_featured') === 'on',
      is_best_seller: formData.get('is_best_seller') === 'on',
      is_set: formData.get('is_set') === 'on',
      is_hamsa_eye: formData.get('is_hamsa_eye') === 'on',
      is_hamsa_eye_home: formData.get('is_hamsa_eye_home') === 'on',
      is_classical: formData.get('is_classical') === 'on',
    },
  };
}

export async function createProduct(formData: FormData) {
  const supabase = adminClient();
  const { fields, hasVariations } = readProductFields(formData);

  const { data, error } = await supabase.from('products').insert(fields).select('id').single();

  if (error) {
    throw new Error(`Could not create product: ${error.message}`);
  }

  revalidatePath('/admin/dashboard/products');
  redirect(`/admin/dashboard/products/${data.id}${hasVariations ? '?addVariations=1' : ''}`);
}

export async function updateProduct(productId: string, formData: FormData) {
  const supabase = adminClient();
  const { fields, hasVariations } = readProductFields(formData);

  // A product that already has variations can't be switched back to "no
  // variations" while those rows still exist — its stock would be ignored.
  if (!hasVariations) {
    const { count } = await supabase
      .from('product_variations')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);
    if (count && count > 0) {
      throw new Error(
        'This product still has variations. Delete them first, or leave "has variations" ticked.'
      );
    }
  }

  const { error } = await supabase
    .from('products')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) {
    throw new Error(`Could not save product: ${error.message}`);
  }

  revalidatePath('/admin/dashboard/products');
  revalidatePath(`/admin/dashboard/products/${productId}`);
  // Keep the live storefront in sync too — product pages/listings are
  // ISR'd (revalidate = 60) but this makes edits show up immediately
  // instead of waiting up to a minute.
  revalidatePath('/shop');
  revalidatePath('/product/[slug]', 'page');
}

export async function deleteProduct(productId: string) {
  const supabase = adminClient();

  // Pull the image URLs first so the storage files can be cleaned up too —
  // deleting the product row cascades and removes the product_images rows
  // (see "on delete cascade" in schema.sql), but that doesn't touch the
  // actual files sitting in Storage.
  const { data: images } = await supabase
    .from('product_images')
    .select('image_url')
    .eq('product_id', productId);

  const paths = (images ?? [])
    .map((img) => extractStoragePath(img.image_url))
    .filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
  }

  const { error } = await supabase.from('products').delete().eq('id', productId);

  if (error) {
    throw new Error(`Could not delete product: ${error.message}`);
  }

  revalidatePath('/admin/dashboard/products');
  redirect('/admin/dashboard/products');
}

// Turns a public Supabase Storage URL back into the bucket-relative path
// Storage needs for a delete call, e.g.
// ".../storage/v1/object/public/product-images/abc/123.jpg" -> "abc/123.jpg".
function extractStoragePath(imageUrl: string): string | null {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return imageUrl.slice(idx + marker.length);
}

// Turns an uploaded file's own name ("Blue_Bracelet-2.jpg") into a
// reasonable starting label ("Blue Bracelet 2") — strips the extension,
// swaps hyphens/underscores for spaces, drops the auto-added
// timestamp/random suffix pattern if the file was re-uploaded from this
// same site once already, and title-cases each word. Just a starting
// point: still fully editable afterward in ImageManager, same as before.
function labelFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[^./\\]+$/, '');
  const cleaned = withoutExtension.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}

export async function addProductImages(productId: string, formData: FormData) {
  const supabase = adminClient();
  const files = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return;
  }

  const { data: existing } = await supabase
    .from('product_images')
    .select('display_order')
    .eq('product_id', productId)
    .order('display_order', { ascending: false })
    .limit(1);

  let nextOrder = existing && existing[0] ? existing[0].display_order + 1 : 0;

  for (const file of files) {
    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: false });

    if (uploadError) {
      throw new Error(
        `Could not upload "${file.name}": ${uploadError.message}. Make sure the "${PRODUCT_IMAGES_BUCKET}" storage bucket exists and is public — see supabase/STORAGE_SETUP.md.`
      );
    }

    const { data: pub } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

    const { error: insertError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: pub.publicUrl,
        display_order: nextOrder,
        label: labelFromFilename(file.name) || null,
      });

    if (insertError) {
      throw new Error(`Could not save "${file.name}": ${insertError.message}`);
    }

    nextOrder++;
  }

  revalidatePath(`/admin/dashboard/products/${productId}`);
  revalidatePath('/admin/dashboard/products');
  revalidatePath('/product/[slug]', 'page');
}

// Persists a new photo order after the admin drags a card to a new spot in
// ImageManager. `orderedImageIds` is the full list of image ids for this
// product, already in the order they should display in (index 0 = main
// image shown on product cards). We just rewrite display_order to match
// that index for every image — no need to know what the order used to be.
export async function reorderProductImages(productId: string, orderedImageIds: string[]) {
  const supabase = adminClient();

  const results = await Promise.all(
    orderedImageIds.map((imageId, index) =>
      supabase.from('product_images').update({ display_order: index }).eq('id', imageId)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(`Could not save photo order: ${failed.error.message}`);
  }

  revalidatePath(`/admin/dashboard/products/${productId}`);
  revalidatePath('/admin/dashboard/products');
  revalidatePath('/shop');
  revalidatePath('/product/[slug]', 'page');
}

// Saves the focal point / zoom / crop mode picked in ImageManager's photo
// editor for a single image. focal_x/focal_y are 0-100 (percent from the
// left/top of the photo) and get combined into the "x% y%" string that
// ProductCard/ProductDetail already read via object-position.
export async function updateProductImage(
  imageId: string,
  productId: string,
  formData: FormData
) {
  const supabase = adminClient();

  const focalX = Number(formData.get('focal_x') ?? 50);
  const focalY = Number(formData.get('focal_y') ?? 50);
  const zoomRaw = Number(formData.get('zoom') ?? 1);
  const objectFit = String(formData.get('object_fit') || 'contain');
  const labelRaw = String(formData.get('label') || '').trim();
  const colorTagRaw = String(formData.get('color_tag') || '').trim();

  const { error } = await supabase
    .from('product_images')
    .update({
      focal_point: `${clampPercent(focalX)}% ${clampPercent(focalY)}%`,
      zoom: clampZoom(zoomRaw),
      object_fit: objectFit === 'cover' ? 'cover' : 'contain',
      label: labelRaw || null,
      color_tag: colorTagRaw || null,
    })
    .eq('id', imageId);

  if (error) {
    throw new Error(`Could not save photo settings: ${error.message}`);
  }

  revalidatePath(`/admin/dashboard/products/${productId}`);
  revalidatePath('/product/[slug]', 'page');
}

function clampPercent(n: number): number {
  if (Number.isNaN(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function clampZoom(n: number): number {
  if (Number.isNaN(n)) return 1;
  return Math.min(3, Math.max(1, Math.round(n * 100) / 100));
}

// Rotates a photo 90° clockwise. Unlike focal point/zoom/crop (which are
// just CSS applied wherever the photo is shown), rotation actually
// re-encodes the image file itself — that way every place this photo
// appears (product cards, the gallery, this admin list) shows it right
// side up automatically, with nothing else in the codebase needing to
// know about rotation.
export async function rotateProductImage(imageId: string, productId: string) {
  const supabase = adminClient();

  const { data: image } = await supabase
    .from('product_images')
    .select('image_url')
    .eq('id', imageId)
    .single();

  if (!image) {
    throw new Error('Could not find that photo.');
  }

  const path = extractStoragePath(image.image_url);
  if (!path) {
    throw new Error('Could not locate that photo in storage.');
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .download(path);

  if (downloadError || !fileData) {
    throw new Error(`Could not read the photo: ${downloadError?.message ?? 'unknown error'}`);
  }

  const sharp = (await import('sharp')).default;
  const inputBuffer = Buffer.from(await fileData.arrayBuffer());
  const rotatedBuffer = await sharp(inputBuffer).rotate(90).toBuffer();

  // Saved as a new file (same convention as replacing a cover photo
  // elsewhere) rather than overwriting the old one in place — that
  // guarantees the browser/CDN can't keep showing a cached, un-rotated
  // copy at the same URL.
  const extension = path.includes('.') ? path.split('.').pop() : 'jpg';
  const newPath = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(newPath, rotatedBuffer, { contentType: fileData.type || 'image/jpeg', upsert: false });

  if (uploadError) {
    throw new Error(`Could not save the rotated photo: ${uploadError.message}`);
  }

  const { data: pub } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(newPath);

  const { error: updateError } = await supabase
    .from('product_images')
    .update({ image_url: pub.publicUrl })
    .eq('id', imageId);

  if (updateError) {
    throw new Error(`Could not save the rotated photo: ${updateError.message}`);
  }

  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);

  revalidatePath(`/admin/dashboard/products/${productId}`);
  revalidatePath('/admin/dashboard/products');
  revalidatePath('/shop');
  revalidatePath('/');
  revalidatePath('/product/[slug]', 'page');

  return { image_url: pub.publicUrl };
}

export async function deleteProductImage(imageId: string, productId: string) {
  const supabase = adminClient();

  const { data: image } = await supabase
    .from('product_images')
    .select('image_url')
    .eq('id', imageId)
    .single();

  if (image) {
    const path = extractStoragePath(image.image_url);
    if (path) {
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
    }
  }

  const { error } = await supabase.from('product_images').delete().eq('id', imageId);

  if (error) {
    throw new Error(`Could not remove photo: ${error.message}`);
  }

  revalidatePath(`/admin/dashboard/products/${productId}`);
  revalidatePath('/product/[slug]', 'page');
}

export async function addVariation(productId: string, formData: FormData) {
  const supabase = adminClient();

  const variationType = String(formData.get('variation_type') || '').trim();
  const variationValue = String(formData.get('variation_value') || '').trim();

  if (!variationType || !variationValue) {
    throw new Error('Both a variation type (e.g. "Color") and value (e.g. "Gold") are required.');
  }

  const stockRaw = String(formData.get('stock_quantity') ?? '').trim();
  const stockNumber = Number(stockRaw);
  if (!stockRaw || !Number.isInteger(stockNumber) || stockNumber < 0) {
    throw new Error('Stock is required for every variation — a whole number, 0 or more.');
  }

  const priceOverrideRaw = String(formData.get('price_override') || '').trim();
  const skuRaw = String(formData.get('sku') || '').trim();

  const { error } = await supabase.from('product_variations').insert({
    product_id: productId,
    variation_type: variationType,
    variation_value: variationValue,
    price_override: priceOverrideRaw ? Number(priceOverrideRaw) : null,
    stock_quantity: stockNumber,
    sku: skuRaw || null,
    display_order: Number(formData.get('display_order') || 0),
  });

  if (error) {
    throw new Error(`Could not add variation: ${error.message}`);
  }

  revalidatePath(`/admin/dashboard/products/${productId}`);
  revalidatePath('/product/[slug]', 'page');
}

export async function updateVariation(variationId: string, productId: string, formData: FormData) {
  const supabase = adminClient();

  const variationType = String(formData.get('variation_type') || '').trim();
  const variationValue = String(formData.get('variation_value') || '').trim();

  if (!variationType || !variationValue) {
    throw new Error('Both a variation type (e.g. "Color") and value (e.g. "Gold") are required.');
  }

  const stockRaw = String(formData.get('stock_quantity') ?? '').trim();
  const stockNumber = Number(stockRaw);
  if (!stockRaw || !Number.isInteger(stockNumber) || stockNumber < 0) {
    throw new Error('Stock is required for every variation — a whole number, 0 or more.');
  }

  const priceOverrideRaw = String(formData.get('price_override') || '').trim();
  const skuRaw = String(formData.get('sku') || '').trim();

  const { error } = await supabase
    .from('product_variations')
    .update({
      variation_type: variationType,
      variation_value: variationValue,
      price_override: priceOverrideRaw ? Number(priceOverrideRaw) : null,
      stock_quantity: stockNumber,
      sku: skuRaw || null,
      display_order: Number(formData.get('display_order') || 0),
    })
    .eq('id', variationId);

  if (error) {
    throw new Error(`Could not save variation: ${error.message}`);
  }

  revalidatePath(`/admin/dashboard/products/${productId}`);
  revalidatePath('/product/[slug]', 'page');
}

export async function deleteVariation(variationId: string, productId: string) {
  const supabase = adminClient();
  const { error } = await supabase.from('product_variations').delete().eq('id', variationId);

  if (error) {
    throw new Error(`Could not remove variation: ${error.message}`);
  }

  revalidatePath(`/admin/dashboard/products/${productId}`);
  revalidatePath('/product/[slug]', 'page');
}

// ---- Restock (see /admin/dashboard/sold-out) ----
// Both of these touch ONLY stock_quantity — unlike updateProduct/
// updateVariation above, which rewrite every field on the row from a full
// edit form. That full-form path would be the wrong one to reuse here:
// the sold-out page only ever has a quantity number in hand, not the
// product's name/price/etc., so calling updateProduct from here would
// blank those out. These two are what the sold-out page's restock inputs
// actually call.

export async function restockProduct(productId: string, quantity: number) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error('Enter a quantity of 0 or more.');
  }
  const supabase = adminClient();
  const { error } = await supabase
    .from('products')
    .update({ stock_quantity: Math.floor(quantity), updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) throw new Error(`Could not update stock: ${error.message}`);

  revalidatePath('/admin/dashboard/sold-out');
  revalidatePath('/admin/dashboard/products');
  revalidatePath(`/admin/dashboard/products/${productId}`);
  revalidatePath('/shop');
  revalidatePath('/product/[slug]', 'page');
}

export async function restockVariation(variationId: string, productId: string, quantity: number) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error('Enter a quantity of 0 or more.');
  }
  const supabase = adminClient();
  const { error } = await supabase
    .from('product_variations')
    .update({ stock_quantity: Math.floor(quantity) })
    .eq('id', variationId);

  if (error) throw new Error(`Could not update stock: ${error.message}`);

  revalidatePath('/admin/dashboard/sold-out');
  revalidatePath('/admin/dashboard/products');
  revalidatePath(`/admin/dashboard/products/${productId}`);
  revalidatePath('/product/[slug]', 'page');
}
