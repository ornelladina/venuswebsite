'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';
import { useFavorites } from './FavoritesContext';
import { useCart } from './CartContext';
import { gaEvent } from '@/lib/gtag';
import { formatStyleLabel } from '@/lib/styles';
import { formatPrice } from '@/lib/formatPrice';

export default function ProductCard({
  product,
  compact = true,
  swipeable = true,
  carouselAware = false,
}: {
  product: Product;
  /** true (default) = the small icon + "ADD" button used everywhere on desktop,
   *  including Featured Items & Best Sellers.
   *  false = the old full-width "ADD TO CART" pill (currently unused, kept in
   *  case a future section wants it back).
   *  On mobile, every button collapses to icon-only regardless of this prop. */
  compact?: boolean;
  /** true (default) = a left/right drag on the card's photo cycles through
   *  that product's own images (used when the card sits in a plain grid,
   *  where a horizontal drag has nothing else to do).
   *  false = the card sits inside a horizontally-scrolling carousel
   *  (Featured Items, category rows, Best Sellers/Hamsa & Eye swipers) —
   *  the CSS lets that carousel claim left/right drags instead of the
   *  page-scroll protection a plain grid card needs. Whether the card's
   *  OWN per-photo swipe still works on top of that is controlled by
   *  carouselAware below. */
  swipeable?: boolean;
  /** Only meaningful when swipeable is false. true = the card still cycles
   *  its own photos on a left/right drag, but only while there's a next/
   *  previous photo to show — once the drag would go past the product's
   *  first or last photo, the whole gesture is handed off untouched to the
   *  surrounding carousel so it moves to the next/previous CARD instead.
   *  This is what lets "swipe the photo to see the next photo" and "swipe
   *  the row to see the next product" coexist on the same drag axis.
   *  Used by the three JS-driven home page carousels (Featured Items,
   *  Hamsa & Eye, Best Sellers). Left off for Category Carousel, which
   *  scrolls natively rather than via hand-rolled JS, and off for the
   *  swipeable=true case, which has no surrounding carousel to hand off to
   *  anyway. */
  carouselAware?: boolean;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addItem } = useCart();
  const router = useRouter();
  // If this product has any color/size/etc. options, the quick "Add to
  // Cart" button on the grid can't add it blind — there'd be no way to
  // know which one the customer wants. Instead of adding, it sends the
  // customer to the product page so they can pick a variation there.
  // Products with no variation rows at all skip this and add normally.
  const hasVariations = (product.product_variations?.length ?? 0) > 0;
  // For a product with variations, real stock lives on each variation row,
  // not on the product's own "Stock Quantity" field in the admin form —
  // that field is easy to leave at its default of 0 since it's not the
  // number that actually gets watched for a variable product. Checking
  // product.stock_quantity alone was making the card think a product like
  // the letter bracelets was out of stock (silently disabling the "+"
  // button, so pressing it did nothing and never opened the product page)
  // even though every variation had plenty of stock. Now: a product with
  // variations is only treated as out of stock if every one of its
  // variations is at 0; a product with no variations still uses its own
  // stock_quantity exactly as before.
  const isOutOfStock = hasVariations
    ? product.product_variations!.every((v) => v.stock_quantity <= 0)
    : product.stock_quantity === 0;
  const [justAdded, setJustAdded] = useState(false);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Which photo is currently showing. 0 = main image. Swiping on mobile,
  // or hovering on desktop, can move this to any image the product has.
  const [activeIndex, setActiveIndex] = useState(0);
  // Cycles forward through the photos (1st -> 2nd -> 3rd -> ...) for as
  // long as the mouse stays over the card, and stops on the last photo —
  // it does NOT loop back around to the 1st while still hovering. The
  // 1st -> 2nd swap is quicker (300ms) than every swap after that (800ms),
  // so we chain setTimeouts (each one scheduling the next with its own
  // delay) instead of using a single fixed-interval setInterval, which
  // could only ever use one delay for every swap.
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The grid card only ever swipes through the first 3 photos — any more
  // than that are still there and visible on the product's own page, just
  // not loaded/swipeable from the card itself.
  const allImages = product.product_images && product.product_images.length > 0 ? product.product_images : [];
  const images = allImages.slice(0, 3);
  const activeImageObj = images[activeIndex];
  const focalPoint = activeImageObj?.focal_point || 'center center';
  const displayPrice = product.sale_price ?? product.price;

  // ---- Desktop hover preview: cycle through every photo while hovering ----
  // Schedules the swap from `fromIndex` to the next photo: 300ms for the
  // 1st -> 2nd swap, 800ms for every swap after that (2nd -> 3rd, 3rd -> 4th,
  // etc). Stops once it reaches the last photo instead of wrapping back to
  // the 1st — the wrap-around while still hovering was itself the thing
  // making it feel like it kept "going back to the first image".
  const scheduleNextPhoto = (fromIndex: number) => {
    if (fromIndex >= images.length - 1) return;
    const delay = fromIndex === 0 ? 300 : 800;
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveIndex((prev) => {
        const next = prev + 1;
        scheduleNextPhoto(next);
        return next;
      });
    }, delay);
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    scheduleNextPhoto(activeIndex);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Reset to the 1st photo right away — no delay. This is safe now
    // because both handlers fully clear the pending timeout before doing
    // anything else, so a fast enter/leave/enter can't race with a stale
    // timer the way it used to.
    setActiveIndex(0);
  };

  // Clear any pending swap/timer if the card unmounts mid-hover or mid-animation
  useEffect(() => () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
  }, []);

  // ---- Mobile swipe: drag left/right on the image to see the next/previous
  // photo, without hijacking an ordinary vertical scroll. The real fix for
  // "scrolling the page also drags the card" was CSS (touch-action: pan-y
  // now lives on the outer scaled/contained card box too, not just this
  // image link — see [data-component='product-card'] in globals.css; that
  // box's own transform: scale() + contain: paint combo was what let a
  // vertical drag get misread as belonging to the card instead of the
  // page on iOS Safari/mobile Chrome). This JS is a second layer on top of
  // that: it only ever intercepts a touch once the gesture has clearly
  // moved MORE horizontally than vertically, so plain up/down scrolling is
  // never touched. ----
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const wasSwipeRef = useRef(false);
  // Once a touch starts moving, records whether the gesture reads as
  // horizontal or vertical so far — set on the first touchmove past a
  // small jitter threshold, then left alone for the rest of that touch.
  const swipeDirRef = useRef<'horizontal' | 'vertical' | null>(null);
  const imageWrapRef = useRef<HTMLAnchorElement>(null);
  // For a carouselAware card: decided once, the moment the drag commits to
  // horizontal — true if this product has a next/previous photo to show in
  // that direction (so the card keeps the gesture for itself), false if it
  // doesn't (so the gesture is hand off to the surrounding carousel
  // instead). Not touched again for the rest of that same touch, so a
  // single continuous drag can't half-consume, half-hand-off.
  const consumeSwipeRef = useRef<boolean | null>(null);
  // Read inside the touchmove listener without needing to re-subscribe it
  // every time a photo swap changes activeIndex mid-hover.
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);
  const touchEnabled = swipeable || carouselAware;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!touchEnabled || images.length < 2) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    swipeDirRef.current = null;
    consumeSwipeRef.current = null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!touchEnabled || !start || images.length < 2) return;
    // This gesture was handed off to the carousel back in onTouchMove
    // below — it's not this card's photo to move, and it shouldn't block
    // the card's own link click either (there was no visible photo swap).
    if (swipeDirRef.current === 'horizontal' && consumeSwipeRef.current === false) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const SWIPE_THRESHOLD = 30;

    // Only treat it as a swipe if the movement was mostly horizontal —
    // that keeps ordinary up/down page scrolling working normally.
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      wasSwipeRef.current = true;
      if (dx < 0) {
        setActiveIndex((i) => Math.min(i + 1, images.length - 1));
      } else {
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
    }
  };

  // A touchmove listener registered non-passive (React's onTouchMove can't
  // call preventDefault) so a gesture that's committed to "horizontal" can
  // block the browser from also trying to scroll the page during the
  // swipe. Requires a clearly horizontal-dominant move (not just 1px more
  // sideways than vertical) before committing, so an ordinary scroll that
  // starts with a little sideways wobble is never mistaken for a swipe.
  useEffect(() => {
    const el = imageWrapRef.current;
    if (!el || !touchEnabled || images.length < 2) return;

    const onTouchMove = (e: TouchEvent) => {
      const start = touchStartRef.current;
      if (!start) return;
      const t = e.touches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;

      if (swipeDirRef.current === null) {
        // Ignore the first few pixels of pure jitter before committing to
        // a direction, and require the horizontal move to clearly
        // dominate (1.3x) rather than just barely edge out the vertical
        // one, so scroll gestures with slight sideways drift stay scrolls.
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        swipeDirRef.current = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'horizontal' : 'vertical';

        // Decide once, right as the drag commits to horizontal, whether
        // THIS card has a next/previous photo to show in that direction.
        // For a plain swipeable card there's no carousel to hand off to,
        // so it always keeps the gesture. For a carouselAware card: if
        // there's a photo to move to, keep the gesture (photo swap); if
        // not — already on the last photo and still dragging left, say —
        // leave it alone entirely so the surrounding carousel's own
        // touchmove listener (which this event still bubbles up to,
        // since we won't call preventDefault/stopPropagation below) can
        // take over and move to the next/previous card instead.
        if (swipeDirRef.current === 'horizontal') {
          if (carouselAware && !swipeable) {
            const wantsNext = dx < 0;
            consumeSwipeRef.current = wantsNext
              ? activeIndexRef.current < images.length - 1
              : activeIndexRef.current > 0;
          } else {
            consumeSwipeRef.current = true;
          }
        }
      }

      if (swipeDirRef.current === 'horizontal' && consumeSwipeRef.current) {
        e.preventDefault();
        // Keep this gesture from also reaching the carousel track's own
        // touchmove listener — without this, a photo swap and a carousel
        // scroll could both fire off the same drag.
        e.stopPropagation();
      }
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [images.length, swipeable, carouselAware, touchEnabled]);

  // A swipe shouldn't also trigger the card's link navigation — and
  // shouldn't fire select_item either, since nothing was actually
  // "selected" in that case.
  const handleImageLinkClick = (e: React.MouseEvent) => {
    if (wasSwipeRef.current) {
      e.preventDefault();
      wasSwipeRef.current = false;
      return;
    }
    fireSelectItem();
  };

  // GA4's select_item — a product was clicked from a listing/grid (as
  // opposed to view_item, which fires once the resulting product page
  // itself loads in ProductDetail.tsx). Shared by both links into the
  // product page (the photo and the name) so either path counts.
  const fireSelectItem = () => {
    gaEvent('select_item', {
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: displayPrice,
        },
      ],
    });
  };

  const handleAddToCart = () => {
    if (hasVariations) {
      router.push(`/product/${product.slug}`);
      return;
    }
    addItem({
      product_id: product.id,
      slug: product.slug,
      variation_id: null,
      name: product.name,
      variation_label: null,
      price: displayPrice,
      image_url: images[0]?.image_url ?? null,
      quantity: 1,
    });
    // Force the "added" animation to restart even if the button was
    // clicked again while it was still playing from a previous add.
    // Simply calling setJustAdded(true) when it's already true is a
    // no-op re-render, so the CSS animation (which only plays when the
    // class is freshly applied) silently fails to replay — that's what
    // made it look like it "didn't work" on some clicks. Toggling off,
    // waiting two animation frames, then toggling back on guarantees the
    // browser sees the class removed and re-added, so the animation
    // reliably plays on every single click.
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    setJustAdded(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setJustAdded(true);
        addedTimerRef.current = setTimeout(() => setJustAdded(false), 1200);
      });
    });
  };

  return (
    <div className="product-card-frame" data-reveal>
      <div
        data-component="product-card"
        data-swipeable={swipeable ? undefined : 'false'}
        data-sold-out={isOutOfStock ? 'true' : undefined}
      >
        <Link
          ref={imageWrapRef}
          href={`/product/${product.slug}`}
          className="product-card-image-wrap"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleImageLinkClick}
        >
          {images.length > 0 ? (
            <div
              className="product-card-image-track"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {images.map((img, i) => (
                <div className="product-card-image-slide" key={img.id}>
                  <Image
                    src={img.image_url}
                    alt={img.label || product.name}
                    width={294}
                    height={332}
                    // These card thumbnails are capped at 3 photos and are
                    // small — cheap to load right away. Without this, the
                    // 2nd/3rd photo only starts downloading once hover
                    // actually swaps to it, so it visibly finishes loading
                    // (and settles into place) right as it's revealed,
                    // which looked like a zoom/glitch rather than a clean
                    // swap.
                    loading="eager"
                    style={{
                      // `cover` (not `contain`) is the default here now —
                      // it scales the photo up just enough to completely
                      // fill the card with zero letterboxing, so there's
                      // never any cream showing on the sides regardless of
                      // the photo's own proportions. Use focal_point to
                      // choose which part of the photo survives that crop.
                      objectFit: img.object_fit || 'cover',
                      objectPosition: i === activeIndex ? focalPoint : 'center center',
                      // Zoom defaults to 1 (no extra scale) because `cover`
                      // above already fills the frame on its own — an
                      // additional scale here would crop the already-fit
                      // photo a 2nd time, cutting into the product instead
                      // of the empty space around it. Only photos with a
                      // deliberately-set zoom value in Supabase get pushed
                      // in further than that.
                      //
                      // Used to also scale up by an extra 1.08x while
                      // hovering (on top of a photo's own `zoom`, if any) —
                      // removed per request. The photo swap on hover
                      // (activeIndex cycling above) still happens exactly
                      // the same; only that extra hover-zoom is gone.
                      transform: `scale(${img.zoom || 1})`,
                      transition: 'transform 400ms ease',
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div data-placeholder-image>No image</div>
          )}
          {product.is_new && <span data-badge="new">New</span>}
          {isOutOfStock && <span data-badge="out-of-stock">Sold Out</span>}
          {images.length > 1 && (
            <div className="product-card-dots" aria-hidden="true">
              {images.map((img, i) => (
                <span key={img.id} className={`product-card-dot${i === activeIndex ? ' active' : ''}`} />
              ))}
            </div>
          )}
        </Link>

        <button
          type="button"
          aria-label="Toggle favorite"
          data-favorite-button
          data-active={isFavorite(product.id)}
          onClick={() => toggleFavorite(product.id)}
        >
          <span className="icon-svg icon-heart" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`atc-button${justAdded ? ' just-added' : ''}${compact ? ' atc-compact' : ''}`}
          disabled={isOutOfStock}
          onClick={handleAddToCart}
        >
          <span className="atc-icon-plus" aria-hidden="true">
            <span className="icon-svg icon-addtocart" aria-hidden="true" />
            <span className="icon-svg icon-check" aria-hidden="true" />
          </span>
          <span className="btn-label atc-full-label">
            {justAdded ? 'ADDED ✓' : isOutOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
          </span>
          <span className="btn-label atc-short-label" aria-hidden="true">
            ADD
          </span>
        </button>

        <div data-product-text-block>
          <Link href={`/product/${product.slug}`} onClick={fireSelectItem}>
            <h3 data-product-name>{product.name}</h3>
          </Link>

          <div data-product-price>
            {product.sale_price ? (
              <>
                <span data-price-sale>${formatPrice(product.sale_price)}</span>
                <span data-price-original>${formatPrice(product.price)}</span>
              </>
            ) : (
              <span>${formatPrice(displayPrice)}</span>
            )}
          </div>

          {product.style && <div data-product-material>{formatStyleLabel(product.style)}</div>}
        </div>
      </div>
    </div>
  );
}
