export type Category = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  cover_image_url?: string | null;
  cover_position?: string | null;
};

export type SiteSettings = {
  hero_desktop_1: string;
  hero_desktop_2: string;
  hero_desktop_3: string;
  hero_desktop_position: string;
  hero_desktop_zoom: number;
  // Per-photo desktop position/zoom (see
  // supabase/migration_desktop_per_photo_and_mobile_text_color.sql).
  // hero_desktop_position/zoom above are the old shared pair, kept as the
  // fallback until that migration has been run.
  hero_desktop_1_position: string;
  hero_desktop_1_zoom: number;
  hero_desktop_2_position: string;
  hero_desktop_2_zoom: number;
  hero_desktop_3_position: string;
  hero_desktop_3_zoom: number;
  hero_mobile_1: string;
  hero_mobile_2: string;
  hero_mobile_3: string;
  // Per-photo position/zoom (see
  // supabase/migration_hero_text_colors_and_mobile_per_photo.sql) —
  // replaces the old shared hero_mobile_position/hero_mobile_zoom so
  // each of the 3 mobile hero photos can be repositioned/resized on its
  // own instead of sharing one crop setting.
  hero_mobile_1_position: string;
  hero_mobile_1_zoom: number;
  hero_mobile_2_position: string;
  hero_mobile_2_zoom: number;
  hero_mobile_3_position: string;
  hero_mobile_3_zoom: number;
  // The uppercase line under "Featured Items" on the homepage — see
  // supabase/migration_featured_subtitle.sql.
  featured_subtitle: string;
  // Banner image above the Featured Items cards — see
  // supabase/migration_featured_banner.sql. Empty url = no banner.
  featured_banner_url: string;
  featured_banner_position: string;
  featured_banner_zoom: number;
  // Hero panel text/button — 3 sets, one per hero photo, cycled by
  // HeroPanelCycle.tsx. See supabase/migration_hero_text_slides.sql.
  // text_color applies to both the heading and subtext of that slide —
  // see supabase/migration_hero_text_colors_and_mobile_per_photo.sql.
  hero_1_heading: string;
  hero_1_subtext: string;
  hero_1_button_label: string;
  hero_1_button_link: string;
  hero_1_text_color: string;
  // Mobile-only text color per slide ('' = default beige). Optional so the
  // site keeps working before the migration above has been run.
  hero_mobile_1_text_color?: string;
  hero_mobile_2_text_color?: string;
  hero_mobile_3_text_color?: string;
  hero_2_heading: string;
  hero_2_subtext: string;
  hero_2_button_label: string;
  hero_2_button_link: string;
  hero_2_text_color: string;
  hero_3_heading: string;
  hero_3_subtext: string;
  hero_3_button_label: string;
  hero_3_button_link: string;
  hero_3_text_color: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  focal_point: string | null;
  zoom: number | null;
  label: string | null;
  color_tag: string | null;
  /* 'contain' (default) always shows the full photo, letterboxed if its
     proportions don't match the card frame — focal_point only has a
     visible effect here if there's leftover letterbox space to shift the
     photo into. 'cover' crops the photo to completely fill the frame,
     using focal_point to choose which part gets cropped away — this is
     where focal_point matters most. Nullable so existing rows (created
     before this column existed) fall back to 'contain', today's default. */
  object_fit: 'contain' | 'cover' | null;
};

export type ProductVariation = {
  id: string;
  product_id: string;
  variation_type: string;
  variation_value: string;
  price_override: number | null;
  stock_quantity: number;
  sku: string | null;
  display_order: number;
};

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: number;
  sale_price: number | null;
  original_price: number | null;
  stock_quantity: number;
  is_new: boolean;
  is_featured: boolean;
  is_hamsa_eye: boolean;
  /** Powers the homepage's curated 6-item Hamsa & Eye strip — a product
   *  must have BOTH this and is_hamsa_eye true to show there. Every
   *  is_hamsa_eye product still shows on the full /hamsa-eye page
   *  regardless of this flag. See supabase/migration_hamsa_eye_home.sql. */
  is_hamsa_eye_home: boolean;
  /** Powers the "Themes > Classical" nav item and the /classical page (same
   *  pattern as is_hamsa_eye). Run supabase/migration_classical.sql once,
   *  then toggle this per-product in Table Editor to add/remove it from
   *  that page. */
  is_classical: boolean;
  /** No longer used — the "Shop The Look" section/page is now powered by
   *  the `collections` table (see Collection.show_on_homepage) since
   *  Shop The Look is meant to show multi-item looks, not single
   *  products. Kept here only so old data doesn't break TypeScript. */
  is_shop_the_look: boolean;
  /** Add this boolean column to the `products` table in Supabase (same as
   *  is_featured / is_hamsa_eye / is_shop_the_look) to power the "Best
   *  Sellers" nav item and page — toggle it per-product in Table Editor. */
  is_best_seller: boolean;
  /** Powers the "Style" nav dropdown. Run supabase/migration_style.sql once,
   *  then pick a value per product from the dropdown in Table Editor:
   *  "Gold Plated", "Stainless Steel", or "Vintage". */
  style: string | null;
  display_order: number;
  /** When the product was added (set automatically by Supabase). */
  created_at?: string | null;
  /** Independent drag order for the admin dashboard's Featured Items list
   *  — separate from display_order so reordering here doesn't also move
   *  the product in Best Sellers. See supabase/migration_section_order.sql. */
  featured_order: number;
  /** Same idea as featured_order, but for the Best Sellers admin list. */
  best_seller_order: number;
  /** Same idea again, but for the homepage's Hamsa & Eye strip. See
   *  supabase/migration_shop_the_look_and_hamsa_order.sql. */
  hamsa_eye_home_order: number;
  is_active: boolean;
  is_set: boolean;
  product_images?: ProductImage[];
  product_variations?: ProductVariation[];
};

export type CollectionImage = {
  id: string;
  collection_id: string;
  image_url: string;
  display_order: number;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  cover_image_url: string;
  display_order: number;
  /** When the collection was added (set automatically by Supabase). */
  created_at?: string | null;
  is_active: boolean;
  /** Powers style tagging for a whole collection. Run
   *  supabase/migration_style.sql once, then pick a value from the
   *  dropdown in Table Editor: "Gold Plated", "Stainless Steel", or
   *  "Vintage". */
  style: string | null;
  /** Powers category tagging for a whole collection. Run
   *  supabase/migration_collection_category.sql once, then pick a
   *  category from the dropdown in Table Editor. When BOTH this and
   *  `style` are set, the collection's card also shows up inline on
   *  that category page, inside the matching style section — on top
   *  of (not instead of) its usual spot on /shop-the-look. */
  category_id: string | null;
  /** Tick this in Table Editor to also show this collection in the
   *  "Shop The Look" section on the homepage. Every active collection
   *  always shows on the full /shop-the-look page regardless of this
   *  flag — this only controls the curated homepage strip. */
  show_on_homepage: boolean;
  /** These four mirror the identically-named product flags — a
   *  collection card with one of these set shows up mixed in with
   *  regular products in that section, exactly like a product would.
   *  See supabase/migration_collection_flags.sql. */
  is_featured: boolean;
  is_best_seller: boolean;
  is_hamsa_eye: boolean;
  is_hamsa_eye_home: boolean;
  /** Independent drag order for the admin dashboard's Featured Items /
   *  Best Sellers lists — separate from display_order and from each
   *  other, same idea as the identically-named columns on Product. See
   *  supabase/migration_section_order.sql. */
  featured_order: number;
  best_seller_order: number;
  /** Independent drag order for the admin dashboard's Shop the Look and
   *  Hamsa & Eye homepage sections, same idea as featured_order /
   *  best_seller_order above. See
   *  supabase/migration_shop_the_look_and_hamsa_order.sql. */
  shop_the_look_order: number;
  hamsa_eye_home_order: number;
  /** Extra photos for this collection's page, beyond cover_image_url —
   *  see supabase/migration_collection_images.sql. Only present when
   *  explicitly fetched with a join (e.g. on the collection detail page);
   *  the homepage/shop-the-look strip queries don't need it. */
  collection_images?: CollectionImage[];
  /** Lowest price among this collection's products (sale price counted
   *  where set), computed on the server and attached right after the
   *  collection is fetched — see lib/collectionPriceRange.ts. null when
   *  the collection has no products yet, or when whatever fetched this
   *  collection didn't attach a range (e.g. the admin dashboard).
   *  CollectionCard uses this + price_max to show a "From $X to $Y" range. */
  price_min?: number | null;
  /** Highest price among this collection's products — see price_min. */
  price_max?: number | null;
};

// A single slot in any grid/carousel/swiper that can mix regular products
// with "Shop The Look" collection cards — used everywhere a collection is
// now allowed to appear alongside products (Best Sellers, Hamsa & Eye,
// Featured Items, category pages). display_order is carried on the item
// itself so a mixed list can be sorted in one pass regardless of which
// table each entry came from.
export type GridItem =
  | { type: 'product'; display_order: number; product: Product }
  | { type: 'collection'; display_order: number; collection: Collection };

export type CartItem = {
  product_id: string;
  /** Product slug, used to link cart/checkout line items back to their
   *  product page (/product/[slug]). Optional so carts saved to
   *  localStorage before this field existed don't break — those items
   *  just render without the link until re-added. */
  slug?: string;
  variation_id: string | null;
  name: string;
  variation_label: string | null;
  price: number;
  image_url: string | null;
  quantity: number;
};
