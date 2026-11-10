// Current bundle offers, in one place so the cart, checkout and order all
// agree.
//
// TO TURN AN OFFER OFF: change its `active: true` to `active: false`.
// TO CHANGE A PRICE: change `bundlePrice`.
// TO CHANGE HOW MANY PIECES: change `size`.
// `categorySlug` is the end of the category's web address, e.g. the
// Bracelets category lives at /category/bracelets, so its slug is
// "bracelets".
//
// How it works: for every full group of `size` pieces from that category
// in the cart, the customer pays `bundlePrice` for the group instead of
// the normal prices. Leftover pieces (e.g. a 4th bracelet) stay at their
// normal price. If the cart has more than one group, the pricier pieces
// are grouped first, so the customer gets the best deal. The offer never
// raises a price: if a group would cost less than the bundle price at
// normal prices, no discount is applied.
import type { CartItem } from '@/types';

export type BundleOffer = {
  id: string;
  active: boolean;
  categorySlug: string;
  /** Plural word used in messages, e.g. "bracelets". */
  label: string;
  size: number;
  bundlePrice: number;
};

export const BUNDLE_OFFERS: BundleOffer[] = [
  { id: 'bracelets-3', active: true, categorySlug: 'bracelets', label: 'bracelets', size: 3, bundlePrice: 25 },
  { id: 'rings-3', active: true, categorySlug: 'rings', label: 'rings', size: 3, bundlePrice: 18 },
];

export type AppliedOffer = {
  offer: BundleOffer;
  groups: number;
  discount: number;
  /** Text for the cart/checkout/order line, e.g. "3 bracelets for $25". */
  name: string;
};

export type OfferHint = {
  offer: BundleOffer;
  /** How many more pieces are needed to complete another group. */
  needed: number;
};

export type OfferResult = {
  applied: AppliedOffer[];
  hints: OfferHint[];
  discount: number;
};

export function offerTitle(o: BundleOffer): string {
  return `${o.size} ${o.label} for $${o.bundlePrice}`;
}

// categoryByProduct: product_id -> category slug (or null / missing).
export function computeOffers(
  items: CartItem[],
  categoryByProduct: Record<string, string | null | undefined>
): OfferResult {
  const applied: AppliedOffer[] = [];
  const hints: OfferHint[] = [];
  let discount = 0;

  for (const offer of BUNDLE_OFFERS) {
    if (!offer.active) continue;

    // One entry per single piece (a quantity of 2 counts as 2 pieces).
    const prices: number[] = [];
    for (const item of items) {
      if (categoryByProduct[item.product_id] !== offer.categorySlug) continue;
      for (let n = 0; n < item.quantity; n++) prices.push(item.price);
    }
    if (prices.length === 0) continue;

    prices.sort((a, b) => b - a); // priciest first
    const groups = Math.floor(prices.length / offer.size);

    let offerDiscount = 0;
    let usedGroups = 0;
    for (let g = 0; g < groups; g++) {
      const groupTotal = prices
        .slice(g * offer.size, (g + 1) * offer.size)
        .reduce((sum, p) => sum + p, 0);
      const saving = groupTotal - offer.bundlePrice;
      if (saving > 0) {
        offerDiscount += saving;
        usedGroups++;
      }
    }

    if (usedGroups > 0) {
      applied.push({ offer, groups: usedGroups, discount: offerDiscount, name: offerTitle(offer) });
      discount += offerDiscount;
    }

    const leftover = prices.length % offer.size;
    if (leftover > 0) hints.push({ offer, needed: offer.size - leftover });
  }

  return { applied, hints, discount };
}
