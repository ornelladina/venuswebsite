'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCart } from './CartContext';
import { computeOffers, OfferResult } from '@/lib/offers';

// Works out the bundle offers (see lib/offers.ts) for whatever is in the
// cart right now. Cart items don't remember their category, so this looks
// each product's category up once and keeps it. Looking it up (instead of
// storing it in the cart) means carts saved before this offer existed
// work too.
//
// `ready` is false only for the brief moment while the lookup is running.
// Checkout waits for it so an order is never placed without its discount.
const categoryCache: Record<string, string | null> = {};

export function useCartOffers(): OfferResult & { ready: boolean; subtotalAfterOffers: number } {
  const { items, subtotal } = useCart();
  const [, bump] = useState(0);
  const [failed, setFailed] = useState(false);

  const missingIds = useMemo(
    () => Array.from(new Set(items.map((i) => i.product_id))).filter((id) => !(id in categoryCache)),
    [items]
  );

  useEffect(() => {
    if (missingIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, categories(slug)')
        .in('id', missingIds);
      if (cancelled) return;
      if (error || !data) {
        setFailed(true);
        return;
      }
      for (const row of data as any[]) {
        const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
        categoryCache[row.id] = cat?.slug ?? null;
      }
      // Products that no longer exist: remember them as "no category".
      for (const id of missingIds) if (!(id in categoryCache)) categoryCache[id] = null;
      bump((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [missingIds]);

  const result = computeOffers(items, categoryCache);
  // If the lookup fails (e.g. no internet), don't block the cart or
  // checkout — it just shows normal prices.
  const ready = missingIds.length === 0 || failed;

  return { ...result, ready, subtotalAfterOffers: subtotal - result.discount };
}
