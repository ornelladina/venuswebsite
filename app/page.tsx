import { soldOutLastGrid } from '@/lib/soldOut';
import { supabase } from '@/lib/supabaseClient';
import { Product, Category, Collection, GridItem } from '@/types';
import ProductCard from '@/components/ProductCard';
import ProductCarousel from '@/components/ProductCarousel';
import HeroWaterRipple from '@/components/HeroWaterRipple';
import HeroPanelCycle from '@/components/HeroPanelCycle';
import CollectionCard from '@/components/CollectionCard';
import { withPriceRanges } from '@/lib/collectionPriceRange';
import HamsaSwiper from '@/components/HamsaSwiper';
import BestSellersSwiper from '@/components/BestSellersSwiper';
import Link from 'next/link';
import Image from 'next/image';
import { getSiteSettings } from '@/lib/siteSettings';
import { FREE_DELIVERY_THRESHOLD } from '@/lib/delivery';
import { siteAsset } from '@/lib/assets';

export const revalidate = 60; // refresh product data every 60s

async function getFeaturedProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .eq('is_featured', true)
    // featured_order (see supabase/migration_section_order.sql) — set by
    // dragging in the admin dashboard's Featured Items list, independent
    // of Best Sellers' own order and of the general display_order.
    .order('featured_order', { ascending: true })
    .limit(8);
  return data ?? [];
}

// Collection-side counterparts of the flag queries below — same is_*
// flags, just on the `collections` table (see
// supabase/migration_collection_flags.sql). Merged with the matching
// product list into one GridItem[] wherever these are used, so a look's
// card can sit right in among regular products in that section.
async function getFeaturedCollections(): Promise<Collection[]> {
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    // featured_order (see supabase/migration_section_order.sql) — same
    // independent per-section order products have, settable from the
    // admin dashboard's Featured Items list alongside products.
    .order('featured_order', { ascending: true });
  return withPriceRanges(data ?? []);
}

// productOrderKey / collectionOrderKey let Featured Items and Best
// Sellers each sort their items — products AND collections — by their
// own independent order (featured_order / best_seller_order — see
// supabase/migration_section_order.sql), while other sections (Hamsa &
// Eye, /collection/[slug] pages) keep using the general display_order.
function toGridItems(
  products: Product[],
  collections: Collection[],
  productOrderKey: 'display_order' | 'featured_order' | 'best_seller_order' | 'hamsa_eye_home_order' = 'display_order',
  collectionOrderKey: 'display_order' | 'featured_order' | 'best_seller_order' | 'hamsa_eye_home_order' = 'display_order'
): GridItem[] {
  const sorted: GridItem[] = [
    ...products.map((product) => ({ type: 'product' as const, display_order: product[productOrderKey], product })),
    ...collections.map((collection) => ({
      type: 'collection' as const,
      display_order: collection[collectionOrderKey],
      collection,
    })),
  ].sort((a, b) => a.display_order - b.display_order);
  return soldOutLastGrid(sorted);
}

async function getCategories(): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').order('display_order');
  return data ?? [];
}

// Hamsa & Eye Collection (homepage) — a curated subset of the full
// collection, capped at 6. is_hamsa_eye marks a product as part of the
// collection overall (shown in full, no cap, on the dedicated /hamsa-eye
// page); is_hamsa_eye_home is a second, independent checkbox for which of
// those you want to also feature here on the homepage — see
// supabase/migration_hamsa_eye_home.sql for the one-time setup.
async function getHamsaEyeProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .eq('is_hamsa_eye', true)
    .eq('is_hamsa_eye_home', true)
    // hamsa_eye_home_order (see supabase/migration_shop_the_look_and_hamsa_order.sql)
    // — set by dragging in the admin dashboard's Homepage Sections page,
    // independent of the product's general display_order.
    .order('hamsa_eye_home_order', { ascending: true })
    .limit(6);
  return data ?? [];
}

async function getHamsaEyeCollections(): Promise<Collection[]> {
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .eq('is_hamsa_eye', true)
    .eq('is_hamsa_eye_home', true)
    .order('hamsa_eye_home_order', { ascending: true });
  return withPriceRanges(data ?? []);
}

// Shop The Look — powered by the collections table (a "look" is several
// pieces styled together, which is what a collection is). Any collection
// with is_active = true and show_on_homepage = true shows up here, in
// the order set by dragging in the admin dashboard's Homepage Sections
// page (shop_the_look_order — see
// supabase/migration_shop_the_look_and_hamsa_order.sql).
async function getShopTheLookCollections(): Promise<Collection[]> {
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .eq('show_on_homepage', true)
    .order('shop_the_look_order', { ascending: true })
    .limit(8);
  return withPriceRanges(data ?? []);
}

// Best Sellers — same idea as Featured Items, Hamsa & Eye, and Shop The
// Look: any product with is_best_seller = true (and is_active = true)
// shows up here automatically. Toggle it in Supabase's Table Editor to
// add/remove items, exactly like the other flags above.
async function getBestSellerProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .eq('is_best_seller', true)
    // best_seller_order (see supabase/migration_section_order.sql) —
    // independent of Featured Items' own order.
    .order('best_seller_order', { ascending: true })
    .limit(4);
  return data ?? [];
}

async function getBestSellerCollections(): Promise<Collection[]> {
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .eq('is_best_seller', true)
    // best_seller_order (see supabase/migration_section_order.sql) —
    // independent of Featured Items' own order.
    .order('best_seller_order', { ascending: true });
  return withPriceRanges(data ?? []);
}

// Style Correctly showcase — fixed cover image per style, uploaded directly
// to Supabase Storage (site-assets bucket) instead of pulled from a
// product's own photos. To change a cover photo, just re-upload a file
// with the same name to site-assets in Supabase — nothing here needs to
// change. List order controls tile position: the first two entries fill
// the left column (1st = top tile, 2nd = bottom tile) and the 3rd entry
// is the tall right-hand tile.
const STYLE_SHOWCASE_LIST: { name: string; slug: string; imageUrl: string }[] = [
  {
    name: 'Stainless Steel',
    slug: 'stainless-steel',
    imageUrl:
      siteAsset('stainlesssteelcoverimg.webp'),
  },
  {
    name: 'Vintage',
    slug: 'vintage',
    imageUrl:
      siteAsset('vintagecoverimg.webp'),
  },
  {
    name: 'Gold-Plated',
    slug: 'gold-plated',
    imageUrl:
      siteAsset('goldplatedcoverimg.webp'),
  },
];

function getStyleShowcase(): { name: string; slug: string; imageUrl: string }[] {
  return STYLE_SHOWCASE_LIST;
}

export default async function HomePage() {
  const [
    featuredProducts,
    categories,
    hamsaEyeProducts,
    hamsaEyeCollections,
    shopTheLookCollections,
    bestSellerProducts,
    bestSellerCollections,
    featuredCollections,
    styleShowcase,
    settings,
  ] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getHamsaEyeProducts(),
    getHamsaEyeCollections(),
    getShopTheLookCollections(),
    getBestSellerProducts(),
    getBestSellerCollections(),
    getFeaturedCollections(),
    getStyleShowcase(),
    getSiteSettings(),
  ]);

  const featured = toGridItems(featuredProducts, featuredCollections, 'featured_order', 'featured_order');
  const hamsaEyeItems = toGridItems(hamsaEyeProducts, hamsaEyeCollections, 'hamsa_eye_home_order', 'hamsa_eye_home_order');
  const bestSellers = toGridItems(bestSellerProducts, bestSellerCollections, 'best_seller_order', 'best_seller_order');

  // The hero heading/subtext crossfade between these 3 sets on the same
  // 18s/6s-per-slide schedule as the background photos (pure CSS — see
  // "Hero text crossfade" in globals.css and HeroPanelCycle.tsx). The
  // button stays on screen the whole time and just swaps its own label/
  // link. Editable at /admin/dashboard/homepage/images -> "Hero Text &
  // Buttons", including each slide's text color.
  const heroSlides = [
    {
      heading: settings.hero_1_heading,
      subtext: settings.hero_1_subtext,
      buttonLabel: settings.hero_1_button_label,
      buttonLink: settings.hero_1_button_link,
      textColor: settings.hero_1_text_color,
      mobileTextColor: settings.hero_mobile_1_text_color ?? settings.hero_1_text_color,
    },
    {
      heading: settings.hero_2_heading,
      subtext: settings.hero_2_subtext,
      buttonLabel: settings.hero_2_button_label,
      buttonLink: settings.hero_2_button_link,
      textColor: settings.hero_2_text_color,
      mobileTextColor: settings.hero_mobile_2_text_color ?? settings.hero_2_text_color,
    },
    {
      heading: settings.hero_3_heading,
      subtext: settings.hero_3_subtext,
      buttonLabel: settings.hero_3_button_label,
      buttonLink: settings.hero_3_button_link,
      textColor: settings.hero_3_text_color,
      mobileTextColor: settings.hero_mobile_3_text_color ?? settings.hero_3_text_color,
    },
  ];

  return (
    <div data-page="home">
      {/* Hero — a single still photo (water surface with the jewelry
          already resting in it, /public/hero-water.webp), no video, no
          animation (see HeroWaterRipple.tsx). Used to also have a
          .hero-glints twinkle layer on top of it — removed per request
          (was showing as small white dots on the photo). */}
      <section className="hero-banner">
        <HeroWaterRipple />

        <HeroPanelCycle slides={heroSlides} />
      </section>

      {/* Best Sellers — right after the hero: fastest social proof and
          lowest-effort win for a new visitor. Added a "Shop Best Sellers"
          link since this section didn't have one before. */}
      {bestSellers.length > 0 && (
        <section className="best-sellers-section">
          <h2 className="section-heading-eb" data-reveal>Best Sellers</h2>
          <p className="section-subheading-uppercase" data-reveal data-reveal-delay="1">
            Check out your favorite items &amp; our most sold pieces!
          </p>
          {/* Desktop keeps the plain grid. Mobile swaps to one big card
              at a time with swipe dots (BestSellersSwiper) — both are
              rendered, CSS shows only the one that fits the current
              screen width (see [data-grid='products'] /
              .best-seller-swiper in globals.css), same pattern as
              Hamsa & Eye below. */}
          <div data-grid="products">
            {bestSellers.map((item) =>
              item.type === 'product' ? (
                <div className="best-seller-card-frame" key={`product-${item.product.id}`}>
                  <ProductCard product={item.product} compact />
                </div>
              ) : (
                <div className="best-seller-card-frame" key={`collection-${item.collection.id}`}>
                  <CollectionCard collection={item.collection} />
                </div>
              )
            )}
          </div>
          <BestSellersSwiper items={bestSellers} />
          <a href="/best-sellers" className="shop-all-link" data-reveal>
            Shop Best Sellers →
          </a>
        </section>
      )}

      {/* Shop by Category — orientation for a new visitor: teaches the
          shape of the catalog fast, right after they've seen best sellers
          prove the product quality. */}
      <section className="home-section tinted">
        <h2 className="section-heading-eb" data-reveal>Shop By Category</h2>
        {/* Cover photo: uploaded via /admin/dashboard/homepage/images
            (cat.cover_image_url), which is preferred when set. Falls back
            to the old "category-{slug}.webp" filename-in-storage
            convention for any category that hasn't had a new photo
            uploaded through the admin page yet, and finally to a plain
            gold gradient if neither exists. */}
        <div className="category-tiles">
          {categories.map((cat, i) => {
            const cover =
              cat.cover_image_url ||
              siteAsset(`category-${cat.slug}.webp`);
            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="category-tile"
                data-reveal
                data-reveal-delay={String((i % 4) + 1)}
                style={{
                  backgroundImage: `url(${cover}), linear-gradient(135deg, #E8CBB7, #D8AF8A)`,
                  backgroundPosition: `${cat.cover_position || '50% 50%'}, center`,
                }}
              >
                <div className="category-tile-label">{cat.name}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Items — right below Shop By Category. */}
      {featured.length > 0 && (
        <section className="home-section tinted featured-items-section">
          <div>
            <h2 className="section-heading-eb" data-reveal>Featured Items</h2>
            <p className="section-subheading-uppercase" data-reveal data-reveal-delay="1">
              {settings.featured_subtitle}
            </p>
            {settings.featured_banner_url && (
              // Wide banner above the cards — same left/right edges as the
              // card row. Image, position and zoom are edited at Admin >
              // Homepage Sections > Cover Images > Featured Items Banner.
              <div className="featured-banner" data-reveal>
                <Image
                  src={settings.featured_banner_url}
                  alt=""
                  fill
                  sizes="(max-width: 1440px) 100vw, 1440px"
                  style={{
                    objectFit: 'cover',
                    objectPosition: settings.featured_banner_position || '50% 50%',
                    transformOrigin: settings.featured_banner_position || '50% 50%',
                    transform: `scale(${1 + (2 * Number(settings.featured_banner_zoom || 0)) / 100})`,
                  }}
                />
              </div>
            )}
            <ProductCarousel items={featured} />
          </div>
        </section>
      )}

      {/* Promo banner */}
      <section className="promo-banner">
        <div className="promo-bckgd-pattern" data-reveal>
          <div className="promo-img" data-reveal />
          <div className="promo-text-panel">
            <h2 data-reveal>Looking for a Set?</h2>
            <a href="/category/sets" data-reveal>Explore our sets collection &gt;</a>
          </div>
        </div>
      </section>

      {/* Shop The Look — now lands right after the promo banner, once a
          visitor already has context on the product range, so the styled
          multi-item photos read as inspiration rather than a confusing
          puzzle of "which piece is which". */}
      {shopTheLookCollections.length > 0 && (
        <section className="shop-the-look-section">
          <h2 className="section-heading-eb center" data-reveal>Shop The Look</h2>
          <p className="shop-the-look-subheading" data-reveal data-reveal-delay="1">
            Curated pieces, ready to wear
          </p>
          <div className="shop-the-look-grid">
            {shopTheLookCollections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
          <a href="/shop-the-look" className="shop-all-link" data-reveal>
            Shop All →
          </a>
        </section>
      )}

      {/* Free delivery strip — slim reminder in the middle of the page. The
          amount comes from lib/delivery.ts, so it matches the header, cart
          and checkout. */}
      <section className="free-delivery-strip" data-reveal>
        <svg
          className="free-delivery-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6.5h11v9H3z" />
          <path d="M14 9.5h4l3 3v3h-7z" />
          <circle cx="7" cy="17.5" r="1.8" />
          <circle cx="17" cy="17.5" r="1.8" />
        </svg>
        <div>
          <h2>Free delivery on orders ${FREE_DELIVERY_THRESHOLD}+</h2>
          <p>Cash on delivery across Lebanon</p>
        </div>
      </section>

      {/* Style Correctly */}
      <section className="style-section">
        <div className="style-showcase">
          <div className="style-showcase-col style-showcase-col-left" data-reveal>
            {styleShowcase.slice(0, 2).map((s, i) => (
              <Link
                key={s.slug}
                href={`/style/${s.slug}`}
                className={`style-tile ${i === 0 ? 'style-tile-top' : 'style-tile-bottom'}`}
                style={
                  s.imageUrl
                    ? {
                        backgroundImage: `linear-gradient(0deg, rgba(55, 21, 47, 0.1), rgba(55, 21, 47, 0.1)), url(${s.imageUrl})`,
                      }
                    : undefined
                }
              >
                <span className="style-tile-label">{s.name}</span>
              </Link>
            ))}
          </div>
          <div className="style-showcase-col style-showcase-col-right" data-reveal data-reveal-delay="2">
            {styleShowcase.slice(2, 3).map((s) => (
              <Link
                key={s.slug}
                href={`/style/${s.slug}`}
                className="style-tile style-tile-side"
                style={
                  s.imageUrl
                    ? {
                        backgroundImage: `linear-gradient(0deg, rgba(55, 21, 47, 0.1), rgba(55, 21, 47, 0.1)), url(${s.imageUrl})`,
                      }
                    : undefined
                }
              >
                <span className="style-tile-label">{s.name}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="style-text" data-reveal>
          <h2>Style Correctly, Change Your Whole Look</h2>
          <p>
            If you want to style your outfit, choose from these different styles and upgrade your
            outfit.
          </p>
          <Link href="/style/gold-plated" className="style-view-all">
            <span className="btn-label">View All Types</span>
          </Link>
        </div>
      </section>

      {/* Hamsa & Eye Collection */}
      {hamsaEyeItems.length > 0 && (
        <section className="hamsa-section">
          <h2 className="section-heading-eb center" data-reveal>Hamsa &amp; Eye Collection</h2>
          <p className="hamsa-subheading" data-reveal data-reveal-delay="1">for luck &amp; protection</p>
          <img
            src={siteAsset('hamsa-icon-design.png')}
            alt=""
            className="hamsa-icon-image"
            data-reveal
            data-reveal-delay="2"
          />
          {/* Desktop keeps the plain grid. Mobile swaps to one big card
              at a time with swipe dots (HamsaSwiper) — both are rendered,
              CSS shows only the one that fits the current screen width
              (see .hamsa-products-grid / .hamsa-swiper in globals.css). */}
          <div className="hamsa-grid hamsa-products-grid">
            {hamsaEyeItems.map((item) =>
              item.type === 'product' ? (
                <ProductCard key={`product-${item.product.id}`} product={item.product} compact />
              ) : (
                <CollectionCard key={`collection-${item.collection.id}`} collection={item.collection} />
              )
            )}
          </div>
          <HamsaSwiper items={hamsaEyeItems} />
          <a href="/hamsa-eye" className="shop-all-link">
            Shop All →
          </a>
        </section>
      )}
    </div>
  );
}
