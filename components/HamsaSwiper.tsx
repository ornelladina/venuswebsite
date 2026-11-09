'use client';

import { useEffect, useRef, useState } from 'react';
import ProductCard from './ProductCard';
import CollectionCard from './CollectionCard';
import { GridItem } from '@/types';
import { smoothScrollTo } from '@/lib/smoothScroll';
import { useSwipeCarousel } from '@/lib/useSwipeCarousel';

// Mobile-only "one big card at a time" version of the Hamsa & Eye grid.
// Desktop keeps the plain grid (.hamsa-products-grid, still rendered
// alongside this); CSS hides whichever one doesn't apply for the current
// screen width (see .hamsa-swiper / .hamsa-products-grid in globals.css).
// A hand-controlled drag (see useSwipeCarousel) does the paging now,
// instead of relying on native scroll-snap momentum — this component just
// watches scroll position to keep the dots in sync, and lets tapping a
// dot jump to that slide.
export default function HamsaSwiper({ items }: { items: GridItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  useSwipeCarousel(trackRef);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateActiveIndex = () => {
      const slideWidth = track.clientWidth;
      if (!slideWidth) return;
      const index = Math.round(track.scrollLeft / slideWidth);
      setActiveIndex(Math.max(0, Math.min(index, items.length - 1)));
    };

    updateActiveIndex();
    track.addEventListener('scroll', updateActiveIndex, { passive: true });
    return () => track.removeEventListener('scroll', updateActiveIndex);
  }, [items.length]);

  const scrollToIndex = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    smoothScrollTo(track, i * track.clientWidth);
  };

  if (items.length === 0) return null;

  return (
    <div className="hamsa-swiper">
      <div className="hamsa-swiper-track" ref={trackRef}>
        {items.map((item) => {
          const key = item.type === 'product' ? `product-${item.product.id}` : `collection-${item.collection.id}`;
          return (
            <div className="hamsa-swiper-slide" key={key}>
              {item.type === 'product' ? (
                <ProductCard product={item.product} compact swipeable={false} carouselAware />
              ) : (
                <CollectionCard collection={item.collection} />
              )}
            </div>
          );
        })}
      </div>

      {items.length > 1 && (
        <div className="hamsa-swiper-dots" role="tablist" aria-label="Hamsa & Eye products">
          {items.map((item, i) => {
            const key = item.type === 'product' ? `product-${item.product.id}` : `collection-${item.collection.id}`;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Show item ${i + 1} of ${items.length}`}
                className={`hamsa-swiper-dot${i === activeIndex ? ' active' : ''}`}
                onClick={() => scrollToIndex(i)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
