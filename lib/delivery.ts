// Delivery pricing, in one place so the cart, checkout and admin all agree.
//
// $4 in Beirut, $5 everywhere else, and FREE once the items total reaches
// FREE_DELIVERY_THRESHOLD. Prices show as whole numbers on the site, so the
// comparison uses the rounded subtotal: if the cart reads $75, it qualifies.
//
// The real fee is calculated again inside the database (place_order in
// supabase/migration_free_delivery.sql). If you change a number here, change
// it there too.
export const FREE_DELIVERY_THRESHOLD = 75;

export function qualifiesForFreeDelivery(subtotal: number): boolean {
  return Math.round(subtotal) >= FREE_DELIVERY_THRESHOLD;
}

export function amountToFreeDelivery(subtotal: number): number {
  return Math.max(0, FREE_DELIVERY_THRESHOLD - Math.round(subtotal));
}

export function getDeliveryFee(city: string, subtotal = 0): number {
  if (qualifiesForFreeDelivery(subtotal)) return 0;
  return city.trim().toLowerCase() === 'beirut' ? 4 : 5;
}
