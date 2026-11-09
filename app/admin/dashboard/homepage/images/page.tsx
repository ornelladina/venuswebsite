import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import SignOutButton from '../../SignOutButton';
import HeroBreakpointSection from './HeroBreakpointSection';
import CategoryCoverCard from './CategoryCoverCard';
import FeaturedBannerEditor from './FeaturedBannerEditor';
import HeroTextSlideForm from './HeroTextSlideForm';
import { getSiteSettings } from '@/lib/siteSettings';

export const dynamic = 'force-dynamic';

async function getCategories() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
  const { data } = await supabaseAdmin
    .from('categories')
    .select('id, name, slug, cover_image_url, cover_position')
    .order('display_order');
  return data ?? [];
}

export default async function CoverImagesPage() {
  const [settings, categories] = await Promise.all([getSiteSettings(), getCategories()]);

  return (
    <div data-page="admin-products">
      <div data-admin-dashboard-header>
        <h1>Cover Images</h1>
        <div data-admin-header-actions>
          <Link href="/admin/dashboard/homepage" data-admin-btn-secondary>
            Homepage Sections
          </Link>
          <SignOutButton />
        </div>
      </div>

      <p data-admin-form-hint>
        Upload and reposition the homepage hero slideshow and each category&rsquo;s cover photo —
        changes go live right away, no code or redeploy needed.
      </p>

      {/* ---------- Hero — Desktop ---------- */}
      <section data-admin-subsection>
        <div data-admin-dashboard-header>
          <h2>Hero — Desktop</h2>
        </div>
        <p data-admin-form-hint>
          The 3 photos crossfade in a loop on the homepage. Each photo has its own position and
          zoom, so you can frame them independently.
        </p>
        <HeroBreakpointSection
          breakpoint="desktop"
          photos={[settings.hero_desktop_1, settings.hero_desktop_2, settings.hero_desktop_3]}
          positions={[
            settings.hero_desktop_1_position,
            settings.hero_desktop_2_position,
            settings.hero_desktop_3_position,
          ]}
          zooms={[settings.hero_desktop_1_zoom, settings.hero_desktop_2_zoom, settings.hero_desktop_3_zoom]}
          zoomMax={60}
        />
      </section>

      {/* ---------- Hero — Mobile ---------- */}
      <section data-admin-subsection>
        <div data-admin-dashboard-header>
          <h2>Hero — Mobile</h2>
        </div>
        <p data-admin-form-hint>
          Shown instead of the desktop set on phones/tablets (900px and narrower). Each of the 3
          photos below has its own position and zoom now, so you can resize/reposition them
          independently.
        </p>
        <HeroBreakpointSection
          breakpoint="mobile"
          photos={[settings.hero_mobile_1, settings.hero_mobile_2, settings.hero_mobile_3]}
          positions={[
            settings.hero_mobile_1_position,
            settings.hero_mobile_2_position,
            settings.hero_mobile_3_position,
          ]}
          zooms={[settings.hero_mobile_1_zoom, settings.hero_mobile_2_zoom, settings.hero_mobile_3_zoom]}
          zoomMax={150}
        />
      </section>

      {/* ---------- Featured Items Banner ---------- */}
      <section data-admin-subsection>
        <div data-admin-dashboard-header>
          <h2>Featured Items Banner</h2>
        </div>
        <p data-admin-form-hint>
          A wide banner shown above the Featured Items cards on the homepage, lined up with the
          cards on both sides. Upload a photo, drag it to move it, Ctrl/&#8984; + scroll (or pinch)
          to zoom, then Save. On phones the banner is shorter and crops in from the sides, so keep
          the important part near the middle.
        </p>
        <FeaturedBannerEditor
          initialUrl={settings.featured_banner_url}
          initialPosition={settings.featured_banner_position}
          initialZoom={settings.featured_banner_zoom}
        />
      </section>

      {/* ---------- Hero Text & Buttons ---------- */}
      <section data-admin-subsection>
        <div data-admin-dashboard-header>
          <h2>Hero Text &amp; Buttons</h2>
        </div>
        <p data-admin-form-hint>
          Shown over the hero photos — fades between all 3 below in exact step with the photo
          crossfade above (the button itself doesn&rsquo;t fade, it just swaps its own text/link, so
          there&rsquo;s no moment with no &ldquo;Shop Now&rdquo; button on screen).
        </p>
        <HeroTextSlideForm
          slideNumber={1}
          initial={{
            heading: settings.hero_1_heading,
            subtext: settings.hero_1_subtext,
            buttonLabel: settings.hero_1_button_label,
            buttonLink: settings.hero_1_button_link,
            textColor: settings.hero_1_text_color,
            mobileTextColor: settings.hero_mobile_1_text_color ?? settings.hero_1_text_color,
          }}
        />
        <HeroTextSlideForm
          slideNumber={2}
          initial={{
            heading: settings.hero_2_heading,
            subtext: settings.hero_2_subtext,
            buttonLabel: settings.hero_2_button_label,
            buttonLink: settings.hero_2_button_link,
            textColor: settings.hero_2_text_color,
            mobileTextColor: settings.hero_mobile_2_text_color ?? settings.hero_2_text_color,
          }}
        />
        <HeroTextSlideForm
          slideNumber={3}
          initial={{
            heading: settings.hero_3_heading,
            subtext: settings.hero_3_subtext,
            buttonLabel: settings.hero_3_button_label,
            buttonLink: settings.hero_3_button_link,
            textColor: settings.hero_3_text_color,
            mobileTextColor: settings.hero_mobile_3_text_color ?? settings.hero_3_text_color,
          }}
        />
      </section>

      {/* ---------- Category Covers ---------- */}
      <section data-admin-subsection>
        <div data-admin-dashboard-header>
          <h2>Category Covers ({categories.length})</h2>
        </div>
        <p data-admin-form-hint>
          Shown on the &ldquo;Shop By Category&rdquo; tiles on the homepage. Every tile is the same fixed
          size, so position controls which part of each photo shows inside it — there&rsquo;s no
          separate zoom here since these don&rsquo;t crop the way the hero photos do.
        </p>
        {categories.map((cat) => (
          <CategoryCoverCard key={cat.id} category={cat} />
        ))}
      </section>
    </div>
  );
}
