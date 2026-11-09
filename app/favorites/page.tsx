'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product, Collection } from '@/types';
import { useFavorites } from '@/components/FavoritesContext';
import { useCart } from '@/components/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/formatPrice';

export default function FavoritesPage() {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  // Shop The Look collections can be favorited too (see the heart button
  // on CollectionCard.tsx) — favoriteIds is one shared list of ids for
  // both products and collections, so this page now looks each id up in
  // BOTH tables and renders whichever rows come back, instead of only
  // ever querying `products` and silently dropping any collection ids
  // (which used to just vanish here even though the heart on the card
  // itself showed as filled).
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  // Same "just clicked add" feedback as the product cards/detail page —
  // this row's button had none before. Tracked per product id since
  // several rows can be added to in quick succession.
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      if (favoriteIds.length === 0) {
        setProducts([]);
        setCollections([]);
        setLoading(false);
        return;
      }
      const [{ data: productData }, { data: collectionData }] = await Promise.all([
        supabase
          .from('products')
          .select('*, product_images(*), product_variations(*)')
          .order('display_order', { foreignTable: 'product_images', ascending: true })
          .in('id', favoriteIds)
          .eq('is_active', true),
        supabase.from('collections').select('*').in('id', favoriteIds).eq('is_active', true),
      ]);
      setProducts(productData ?? []);
      setCollections(collectionData ?? []);
      setLoading(false);
    }
    load();
  }, [favoriteIds]);

  if (loading) {
    return (
      <div data-page="favorites">
        <h1>Favorites</h1>
        <div data-empty-state>
          <p>Loading your favorites...</p>
        </div>
      </div>
    );
  }

  const isEmpty = products.length === 0 && collections.length === 0;

  return (
    <div data-page="favorites">
      <h1>Favorites</h1>

      {isEmpty ? (
        <div data-empty-state>
          <p>You haven&apos;t saved anything yet.</p>
          <Link href="/shop">Browse Products</Link>
        </div>
      ) : (
        <div data-favorites-list>
          {products.map((p) => {
            const image = p.product_images?.[0]?.image_url ?? null;
            const price = p.sale_price ?? p.price;
            return (
              <div key={p.id} data-favorite-row>
                <div data-favorite-image>
                  {image && <Image src={image} alt={p.name} width={90} height={90} />}
                </div>

                <div data-favorite-info>
                  <Link href={`/product/${p.slug}`} data-favorite-name>
                    {p.name}
                  </Link>
                  <span data-favorite-price>${formatPrice(price)}</span>
                </div>

                <button
                  type="button"
                  data-favorite-add
                  className={justAddedId === p.id ? 'just-added' : ''}
                  onClick={() => {
                    addItem({
                      product_id: p.id,
                      slug: p.slug,
                      variation_id: null,
                      name: p.name,
                      variation_label: null,
                      price,
                      image_url: image,
                      quantity: 1,
                    });
                    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
                    setJustAddedId(null);
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        setJustAddedId(p.id);
                        addedTimerRef.current = setTimeout(() => setJustAddedId(null), 1200);
                      });
                    });
                  }}
                >
                  {justAddedId === p.id ? 'Added ✓' : 'Add to Cart'}
                </button>

                <button type="button" data-cart-remove onClick={() => toggleFavorite(p.id)}>
                  Remove
                </button>
              </div>
            );
          })}

          {collections.map((c) => (
            <div key={c.id} data-favorite-row>
              <div data-favorite-image>
                <Image src={c.cover_image_url} alt={c.name} width={90} height={90} />
              </div>

              <div data-favorite-info>
                <Link href={`/collection/${c.slug}`} data-favorite-name>
                  {c.name}
                </Link>
                {/* Collections don't have a single price like a product
                    does (they're a curated set of several products), so
                    this just labels the row instead of showing a $ figure
                    that isn't really meaningful here. */}
                <span data-favorite-price>Collection</span>
              </div>

              <Link href={`/collection/${c.slug}`} data-favorite-add>
                View
              </Link>

              <button type="button" data-cart-remove onClick={() => toggleFavorite(c.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
