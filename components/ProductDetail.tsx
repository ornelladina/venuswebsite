'use client';

import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import Image from 'next/image';
import { Product, ProductVariation } from '@/types';
import { useCart } from './CartContext';
import { useFavorites } from './FavoritesContext';
import ShareButton from './ShareButton';
import CopyLinkButton from './CopyLinkButton';
import { formatPrice } from '@/lib/formatPrice';
import { gaEvent } from '@/lib/gtag';

export default function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const images = product.product_images ?? [];
  const variations = product.product_variations ?? [];
  const hasVariations = variations.length > 0;

  // GA4's view_item — fires once per real product-page load, giving you
  // "which products get opened" in Reports -> Monetization. Guarded to
  // product.id so navigating client-side between two product pages (the
  // "You May Also Like" cards below) fires it again for the new product
  // rather than being swallowed as "the same effect, already ran".
  useEffect(() => {
    gaEvent('view_item', {
      currency: 'USD',
      value: product.sale_price ?? product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.sale_price ?? product.price,
          quantity: 1,
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Group variations by type, e.g. { Color: [Gold, Silver], Size: [S, M, L] }
  const variationGroups = useMemo(() => {
    const groups: Record<string, ProductVariation[]> = {};
    for (const v of variations) {
      if (!groups[v.variation_type]) groups[v.variation_type] = [];
      groups[v.variation_type].push(v);
    }
    return groups;
  }, [variations]);

  const [selected, setSelected] = useState<Record<string, ProductVariation>>({});
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Cycle the main gallery image left/right, wrapping around at both ends
  // so the arrows (and swipe, below) always have somewhere to go.
  const goToImage = (direction: 1 | -1) => {
    if (images.length < 2) return;
    setActiveImage((prev) => (prev + direction + images.length) % images.length);
  };

  // Swipe support for the main image on touch devices. We only track the
  // horizontal distance between touchstart and touchend (no live drag/
  // follow-the-finger animation) — simpler and avoids the swipe fighting
  // with the page's own vertical scroll. A short threshold keeps small,
  // accidental touches from triggering a change.
  const touchStartXRef = useRef<number | null>(null);
  // Tracks whether the touch that just ended was a swipe (moved between
  // photos) rather than a plain tap — used below so a swipe never also
  // triggers the "tap the photo to jump to variations" behavior.
  const wasSwipeRef = useRef(false);
  const handleTouchStart = (e: TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    const SWIPE_THRESHOLD = 40;
    if (deltaX > SWIPE_THRESHOLD) {
      goToImage(-1);
      wasSwipeRef.current = true;
    } else if (deltaX < -SWIPE_THRESHOLD) {
      goToImage(1);
      wasSwipeRef.current = true;
    } else {
      wasSwipeRef.current = false;
    }
  };
  // Tapping/clicking the main photo jumps down to the variation options,
  // when there are any — a plain tap on a product shot is usually someone
  // wanting to pick a color/size, not just looking at the photo bigger.
  // Guarded by wasSwipeRef so swiping between photos never also triggers
  // this (a swipe still ends with a touchend, and most mobile browsers
  // won't synthesize a click after a real drag anyway, but this makes it
  // certain rather than relying on that).
  const handleImageClick = () => {
    if (wasSwipeRef.current) {
      wasSwipeRef.current = false;
      return;
    }
    if (hasVariations) {
      variationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  // This button had no "it worked" feedback at all before — clicking it
  // just silently added the item with nothing visibly changing on the
  // button itself. justAdded drives a brief pulse + label swap so it
  // matches the confirmation the product-grid cards already give.
  const [justAdded, setJustAdded] = useState(false);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pressing "Add to Cart" before a variation is chosen used to just do
  // nothing (the button was disabled + dimmed, which read as broken/
  // confusing). Now the button stays at full opacity and, if pressed too
  // early, shakes and a plain-text note appears near it — the note is
  // deliberately NOT on the button itself (that read as part of the
  // button's own label/state, which was confusing) and is styled as
  // ordinary body text, not the button's bold uppercase-weight label.
  const [showSelectPrompt, setShowSelectPrompt] = useState(false);
  const selectPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shakeButton, setShakeButton] = useState(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Wraps the whole photo+thumbnails block — scrolled back into view on
  // mobile when a variation pick swaps the main photo, see
  // selectImageForVariationValue above.
  const galleryRef = useRef<HTMLDivElement>(null);

  // Wraps the variation groups so that, when "Add to Cart" is pressed
  // before a variation is chosen, we can scroll/pan the page to bring
  // the options (and the "please select" note) into view — this also
  // covers the case where the options have scrolled off screen, which
  // is common on mobile.
  const variationsRef = useRef<HTMLDivElement>(null);

  // If a gallery image's `color_tag` (e.g. "Blue") matches the text of a
  // variation value being selected (e.g. a "Color" option worth "Blue"),
  // switch the main image to it. Falls through silently — nothing happens
  // — when no image has a matching color_tag, so it's opt-in per product:
  // it only lights up once someone sets color_tag on an image to match one
  // of that product's variation values. This is separate from `label`,
  // which is free-text notes (e.g. "pink hamsa animal bangle") and is
  // never used for matching.
  //
  // On mobile, also scroll back up to the photo — but ONLY when a match
  // actually swapped it, not on every variation tap. A product can have
  // several variation groups (Color AND Size); Size doesn't touch the
  // photo at all, so scrolling on those too would just yank the screen up
  // for nothing, then force a scroll back down to reach whichever group
  // hadn't been picked yet. Gated to mobile (matching [data-product-
  // gallery]'s own 768px breakpoint in globals.css) since desktop already
  // shows the photo and the options side by side — there's nothing to
  // scroll back to.
  const selectImageForVariationValue = (value: string) => {
    const matchIndex = images.findIndex(
      (img) => img.color_tag?.trim().toLowerCase() === value.trim().toLowerCase()
    );
    if (matchIndex === -1) return;
    setActiveImage(matchIndex);
    if (window.matchMedia('(max-width: 768px)').matches) {
      galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // A product is only "ready to add to cart" once every variation group has a pick
  const allGroupsSelected =
    !hasVariations || Object.keys(variationGroups).length === Object.keys(selected).length;

  // If any selected variation has a price override, use the first one found
  const activeVariation = Object.values(selected)[0];
  const price = activeVariation?.price_override ?? product.sale_price ?? product.price;

  const outOfStock = hasVariations
    ? activeVariation !== undefined && activeVariation.stock_quantity === 0
    : product.stock_quantity === 0;

  const handleAddToCart = () => {
    if (hasVariations && !allGroupsSelected) {
      if (selectPromptTimerRef.current) clearTimeout(selectPromptTimerRef.current);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      setShowSelectPrompt(true);
      selectPromptTimerRef.current = setTimeout(() => setShowSelectPrompt(false), 1800);

      // Bring the variation options into view (centered) so the note next
      // to them is actually visible — matters most on mobile, where the
      // options can easily be scrolled out of view when this button is
      // pressed.
      variationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Toggle off then back on across two animation frames so the shake
      // reliably restarts even if "Add to Cart" is clicked again quickly
      // before the previous shake finished (same technique as justAdded
      // below, and the matching comment in ProductCard.tsx).
      setShakeButton(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShakeButton(true);
          shakeTimerRef.current = setTimeout(() => setShakeButton(false), 500);
        });
      });
      return;
    }
    if (outOfStock) return;

    const variationLabel = hasVariations
      ? Object.values(selected)
          .map((v) => v.variation_value)
          .join(' / ')
      : null;

    addItem({
      product_id: product.id,
      slug: product.slug,
      variation_id: activeVariation?.id ?? null,
      name: product.name,
      variation_label: variationLabel,
      price,
      // Whichever photo is currently showing — for a color variation with
      // a matching color_tag image, selectImageForVariationValue above
      // already switched this to that photo, so the cart shows the actual
      // variation chosen rather than always the product's first image.
      image_url: images[activeImage]?.image_url ?? images[0]?.image_url ?? null,
      quantity,
    });

    // Toggle off then back on across two animation frames so the CSS
    // animation reliably restarts even if this is clicked again quickly
    // (see the matching comment in ProductCard.tsx for why that matters).
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
    <div data-page="product-detail">
      <div data-product-gallery ref={galleryRef}>
        <div data-main-image onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {images[activeImage] ? (
            <Image
              // Forces a clean remount on every swipe/tap instead of Next.js
              // reusing the same <img> and patching its src in place — that
              // reuse was the "sometimes shows the same image as the one we
              // swiped from" glitch, since the old photo could still be
              // showing while the new one was still loading into the same
              // element.
              key={images[activeImage].image_url}
              src={images[activeImage].image_url}
              alt={images[activeImage].label || product.name}
              width={600}
              height={600}
              onClick={handleImageClick}
              style={{
                // Cursor hints that the photo is tappable when it leads
                // somewhere (down to the variation options) — plain
                // default arrow when there's nothing to jump to.
                cursor: hasVariations ? 'pointer' : 'default',
                // This page's frame is a fixed 1:1 square (see
                // [data-main-image] in globals.css), but most product
                // photos aren't square themselves — `cover` was cropping
                // whatever didn't fit the square (usually the top/bottom
                // of a portrait photo), which read as the photo being
                // "zoomed in" and cutting off part of the product. `contain`
                // shows the entire photo inside the square instead (with a
                // thin margin of the frame's own background on two sides
                // when the photo isn't square), so nothing is ever cropped
                // off by default. An empty object_fit column now falls back
                // to `contain` to match. Only photos where you've
                // deliberately set object_fit to `cover` in Supabase keep
                // the old fill-the-frame/crop behavior.
                //
                // Removed the old per-photo `zoom` scale transform — with
                // different photos in the same product set to different
                // zoom values, swiping between them visibly popped/zoomed
                // each time. Every photo now just displays at its natural
                // fit with no scaling.
                objectFit: images[activeImage].object_fit || 'contain',
                objectPosition: images[activeImage].focal_point || 'center center',
              }}
            />
          ) : (
            <div data-placeholder-image>No image</div>
          )}

          {/* Only shown when there's more than one photo to move between —
              a single-image product has nowhere for the arrows to go. */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                data-gallery-arrow="prev"
                aria-label="Previous photo"
                onClick={() => goToImage(-1)}
              >
                <span className="icon-svg icon-chevron-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-gallery-arrow="next"
                aria-label="Next photo"
                onClick={() => goToImage(1)}
              >
                <span className="icon-svg icon-chevron-right" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        <div data-thumbnails>
          {/* Keyed by index rather than img.id: if two images for a product
              share a duplicate or missing id in the database, keying by id
              makes React reuse/misassign the wrong DOM node between them —
              tapping the 2nd thumbnail can then visually behave like it hit
              the 1st. The image order here is fixed for the life of this
              view (it's the query's display_order, not reorderable), so an
              index key is safe and removes that failure mode entirely. */}
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveImage(i)}
              data-active={i === activeImage}
            >
              <Image src={img.image_url} alt={img.label || `${product.name} photo ${i + 1}`} width={80} height={80} />
            </button>
          ))}
        </div>
      </div>

      <div data-product-info>
        <h1>{product.name}</h1>
        <p data-price>${formatPrice(price)}</p>
        {product.description && <p data-description>{product.description}</p>}

        {hasVariations && (
          <div data-variation-groups ref={variationsRef}>
            {Object.entries(variationGroups).map(([type, options]) => (
              <div key={type} data-variation-group>
                <span data-variation-label>{type}</span>
                <div data-variation-options>
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-selected={selected[type]?.id === opt.id}
                      disabled={opt.stock_quantity === 0}
                      onClick={() => {
                        setSelected((prev) => ({ ...prev, [type]: opt }));
                        selectImageForVariationValue(opt.variation_value);
                      }}
                    >
                      {opt.variation_value}
                      {opt.stock_quantity === 0 && ' (Out of stock)'}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Sits directly under the options themselves (not down by the
                button) and is what we scroll/pan to above, so it's the
                first thing visible when someone gets nudged back up here. */}
            {showSelectPrompt && <p data-select-note>Please select an option first.</p>}
          </div>
        )}

        <div data-quantity-selector>
          <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
          <span>{quantity}</span>
          <button onClick={() => setQuantity((q) => q + 1)}>+</button>
        </div>

        <button
          type="button"
          data-add-to-cart
          className={[justAdded ? 'just-added' : '', shakeButton ? 'shake' : '']
            .filter(Boolean)
            .join(' ')}
          disabled={outOfStock}
          onClick={handleAddToCart}
        >
          <span className="btn-label">
            {outOfStock ? 'Out of Stock' : justAdded ? 'Added ✓' : 'Add to Cart'}
          </span>
        </button>

        <div data-product-secondary-actions>
          <button
            type="button"
            data-favorite-button
            data-active={isFavorite(product.id)}
            onClick={() => toggleFavorite(product.id)}
          >
            <span className="icon-svg icon-heart" aria-hidden="true" />
            {isFavorite(product.id) ? 'Saved' : 'Save to Favorites'}
          </button>
          {/* Whichever photo is currently showing (matches a chosen
              color's photo if one's selected) — same images[activeImage]
              the cart line item itself uses, see handleAddToCart above. */}
          <ShareButton title={product.name} imageUrl={images[activeImage]?.image_url} />
          <CopyLinkButton />
        </div>
      </div>
    </div>
  );
}
