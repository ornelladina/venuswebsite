import { supabase } from '@/lib/supabaseClient';
import type { SiteSettings } from '@/types';

// Matches exactly what was hardcoded in globals.css/HeroWaterRipple.tsx
// before this became admin-editable — used both as the DB row's default
// (see supabase/migration_hero_and_category_images.sql) and as a
// belt-and-suspenders fallback here in case that migration hasn't been
// run yet on a given environment.
const FALLBACK_SETTINGS: SiteSettings = {
  hero_desktop_1: '/hero-water.webp',
  hero_desktop_2:
    '/hero-water.webp',
  hero_desktop_3:
    '/hero-water.webp',
  hero_desktop_position: '50% 50%',
  hero_desktop_zoom: 3,
  hero_desktop_1_position: '50% 50%',
  hero_desktop_1_zoom: 3,
  hero_desktop_2_position: '50% 50%',
  hero_desktop_2_zoom: 3,
  hero_desktop_3_position: '50% 50%',
  hero_desktop_3_zoom: 3,
  hero_mobile_1:
    '/hero-water-mobile.webp',
  hero_mobile_2:
    '/hero-water-mobile.webp',
  hero_mobile_3:
    '/hero-water-mobile.webp',
  hero_mobile_1_position: '50% 0%',
  hero_mobile_1_zoom: 12,
  hero_mobile_2_position: '50% 0%',
  hero_mobile_2_zoom: 12,
  hero_mobile_3_position: '50% 0%',
  hero_mobile_3_zoom: 12,
  featured_subtitle: 'Leather brand bracelets',
  featured_banner_url: '',
  featured_banner_position: '50% 50%',
  featured_banner_zoom: 0,
  hero_1_heading: 'Trendy. Classy.\nAffordable.',
  hero_1_subtext: "Fashion accessories that don't make you choose.",
  hero_1_button_label: 'SHOP NOW',
  hero_1_button_link: '/shop',
  hero_1_text_color: '',
  hero_2_heading: 'Trendy. Classy.\nAffordable.',
  hero_2_subtext: "Fashion accessories that don't make you choose.",
  hero_2_button_label: 'SHOP NOW',
  hero_2_button_link: '/shop',
  hero_2_text_color: '',
  hero_3_heading: 'Trendy. Classy.\nAffordable.',
  hero_3_subtext: "Fashion accessories that don't make you choose.",
  hero_3_button_label: 'SHOP NOW',
  hero_3_button_link: '/shop',
  hero_3_text_color: '',
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const { data } = await supabase.from('site_settings').select('*').eq('id', true).maybeSingle();
    if (!data) return FALLBACK_SETTINGS;
    const merged = { ...FALLBACK_SETTINGS, ...data } as SiteSettings & Record<string, unknown>;
    // Before the per-photo desktop migration has been run, every desktop
    // photo uses the old shared position/zoom — so nothing changes visually.
    for (const n of [1, 2, 3]) {
      if (data[`hero_desktop_${n}_position`] == null) {
        merged[`hero_desktop_${n}_position`] = merged.hero_desktop_position;
      }
      if (data[`hero_desktop_${n}_zoom`] == null) {
        merged[`hero_desktop_${n}_zoom`] = merged.hero_desktop_zoom;
      }
    }
    return merged;
  } catch {
    return FALLBACK_SETTINGS;
  }
}
