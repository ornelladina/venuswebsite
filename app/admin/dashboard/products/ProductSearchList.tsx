'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DeleteProductButton from './DeleteProductButton';
import CopyLinkButton from './CopyLinkButton';
import StockEditor from './StockEditor';
import { isProductSoldOut } from '@/lib/soldOut';
import { SITE_URL } from '@/lib/siteUrl';
import { formatPrice } from '@/lib/formatPrice';

function ProductRow({ product }: { product: any }) {
  const thumb = product.product_images?.[0]?.image_url as string | undefined;
  return (
    <div data-admin-product-row>
      <div data-admin-product-thumb>
        {thumb ? (
          <Image src={thumb} alt={product.name} width={64} height={64} />
        ) : (
          <div data-admin-order-item-noimage>No photo</div>
        )}
      </div>

      <div data-admin-product-info>
        <p data-admin-product-name>{product.name}</p>
        <p data-admin-product-meta>
          {product.categories?.name ?? 'Uncategorized'} · ${formatPrice(product.price)}
        </p>
        <div data-admin-product-badges>
          {isProductSoldOut(product) && <span data-admin-badge data-admin-badge-danger>Out of Stock</span>}
          {!product.is_active && <span data-admin-badge data-admin-badge-muted>Hidden</span>}
          {product.is_new && <span data-admin-badge>New</span>}
          {product.is_featured && <span data-admin-badge>Featured</span>}
          {product.is_best_seller && <span data-admin-badge>Best Seller</span>}
          {product.is_set && <span data-admin-badge>Sets</span>}
          {product.is_hamsa_eye && <span data-admin-badge>Hamsa &amp; Eye</span>}
          {product.is_classical && <span data-admin-badge>Classical</span>}
        </div>
      </div>

      {/* Edit the stock number right here instead of opening each product. */}
      <StockEditor product={product} />

      <div data-admin-product-actions>
        <Link href={`/admin/dashboard/products/${product.id}`} data-admin-btn-secondary>
          Edit
        </Link>
        {/* For sharing on FB/IG: since Lebanon can't use native IG Shopping
            tags, this copies the direct product page link to paste into a
            caption, bio, or DM reply. */}
        <CopyLinkButton url={`${SITE_URL}/product/${product.slug}`} />
        <Link href={`/product/${product.slug}`} target="_blank" data-admin-btn-secondary>
          View
        </Link>
        <DeleteProductButton id={product.id} name={product.name} />
      </div>
    </div>
  );
}

export default function ProductSearchList({
  groups,
  showGroupHeaders,
}: {
  groups: { key: string; label: string; items: any[] }[];
  showGroupHeaders: boolean;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // Filters within each already-computed style group rather than
  // re-fetching — the full product list (with images) is already loaded
  // on this page, so filtering client-side means results appear as you
  // type instead of on every keystroke round-tripping to the server.
  const filteredGroups = groups.map((g) => ({
    ...g,
    filteredItems: q ? g.items.filter((p: any) => p.name.toLowerCase().includes(q)) : g.items,
  }));
  const totalMatches = filteredGroups.reduce((sum, g) => sum + g.filteredItems.length, 0);

  return (
    <>
      <input
        type="search"
        placeholder="Search products by name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-admin-product-search
        aria-label="Search products by name"
      />

      {q && totalMatches === 0 && <p data-admin-empty>No products match &ldquo;{query}&rdquo;.</p>}

      {filteredGroups.map((g) => (
        <section key={g.key} data-admin-subsection>
          {showGroupHeaders && g.filteredItems.length > 0 && (
            <h2>
              {g.label} ({g.filteredItems.length})
            </h2>
          )}
          {g.filteredItems.length === 0 ? (
            // Only show "nothing tagged here" for a genuinely empty group —
            // while searching, an empty group just means no match in it,
            // which the top-level "No products match" message above
            // already covers, so stay silent per-group instead of
            // repeating that for every unmatched group.
            !q && <p data-admin-empty>No products tagged {g.label} yet.</p>
          ) : (
            <div data-admin-product-list>
              {g.filteredItems.map((p: any) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
