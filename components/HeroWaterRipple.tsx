/**
 * Hero background — a crossfading 3-photo slideshow (water surface with
 * jewelry resting in it), no video, just plain photos swiped between.
 * Each photo swaps to the next every 3 seconds via a pure-CSS opacity
 * crossfade (see the hero-slide-fade keyframes in globals.css) — no JS,
 * no state.
 *
 * The 6 photos (3 desktop, 3 mobile) plus each breakpoint's focal point
 * and zoom now come from the site_settings table (editable at
 * /admin/dashboard/homepage/images) instead of being hardcoded — see
 * lib/siteSettings.ts. This component fetches that row, then renders a
 * <style> tag that sets the exact same CSS custom properties
 * (--hero-photo-1/2/3, --hero-position, --hero-zoom-inset) that
 * globals.css already reads — so the crossfade animation itself
 * (timing, keyframes, overlap) is completely untouched; only where the
 * values come from has changed. Bumping a photo's cache-buster isn't
 * needed here the way it was for the old fixed-filename setup — each
 * upload gets its own generated filename (see actions.ts), so it's
 * always a new URL.
 *
 * NOTE: this used to have a "ripple" effect — an animated SVG filter
 * (feTurbulence -> feDisplacementMap, redrifting via SMIL <animate> every
 * ~52s) plus a slow CSS scale/pan drift on a second masked copy of the
 * photo layered on top. That animated SVG filter was causing site-wide
 * rendering glitches (a known class of browser bug with continuously
 * re-rasterized SVG filters), so it's been removed. What's left is the
 * plain static photos crossfading between each other — no filter, no
 * drift, nothing to glitch. Don't reintroduce it.
 */
import { getSiteSettings } from '@/lib/siteSettings';

export default async function HeroWaterRipple() {
  const s = await getSiteSettings();

  // Zoom is stored as the old "inset %" number; the photo layer is scaled by
  // 1 + 2 x zoom/100, about the saved focal point (see .hero-water-ripple-still
  // in globals.css).
  const scale = (zoom: number) => 1 + (2 * Number(zoom || 0)) / 100;

  const css = `
.hero-water-ripple {
  --hero-photo-1: url('${s.hero_desktop_1}');
  --hero-photo-2: url('${s.hero_desktop_2}');
  --hero-photo-3: url('${s.hero_desktop_3}');
}
.hero-water-slide-1 {
  --hero-position: ${s.hero_desktop_1_position};
  --hero-scale: ${scale(s.hero_desktop_1_zoom)};
}
.hero-water-slide-2 {
  --hero-position: ${s.hero_desktop_2_position};
  --hero-scale: ${scale(s.hero_desktop_2_zoom)};
}
.hero-water-slide-3 {
  --hero-position: ${s.hero_desktop_3_position};
  --hero-scale: ${scale(s.hero_desktop_3_zoom)};
}
@media (max-width: 900px) {
  .hero-water-ripple {
    --hero-photo-1: url('${s.hero_mobile_1}');
    --hero-photo-2: url('${s.hero_mobile_2}');
    --hero-photo-3: url('${s.hero_mobile_3}');
  }
  .hero-water-slide-1 {
    --hero-position: ${s.hero_mobile_1_position};
    --hero-scale: ${scale(s.hero_mobile_1_zoom)};
  }
  .hero-water-slide-2 {
    --hero-position: ${s.hero_mobile_2_position};
    --hero-scale: ${scale(s.hero_mobile_2_zoom)};
  }
  .hero-water-slide-3 {
    --hero-position: ${s.hero_mobile_3_position};
    --hero-scale: ${scale(s.hero_mobile_3_zoom)};
  }
}
`;

  return (
    <div className="hero-water-ripple" aria-hidden="true">
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="hero-water-ripple-still hero-water-slide-1" />
      <div className="hero-water-ripple-still hero-water-slide-2" />
      <div className="hero-water-ripple-still hero-water-slide-3" />
    </div>
  );
}

