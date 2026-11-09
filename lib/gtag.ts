// Thin wrapper around the GA4 gtag() global that components/
// GoogleAnalytics.tsx loads in the root layout. Used to fire the standard
// ecommerce events GA4's Monetization report expects — view_item,
// select_item, add_to_cart, begin_checkout, purchase — from wherever
// those actions actually happen (ProductDetail, ProductCard,
// CartContext, checkout).
//
// Safe to call from anywhere on the client: no-ops (does nothing, throws
// nothing) if gtag hasn't loaded yet — e.g. an ad blocker stripped the
// script, or this runs before the <Script> tag has executed.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type GAItem = {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_variant?: string;
};

export function gaEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params);
}
