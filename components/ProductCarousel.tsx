'use client';

import { useEffect, useRef, useState } from 'react';
import ProductCard from './ProductCard';
import CollectionCard from './CollectionCard';
import { GridItem } from '@/types';
import { smoothScrollTo } from '@/lib/smoothScroll';
import { useSwipeCarousel } from '@/lib/useSwipeCarousel';

export default function ProductCarousel({ items }: { items: GridItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  useSwipeCarousel(trackRef);
  // Whether there's more to scroll to on the right. Hides the ">" button
  // once the last card is fully in view, and brings it back the moment
  // there's room to scroll again — either because the person scrolled back
  // left, or because more cards got added/resized into the track.
  const [showNext, setShowNext] = useState(true);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateShowNext = () => {
      // Small tolerance for sub-pixel rounding on some browsers/zoom levels.
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      setShowNext(!atEnd);
    };

    updateShowNext();

    track.addEventListener('scroll', updateShowNext, { passive: true });

    // Recompute whenever the track's own size or the cards inside it
    // change size/count — covers window resizes and cards being added
    // (e.g. more featured products loading in) or removed.
    const resizeObserver = new ResizeObserver(updateShowNext);
    resizeObserver.observe(track);
    Array.from(track.children).forEach((child) => resizeObserver.observe(child));

    return () => {
      track.removeEventListener('scroll', updateShowNext);
      resizeObserver.disconnect();
    };
  }, [items]);

  const handleNext = () => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>('.product-card-frame');
    const step = firstCard ? firstCard.offsetWidth + 24 : track.clientWidth * 0.8;
    smoothScrollTo(track, track.scrollLeft + step);
  };

  return (
    <div className="featured-carousel">
      <div className="featured-carousel-track" ref={trackRef}>
        {items.map((item) =>
          item.type === 'product' ? (
            <ProductCard key={`product-${item.product.id}`} product={item.product} compact swipeable={false} carouselAware />
          ) : (
            <CollectionCard key={`collection-${item.collection.id}`} collection={item.collection} />
          )
        )}
      </div>
      {showNext && (
        <button
          type="button"
          className="carousel-next-btn"
          onClick={handleNext}
          aria-label="Show more featured items"
        >
          <svg
            className="carousel-next-icon"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
