'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CartItem } from '@/types';
import { gaEvent } from '@/lib/gtag';
import { useAccountSync } from '@/lib/useAccountSync';

const STORAGE_KEY = 'womanlylebanon_cart';

// Delivery pricing lives in lib/delivery.ts ($4 Beirut, $5 elsewhere, free
// from $75). Re-exported here so existing imports keep working.
export { getDeliveryFee } from '@/lib/delivery';

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variationId: string | null) => void;
  updateQuantity: (productId: string, variationId: string | null, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

// Used when a signed-in customer's saved cart meets the cart in this browser:
// every item from both, and if the same piece is in both, the larger quantity.
function mergeCarts(remote: CartItem[], local: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const item of [...remote, ...local]) {
    const key = `${item.product_id}|${item.variation_id ?? ''}`;
    const existing = map.get(key);
    if (!existing) map.set(key, { ...item });
    else existing.quantity = Math.max(existing.quantity, item.quantity);
  }
  return Array.from(map.values());
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load saved cart on first visit
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setItems(JSON.parse(saved));
    setLoaded(true);
  }, []);

  // Save cart whenever it changes
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  // Signed-in customers: keep the cart in step with their account.
  useAccountSync<CartItem>({
    column: 'cart',
    value: items,
    setValue: setItems,
    merge: mergeCarts,
    loaded,
  });

  const addItem = (newItem: CartItem) => {
    // GA4's add_to_cart — fired here rather than in ProductDetail/
    // ProductCard individually, since every "add to cart" click in the
    // app (product page, grid quick-add) ultimately calls this one
    // function. One place to fire it means it can't be missed on some
    // path and double-fired on another.
    gaEvent('add_to_cart', {
      currency: 'USD',
      value: newItem.price * newItem.quantity,
      items: [
        {
          item_id: newItem.product_id,
          item_name: newItem.name,
          item_variant: newItem.variation_label ?? undefined,
          price: newItem.price,
          quantity: newItem.quantity,
        },
      ],
    });

    setItems((prev) => {
      const existing = prev.find(
        (i) => i.product_id === newItem.product_id && i.variation_id === newItem.variation_id
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + newItem.quantity } : i
        );
      }
      return [...prev, newItem];
    });
  };

  const removeItem = (productId: string, variationId: string | null) => {
    setItems((prev) =>
      prev.filter((i) => !(i.product_id === productId && i.variation_id === variationId))
    );
  };

  const updateQuantity = (productId: string, variationId: string | null, quantity: number) => {
    // Pressing "-" down to 0 removes the item, instead of silently doing
    // nothing — matches what people expect from a cart quantity stepper.
    if (quantity < 1) {
      removeItem(productId, variationId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product_id === productId && i.variation_id === variationId ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
