'use client';

import { useRef, useState } from 'react';
import { Product, Collection } from '@/types';
import ProductCard from './ProductCard';
import CollectionCard from './CollectionCard';

type StyleItem =
  | { type: 'product'; display_order: number; product: Product }
  | { type: 'collection'; display_order: number; collection: Collection };

type StyleSection = {
  slug: string;
  tabLabel: string;
  items: StyleItem[];
};

// Minimum horizontal drag, in px, to count as a swipe between tabs — same
// threshold as StyleSwipeNav (which does the equivalent thing between
// /style/[slug] pages), kept in sync so a swipe feels the same everywhere
// on the site.
const SWIPE_THRESHOLD = 50;

// Tab row + grid for a category page. Pressing a tab swaps which style's
// items are shown below — no page navigation, no scrolling to a
// different part of the page. Only styles that have at least one tagged
// product or collection in this category are passed in as `sections`, so
// whichever tab is first is shown by default.
//
// The grid slides in from the right when moving to a tab further right
// (e.g. Gold-Plated -> Stainless Steel) and from the left when moving to
// one further left, matching the tabs' left-to-right order. `panelKey`
// bundles the active slug with the direction so React remounts the panel
// on every switch, which restarts the CSS animation each time.
//
// A drag/swipe left or right anywhere in this section — the tab row, the
// gap between cards, empty space below a short row, etc. — also moves to
// the neighboring tab in that same left-to-right order (swipe left =
// next, swipe right = previous — the standard "swipe left to advance"
// convention), same Pointer Events approach as StyleSwipeNav. Uses Pointer Events (not Touch Events) so it works for
// both a finger swipe on mobile and a mouse/trackpad drag on desktop.
// The wrapper below gets the shared .swipe-nav-pointer class (see
// globals.css) — without it, the browser treats any vertical wobble in
// the drag as an attempt to scroll the page and cancels the pointer
// sequence before pointerup ever fires, so the swipe would almost never
// register.
// Individual product-card photo swipes (touch-based, see ProductCard)
// are excluded from this: handlePointerDown below ignores any drag that
// starts on a card's own image (.product-card-image-wrap), so a swipe on
// a product photo only ever cycles that card's photos and never also
// switches tabs.
export default function CategoryStyleTabs({ sections }: { sections: StyleSection[] }) {
  const [activeSlug, setActiveSlug] = useState(sections[0]?.slug);
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const active = sections.find((s) => s.slug === activeSlug) ?? sections[0];
  const activeIndex = sections.findIndex((s) => s.slug === active?.slug);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const handleSelect = (slug: string) => {
    const nextIndex = sections.findIndex((s) => s.slug === slug);
    if (nextIndex === activeIndex) return;
    setDirection(nextIndex > activeIndex ? 'right' : 'left');
    setActiveSlug(slug);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // A drag that starts on a product card's own photo is that card's own
    // left/right swipe between its photos (see ProductCard.tsx), not a
    // request to switch tabs. Without this check, one physical swipe on
    // a card image did both at once: cycled the card's photo AND
    // switched to the next/previous tab. Not tracking the drag at all
    // here means it's left entirely to the card's own touch handlers.
    if (e.target instanceof Element && e.target.closest('.product-card-image-wrap')) {
      pointerStart.current = null;
      return;
    }
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;

    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;

    // Mostly-vertical drags are ordinary scrolling, not a tab swipe.
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) return;

    // Swipe left (finger moves right-to-left, deltaX negative) -> next
    // tab; swipe right -> previous. This is the standard "swipe left to
    // advance" convention (like flipping to the next page/photo) — no
    // wraparound past the first/last tab.
    const nextIndex = deltaX < 0 ? activeIndex + 1 : activeIndex - 1;
    if (nextIndex < 0 || nextIndex >= sections.length) return;

    handleSelect(sections[nextIndex].slug);
  };

  return (
    <div
      className="swipe-nav-pointer"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
    >
      <nav className="style-tabs" aria-label="Shop by style">
        {sections.map((s) => (
          <a
            key={s.slug}
            href={`#${s.slug}`}
            data-active={s.slug === active?.slug}
            onClick={(e) => {
              e.preventDefault();
              handleSelect(s.slug);
            }}
          >
            {s.tabLabel}
          </a>
        ))}
      </nav>

      {active && (
        <section className="home-section category-style-panel-viewport">
          <div
            key={`${active.slug}-${direction}`}
            className={`category-style-panel category-style-panel-in-${direction}`}
            data-grid="products"
            style={{ marginTop: 40 }}
          >
            {active.items.map((item) =>
              item.type === 'product' ? (
                <ProductCard key={`product-${item.product.id}`} product={item.product} />
              ) : (
                <CollectionCard key={`collection-${item.collection.id}`} collection={item.collection} />
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}

