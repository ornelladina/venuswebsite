import { supabase } from './supabaseClient';
import { Collection } from '@/types';

// Every "Shop The Look" / collection card shows a price range ("$X - $Y")
// worked out automatically from the products actually inside that
// collection, so it always matches what's really in Supabase without
// anyone typing a number in by hand. Call this right after fetching any
// list of collections (Collection[] with only its own columns), and it
// returns the same list with price_min/price_max attached from a single
// batched query — one round trip no matter how many collections were
// passed in, instead of a query per card.
export async function withPriceRanges<T extends Collection>(collections: T[]): Promise<T[]> {
  if (collections.length === 0) return collections;

  const ids = collections.map((c) => c.id);
  const { data } = await supabase
    .from('collection_products')
    .select('collection_id, products(price, sale_price, is_active)')
    .in('collection_id', ids);

  const ranges = new Map<string, { min: number; max: number }>();
  (data ?? []).forEach((row: any) => {
    const product = row.products;
    // Skip products that no longer exist / were deactivated — a
    // collection's displayed range should only reflect what a shopper
    // can actually buy right now.
    if (!product || product.is_active === false) return;
    // Sale price is what the shopper actually pays, so that's what the
    // range should reflect — same effective price ProductCard displays.
    const price = product.sale_price ?? product.price;
    if (typeof price !== 'number') return;

    const existing = ranges.get(row.collection_id);
    if (!existing) {
      ranges.set(row.collection_id, { min: price, max: price });
    } else {
      existing.min = Math.min(existing.min, price);
      existing.max = Math.max(existing.max, price);
    }
  });

  return collections.map((c) => {
    const range = ranges.get(c.id);
    return {
      ...c,
      price_min: range ? range.min : null,
      price_max: range ? range.max : null,
    };
  });
}
