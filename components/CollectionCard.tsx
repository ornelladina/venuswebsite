'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Collection } from '@/types';
import { useFavorites } from './FavoritesContext';
import { formatPrice } from '@/lib/formatPrice';

// Formats the collection's price_min/price_max (attached server-side —
// see lib/collectionPriceRange.ts) into the text shown on the card.
// A collection with a single price point (one product, or several
// products that all cost the same) collapses to a single "$X" instead of
// a range. Otherwise it reads as "From $X to $Y" — spelled out with
// "From"/"to" instead of the old bare "$X - $Y" per request, so it's
// unambiguous that this is a price range (low to high) and not, say, a
// single price with a typo'd extra number next to it.
function formatPriceRange(collection: Collection): string | null {
  const { price_min, price_max } = collection;
  if (price_min == null || price_max == null) return null;
  // Compare the prices AS SHOWN (whole dollars), not the raw numbers: a
  // collection with a $6.60 piece and a $7.00 piece both display as $7, and
  // used to read "From $7 to $7". Now it collapses to a single "$7".
  if (formatPrice(price_min) === formatPrice(price_max)) return `$${formatPrice(price_min)}`;
  return `From $${formatPrice(price_min)} to $${formatPrice(price_max)}`;
}

export default function CollectionCard({ collection }: { collection: Collection }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const priceRange = formatPriceRange(collection);
  const router = useRouter();

  return (
    <div className="product-card-frame" data-reveal>
      {/* data-swipeable="false" here doesn't disable anything — this card
          has no per-photo swipe of its own to protect (it only ever shows
          one cover photo). It exists purely so the CSS rule that opens up
          touch-action to pan-x pan-y also applies to this card: without
          it, a drag that starts on top of a collection card sitting
          inside a horizontal carousel (Featured Items, Best Sellers,
          Hamsa & Eye) was restricted to vertical-only, so the carousel
          couldn't be dragged any further — forward or back — once a
          finger landed on this card. */}
      <div data-component="product-card" data-swipeable="false">
        {/* Whole-card click target — was previously the outer element
            itself (a <Link>), but the heart button below needs to sit
            outside any anchor so clicking it doesn't also trigger a
            navigation. Swapped to this transparent full-cover overlay
            link instead (same pattern ProductCard uses for its own
            image-only Link + sibling favorite button): it sits behind
            the heart button in stacking order (z-index 1 vs the
            button's 2 — see [data-favorite-button] in globals.css), so
            the button still gets first claim on clicks inside its own
            bounds, while every other pixel of the card still navigates
            to the collection like before. */}
        <Link
          href={`/collection/${collection.slug}`}
          className="collection-card-link-overlay"
          aria-label={collection.name}
        />
        <div className="product-card-image-wrap">
          <Image src={collection.cover_image_url} alt={collection.name} width={294} height={332} />
        </div>
        <h3 data-product-name>{collection.name}</h3>
        {priceRange && <span data-collection-price-range>{priceRange}</span>}
        <span data-collection-cta>
          See items <span data-cta-arrow aria-hidden="true">→</span>
        </span>

        {/* Same "+ ADD" button regular product cards have, so a Shop The
            Look card reads as part of the same family when they sit side
            by side. Pressing it opens the look's page (like a product
            with variations opens its product page). Reuses the exact
            same classes as ProductCard's button, so size, position and
            mobile icon-only behavior all match automatically. It sits
            above the overlay link (z-index 2 vs 1). */}
        <button
          type="button"
          aria-label="Shop the look"
          className="atc-button atc-compact"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/collection/${collection.slug}`);
          }}
        >
          <span className="atc-icon-plus" aria-hidden="true">
            <span className="icon-svg icon-addtocart" aria-hidden="true" />
            <span className="icon-svg icon-check" aria-hidden="true" />
          </span>
          <span className="btn-label atc-full-label">SHOP THE LOOK</span>
          <span className="btn-label atc-short-label" aria-hidden="true">
            ADD
          </span>
        </button>

        <button
          type="button"
          aria-label="Toggle favorite"
          data-favorite-button
          data-active={isFavorite(collection.id)}
          onClick={(e) => {
            // Belt-and-suspenders alongside the z-index stacking above —
            // stop the click from bubbling up to the overlay link too.
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(collection.id);
          }}
        >
          <span className="icon-svg icon-heart" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
