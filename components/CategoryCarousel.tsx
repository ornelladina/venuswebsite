'use client';

import { useRef } from 'react';
import ProductCard from './ProductCard';
import { Product } from '@/types';
import { smoothScrollTo } from '@/lib/smoothScroll';

// Used on the Shop All page: each category section gets one of these.
// Desktop: a single horizontally-scrolling row (same mechanics as the
// Featured Items carousel on the home page).
// Mobile: a 2-row grid that scrolls horizontally — cards fill down each
// column two at a time, so "Necklaces" shows 2 rows and you swipe right
// for more, instead of one long single-row strip.
export default function CategoryCarousel({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleNext = () => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>('.product-card-frame');
    const step = firstCard ? firstCard.offsetWidth + 16 : track.clientWidth * 0.8;

    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    smoothScrollTo(track, atEnd ? 0 : track.scrollLeft + step);
  };

  return (
    <div className="category-carousel">
      <div className="category-carousel-track" ref={trackRef}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} swipeable={false} />
        ))}
      </div>
      <button
        type="button"
        className="carousel-next-btn carousel-next-btn-small"
        onClick={handleNext}
        aria-label="Show more"
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
    </div>
  );
}
