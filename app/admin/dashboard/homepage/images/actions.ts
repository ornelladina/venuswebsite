'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Same pattern as app/admin/dashboard/products/actions.ts — Server
// Actions only run on the server, so the service role key is safe here;
// it's what lets this bypass the read-only RLS policies on categories/
// site_settings.
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

// Same storage bucket the old hardcoded hero/category photos already
// live in — nothing new to set up in Supabase for this.
const BUCKET = 'site-assets';

async function uploadFile(file: File, prefix: string): Promise<string> {
  const supabase = adminClient();
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  // Every upload gets its own generated filename (unlike the old
  // fixed-filename convention), so there's never a stale-cache problem —
  // it's always a brand new URL, nothing to bump a "?v=" on.
  const path = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: false });

  if (error) {
    throw new Error(
      `Could not upload "${file.name}": ${error.message}. Make sure the "${BUCKET}" storage bucket exists and is public.`
    );
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

type HeroSlot =
  | 'hero_desktop_1'
  | 'hero_desktop_2'
  | 'hero_desktop_3'
  | 'hero_mobile_1'
  | 'hero_mobile_2'
  | 'hero_mobile_3';

export async function updateHeroPhoto(slot: HeroSlot, formData: FormData) {
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) throw new Error('Choose a photo first.');

  const url = await uploadFile(file, slot);
  const supabase = adminClient();
  const { error } = await supabase
    .from('site_settings')
    .update({ [slot]: url })
    .eq('id', true);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/admin/dashboard/homepage/images');
  return url;
}

export async function updateHeroPosition(
  breakpoint: 'desktop' | 'mobile',
  position: string,
  zoom: number,
  photoIndex: 1 | 2 | 3
) {
  const supabase = adminClient();
  // Both desktop and mobile now have their own position/zoom per photo — see
  // supabase/migration_desktop_per_photo_and_mobile_text_color.sql (desktop)
  // and supabase/migration_hero_text_colors_and_mobile_per_photo.sql (mobile).
  const positionField = `hero_${breakpoint}_${photoIndex}_position`;
  const zoomField = `hero_${breakpoint}_${photoIndex}_zoom`;

  const { error } = await supabase
    .from('site_settings')
    .update({ [positionField]: position, [zoomField]: zoom })
    .eq('id', true);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/admin/dashboard/homepage/images');
}

export async function updateCategoryCover(categoryId: string, formData: FormData) {
  const file = formData.get('file') as File | null;
  const position = formData.get('position') as string | null;

  const update: { cover_image_url?: string; cover_position?: string } = {};
  if (file && file.size > 0) {
    update.cover_image_url = await uploadFile(file, `category-${categoryId}`);
  }
  if (position) {
    update.cover_position = position;
  }
  if (Object.keys(update).length === 0) return null;

  const supabase = adminClient();
  const { error } = await supabase.from('categories').update(update).eq('id', categoryId);
  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/admin/dashboard/homepage/images');
  return update.cover_image_url ?? null;
}

// The heading/subtext/button text+link for one of the hero's 3 photo
// slots — see the "Hero Text & Buttons" section on this page and
// HeroPanelCycle.tsx (the homepage swaps between these three every 7s,
// in step with the photo crossfade, without the button ever
// disappearing). `heading` can span 2 lines — a literal newline in the
// textarea becomes a <br/> — everything else is one line. `text_color`
// is optional (empty string = "no override", falls back to the normal
// CSS colors) — see HeroPanelCycle.tsx.
export async function updateHeroSlideText(slideNumber: 1 | 2 | 3, formData: FormData) {
  const heading = String(formData.get('heading') ?? '').trim();
  const subtext = String(formData.get('subtext') ?? '').trim();
  const buttonLabel = String(formData.get('button_label') ?? '').trim();
  const buttonLink = String(formData.get('button_link') ?? '').trim();
  const textColor = String(formData.get('text_color') ?? '').trim();
  const mobileTextColor = String(formData.get('mobile_text_color') ?? '').trim();

  if (!heading) throw new Error("Heading can't be empty.");
  if (!buttonLink) throw new Error("Button link can't be empty — e.g. /shop or /style/gold-plated.");

  const supabase = adminClient();
  const { error } = await supabase
    .from('site_settings')
    .update({
      [`hero_${slideNumber}_heading`]: heading,
      [`hero_${slideNumber}_subtext`]: subtext,
      [`hero_${slideNumber}_button_label`]: buttonLabel || 'SHOP NOW',
      [`hero_${slideNumber}_button_link`]: buttonLink,
      [`hero_${slideNumber}_text_color`]: textColor,
      [`hero_mobile_${slideNumber}_text_color`]: mobileTextColor,
    })
    .eq('id', true);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/admin/dashboard/homepage/images');
}

// ---- Featured Items banner (see supabase/migration_featured_banner.sql) ----
// One wide image shown above the Featured Items cards on the homepage.
// Upload replaces the image; position/zoom are saved separately so you can
// re-frame the same image without re-uploading it.

export async function updateFeaturedBanner(formData: FormData) {
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) throw new Error('Choose a photo first.');

  const url = await uploadFile(file, 'featured-banner');
  const supabase = adminClient();
  // A new photo starts centered and un-zoomed, so a leftover crop from the
  // previous photo can't make the new one look wrong.
  const { error } = await supabase
    .from('site_settings')
    .update({ featured_banner_url: url, featured_banner_position: '50% 50%', featured_banner_zoom: 0 })
    .eq('id', true);

  if (error) {
    throw new Error(
      `${error.message} — if this mentions a missing column, run supabase/migration_featured_banner.sql in the Supabase SQL Editor first.`
    );
  }

  revalidatePath('/');
  revalidatePath('/admin/dashboard/homepage/images');
  return url;
}

export async function updateFeaturedBannerPosition(position: string, zoom: number) {
  const supabase = adminClient();
  const { error } = await supabase
    .from('site_settings')
    .update({ featured_banner_position: position, featured_banner_zoom: zoom })
    .eq('id', true);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/admin/dashboard/homepage/images');
}

export async function removeFeaturedBanner() {
  const supabase = adminClient();
  const { error } = await supabase
    .from('site_settings')
    .update({ featured_banner_url: '', featured_banner_position: '50% 50%', featured_banner_zoom: 0 })
    .eq('id', true);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/admin/dashboard/homepage/images');
}
