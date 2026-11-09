'use client';

import { useEffect, useRef, useState } from 'react';
import ProductCard from './ProductCard';
import CollectionCard from './CollectionCard';
import { GridItem } from '@/types';
import { smoothScrollTo } from '@/lib/smoothScroll';
import { useSwipeCarousel } from '@/lib/useSwipeCarousel';

// Mobile-only "one big card at a time" version of the Best Sellers grid —
// same pattern as components/HamsaSwiper.tsx. Desktop keeps the plain grid
// (data-grid="products" in app/page.tsx, still rendered alongside this);
// CSS hides whichever one doesn't apply for the current screen width (see
// .best-seller-swiper / [data-grid='products'] in globals.css). Each slide
// is wrapped in .best-seller-card-frame so the pattern background that
// shows on desktop's grid cards carries over here too.
export default function BestSellersSwiper({ items }: { items: GridItem[] }) {
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
    <div className="best-seller-swiper">
      <div className="best-seller-swiper-track" ref={trackRef}>
        {items.map((item) => {
          const key = item.type === 'product' ? `product-${item.product.id}` : `collection-${item.collection.id}`;
          return (
            <div className="best-seller-swiper-slide" key={key}>
              <div className="best-seller-card-frame">
                {item.type === 'product' ? (
                  <ProductCard product={item.product} compact swipeable={false} carouselAware />
                ) : (
                  <CollectionCard collection={item.collection} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 1 && (
        <div className="best-seller-swiper-dots" role="tablist" aria-label="Best Sellers">
          {items.map((item, i) => {
            const key = item.type === 'product' ? `product-${item.product.id}` : `collection-${item.collection.id}`;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Show item ${i + 1} of ${items.length}`}
                className={`best-seller-swiper-dot${i === activeIndex ? ' active' : ''}`}
                onClick={() => scrollToIndex(i)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
