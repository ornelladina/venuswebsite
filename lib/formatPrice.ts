// Every price on the site displays as a whole number, no cents — per
// request. Centralized here so it's one place to change if that ever
// needs to flip back. Rounds rather than truncates (e.g. $19.60 -> $20,
// not $19) since that's the more expected behavior for a shopper.
//
// NOT used by app/api/meta-feed/route.ts — Meta's feed spec requires a
// decimal amount (e.g. "12.00 USD"), so that file keeps its own
// .toFixed(2) regardless of this.
export function formatPrice(amount: number): string {
  return Math.round(amount).toString();
}
