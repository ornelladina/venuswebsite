'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/components/CartContext';
import { formatPrice } from '@/lib/formatPrice';
import { amountToFreeDelivery, qualifiesForFreeDelivery, FREE_DELIVERY_THRESHOLD } from '@/lib/delivery';

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div data-page="cart">
        <h1>Your Cart</h1>
        <div data-empty-state>
          <p>Your cart is empty.</p>
          <Link href="/shop">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div data-page="cart">
      <h1>Your Cart</h1>

      <div data-cart-layout>
        <div data-cart-items>
          {items.map((item) => (
            <div key={`${item.product_id}-${item.variation_id}`} data-cart-row>
              {/* Links back to the product page via its id (see
                  /product-id/[id]) rather than the slug directly — this
                  works for every cart item including ones added before
                  slug-tracking existed, since product_id has always been
                  stored. */}
              <Link href={`/product-id/${item.product_id}`} data-cart-item-image>
                {item.image_url && (
                  <Image src={item.image_url} alt={item.name} width={90} height={90} />
                )}
              </Link>

              <div data-cart-item-info>
                <Link href={`/product-id/${item.product_id}`} data-cart-item-name>
                  {item.name}
                </Link>
                {item.variation_label && <p data-cart-item-variation>{item.variation_label}</p>}
                <p data-cart-item-price>${formatPrice(item.price)}</p>
              </div>

              <div data-quantity-selector>
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => updateQuantity(item.product_id, item.variation_id, item.quantity - 1)}
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => updateQuantity(item.product_id, item.variation_id, item.quantity + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                data-cart-remove
                onClick={() => removeItem(item.product_id, item.variation_id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div data-cart-summary>
          <h2>Order Summary</h2>
          <div data-summary-row>
            <span>Subtotal</span>
            <span>${formatPrice(subtotal)}</span>
          </div>
          <div data-summary-row>
            <span>Delivery Fee</span>
            <span>{qualifiesForFreeDelivery(subtotal) ? 'Free' : 'Calculated at checkout'}</span>
          </div>
          <p data-field-hint>
            {qualifiesForFreeDelivery(subtotal)
              ? `Free delivery on orders of $${FREE_DELIVERY_THRESHOLD}+ applied.`
              : `$4 delivery in Beirut, $5 elsewhere in Lebanon. Add $${amountToFreeDelivery(subtotal)} more for free delivery.`}
          </p>
          <Link href="/checkout" data-checkout-button>
            <span className="btn-label">Proceed to Checkout</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
