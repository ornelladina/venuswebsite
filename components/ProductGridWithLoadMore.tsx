'use client';

import { useState } from 'react';
import { Product } from '@/types';
import ProductCard from './ProductCard';

// How many products are shown before the "Load More" button appears, and
// how many more are revealed each time it's pressed. 20 fills 10 rows of
// the 2-column grid before someone needs to press it.
const PAGE_SIZE = 20;

export default function ProductGridWithLoadMore({ products }: { products: Product[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  return (
    <>
      <div data-grid="products">
        {visibleProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          className="load-more-button"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          Load More
        </button>
      )}
    </>
  );
}
