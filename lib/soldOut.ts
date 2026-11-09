// "Sold out goes last" — used by every page that lists products so a sold
// out item never sits in front of one you can actually buy.
//
// A product counts as sold out by the same rule the product card uses for
// its "Sold Out" badge: a product with variations is sold out only when
// EVERY variation is at 0 stock; a product without variations is sold out
// when its own stock is 0.
//
// The order you set (display order, newest first, etc.) is kept exactly as
// it was — sold out items are simply moved to the end, in their same
// relative order.
import type { Product, GridItem } from '@/types';

export function isProductSoldOut(product: Product): boolean {
  const variations = product.product_variations ?? [];
  if (variations.length > 0) return variations.every((v) => v.stock_quantity <= 0);
  return product.stock_quantity === 0;
}

export function soldOutLast<T extends Product>(products: T[]): T[] {
  const inStock: T[] = [];
  const soldOut: T[] = [];
  for (const p of products) (isProductSoldOut(p) ? soldOut : inStock).push(p);
  return [...inStock, ...soldOut];
}

// For lists that mix products with Shop The Look cards. Collection cards
// are never "sold out", so they stay among the in-stock items.
export function soldOutLastGrid(items: GridItem[]): GridItem[] {
  const inStock: GridItem[] = [];
  const soldOut: GridItem[] = [];
  for (const item of items) {
    (item.type === 'product' && isProductSoldOut(item.product) ? soldOut : inStock).push(item);
  }
  return [...inStock, ...soldOut];
}
