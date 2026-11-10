'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { useCartOffers } from '@/components/useCartOffers';
import { getDeliveryFee, amountToFreeDelivery, FREE_DELIVERY_THRESHOLD } from '@/lib/delivery';
import { getCustomerClient } from '@/lib/customerClient';
import { COUNTRY_CODES, DEFAULT_COUNTRY_ISO2, findCountry } from '@/lib/countryCodes';
import { formatPrice } from '@/lib/formatPrice';
import { gaEvent } from '@/lib/gtag';
import { SHOW_ACCOUNT } from '@/lib/featureFlags';

const LEBANON_CITIES: { group: string; cities: string[] }[] = [
  { group: 'Beirut', cities: ['Beirut'] },
  {
    group: 'Mount Lebanon',
    cities: [
      'Baabda', 'Hazmieh', 'Aley', 'Bhamdoun', 'Chouf', 'Deir el Qamar', 'Damour',
      'Jounieh', 'Kaslik', 'Zouk Mosbeh', 'Zouk Mikael', 'Jbeil (Byblos)', 'Amchit',
      'Antelias', 'Jal el Dib', 'Dbayeh', 'Zalka', 'Sin el Fil', 'Jdeideh',
      'Bikfaya', 'Broummana', 'Beit Mery', 'Choueifat', 'Aramoun',
    ],
  },
  {
    group: 'North Lebanon',
    cities: ['Tripoli', 'Zgharta', 'Ehden', 'Bcharre', 'Koura', 'Amioun', 'Batroun', 'Chekka', 'Halba', 'Akkar'],
  },
  {
    group: 'Bekaa',
    cities: ['Zahle', 'Chtaura', 'Baalbek', 'Rayak', 'Rachaya', 'Jib Jannine'],
  },
  {
    group: 'South Lebanon',
    cities: ['Saida (Sidon)', 'Sour (Tyre)', 'Jezzine', 'Nabatieh', 'Marjayoun', 'Bint Jbeil', 'Hasbaya'],
  },
];

export default function CheckoutPage() {
  const { items, subtotal: rawSubtotal, clearCart } = useCart();
  // Bundle offers (see lib/offers.ts). `subtotal` from here on is the
  // price AFTER offers, so delivery, the total and the saved order all
  // use the discounted number.
  const { applied, ready: offersReady, subtotalAfterOffers: subtotal } = useCartOffers();
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: '',
    countryIso2: DEFAULT_COUNTRY_ISO2,
    phone: '',
    address: '',
    city: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleCart, setStaleCart] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // GA4's begin_checkout — fires once when this page loads with a
  // non-empty cart (not on the empty-cart state below, and not again on
  // re-renders as form fields change). A ref rather than state since this
  // is a fire-once side effect, not something the UI needs to react to.
  const firedBeginCheckout = useRef(false);
  useEffect(() => {
    if (firedBeginCheckout.current || items.length === 0) return;
    firedBeginCheckout.current = true;
    gaEvent('begin_checkout', {
      currency: 'USD',
      value: subtotal,
      items: items.map((item) => ({
        item_id: item.product_id,
        item_name: item.name,
        item_variant: item.variation_label ?? undefined,
        price: item.price,
        quantity: item.quantity,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // $4 in Beirut, $5 everywhere else — recalculates the moment a city is
  // picked. Before that, form.city is '' which getDeliveryFee treats as
  // "not Beirut" (i.e. $5), so the summary shows the higher rate as a
  // safe default until a city narrows it down.
  // Free from $75 of items (see lib/delivery.ts). The database works the fee
  // out again on its own when the order is saved, so this is what the
  // customer sees, not what decides the final number.
  const deliveryFee = getDeliveryFee(form.city, subtotal);
  const toFreeDelivery = amountToFreeDelivery(subtotal);
  const total = subtotal + deliveryFee;

  const selectedCountry = findCountry(form.countryIso2) ?? findCountry(DEFAULT_COUNTRY_ISO2)!;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCountry = findCountry(e.target.value);
    setForm((prev) => ({
      ...prev,
      countryIso2: e.target.value,
      // Trim the existing digits down if they're now too long for the
      // newly selected country, instead of leaving an invalid number.
      phone: nextCountry ? prev.phone.slice(0, nextCountry.maxLength) : prev.phone,
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Digits only, no letters or symbols, capped to the selected
    // country's expected national number length.
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, selectedCountry.maxLength);
    setForm((prev) => ({ ...prev, phone: digitsOnly }));
  };

  const phoneIsValid =
    form.phone.length >= selectedCountry.minLength && form.phone.length <= selectedCountry.maxLength;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneTouched(true);

    if (!phoneIsValid) {
      setError(
        `Please enter a valid phone number for ${selectedCountry.name} (${selectedCountry.minLength === selectedCountry.maxLength
          ? `${selectedCountry.minLength} digits`
          : `${selectedCountry.minLength}-${selectedCountry.maxLength} digits`}).`
      );
      return;
    }

    if (!offersReady) {
      setError('One moment - we are applying your offers. Please press Confirm Order again.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setStaleCart(false);

    try {
      const { data: orderNumber, error: rpcError } = // Uses the shared client so that, if the customer is signed in, the order
      // is saved to their account. Guests just order as before.
      await getCustomerClient().rpc('place_order', {
        p_customer_name: form.fullName,
        p_phone: `+${selectedCountry.dialCode} ${form.phone}`,
        p_address: form.address,
        p_city: form.city,
        p_notes: form.notes || null,
        p_subtotal: subtotal,
        p_delivery_fee: deliveryFee,
        p_total: total,
        p_items: items.map((item) => ({
          product_id: item.product_id,
          variation_id: item.variation_id,
          product_name: item.name,
          variation_label: item.variation_label,
          unit_price: item.price,
          quantity: item.quantity,
          line_total: item.price * item.quantity,
        })).concat(
          // One negative line per offer, so the saved order (admin, emails,
          // WhatsApp message) shows the discount and its totals add up.
          applied.map((a) => ({
            product_id: null as unknown as string,
            variation_id: null,
            product_name: `Offer: ${a.name}${a.groups > 1 ? ` x ${a.groups}` : ''}`,
            variation_label: null,
            unit_price: -a.discount,
            quantity: 1,
            line_total: -a.discount,
          }))
        ),
      });

      if (rpcError || !orderNumber) throw rpcError ?? new Error('Could not create order');

      // GA4's purchase — the actual conversion event, feeding revenue
      // into Reports -> Monetization. Fired here (right after the order
      // is confirmed created, right before the cart that has the data is
      // cleared) rather than on the /checkout/success page, which only
      // receives the order number via the URL and has no access to the
      // items/prices anymore once the cart's been cleared.
      gaEvent('purchase', {
        transaction_id: String(orderNumber),
        currency: 'USD',
        value: total,
        shipping: deliveryFee,
        items: items.map((item) => ({
          item_id: item.product_id,
          item_name: item.name,
          item_variant: item.variation_label ?? undefined,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      clearCart();
      router.push(`/checkout/success?order=${orderNumber}`);
    } catch (err: unknown) {
      console.error(err);

      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : null;
      const detail =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : null;

      // Postgres foreign-key violation (23503) here means an item saved in
      // this browser's cart points to a product that no longer exists in
      // the database (it was deleted, or the database was reset after the
      // item was added). The fix is simply to clear the stale cart so the
      // customer can re-add current products — not a bug to "try again" on.
      const isStaleCartError =
        code === '23503' || (detail?.toLowerCase().includes('foreign key constraint') ?? false);

      if (isStaleCartError) {
        setStaleCart(true);
        setError(
          "One or more items in your cart are no longer available in our catalog, so we can't place this order. Please clear your cart and add the items again."
        );
      } else {
        setError(
          detail
            ? `Something went wrong placing your order: ${detail}`
            : 'Something went wrong placing your order. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearStaleCart = () => {
    clearCart();
    router.push('/shop');
  };

  if (items.length === 0) {
    return (
      <div data-page="checkout">
        <h1>Checkout</h1>
        <div data-empty-state>
          <p>Your cart is empty.</p>
          <Link href="/shop">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div data-page="checkout">
      <h1>Checkout</h1>

      <div data-checkout-layout>
        <div data-checkout-summary>
          <h2>Order Summary</h2>

          <div data-summary-items>
            {items.map((item) => (
              <div key={`${item.product_id}-${item.variation_id}`} data-summary-item>
                {/* Links via product_id (see /product-id/[id]) so it works
                    for every item including ones saved before slug-tracking
                    existed. */}
                <Link href={`/product-id/${item.product_id}`} data-summary-item-image>
                  {item.image_url && (
                    <Image src={item.image_url} alt={item.name} width={44} height={44} />
                  )}
                </Link>
                <div data-summary-item-info>
                  <Link href={`/product-id/${item.product_id}`} data-summary-item-name>
                    {item.name}
                    {item.variation_label && ` (${item.variation_label})`} × {item.quantity}
                  </Link>
                </div>
                <span data-summary-item-price>${formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div data-summary-totals>
            {applied.map((a) => (
              <div key={a.offer.id} data-summary-row data-offer-row>
                <span>Offer: {a.name}{a.groups > 1 ? ` × ${a.groups}` : ''}</span>
                <span>-${formatPrice(a.discount)}</span>
              </div>
            ))}
            <div data-summary-row>
              <span>Delivery Fee</span>
              <span>{deliveryFee === 0 ? 'Free' : `$${formatPrice(deliveryFee)}`}</span>
            </div>
            <p data-field-hint>
              {deliveryFee === 0
                ? `Free delivery on orders of $${FREE_DELIVERY_THRESHOLD}+ applied.`
                : `$4 in Beirut, $5 elsewhere, updates once you pick a city below. Add $${toFreeDelivery} more for free delivery.`}
            </p>
            <div data-summary-row data-total>
              <span>Grand Total</span>
              <span>${formatPrice(total)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} data-checkout-form>
          <h2>Delivery Details</h2>
          {SHOW_ACCOUNT && (
            <p data-field-hint style={{ marginTop: 0 }}>
              Checking out as a guest is fine. You can also <Link href="/account">sign in or create an account</Link> to
              keep track of your orders.
            </p>
          )}
          <label>
            Full Name
            <input type="text" name="fullName" required value={form.fullName} onChange={handleChange} />
          </label>

          <label>
            Phone Number
            <div data-phone-group>
              <div data-phone-code>
                <span data-phone-code-value>+{selectedCountry.dialCode}</span>
                <span data-phone-code-arrow aria-hidden="true" />
                <select
                  name="countryIso2"
                  aria-label={`Country code, currently ${selectedCountry.name} +${selectedCountry.dialCode}`}
                  data-phone-country
                  value={form.countryIso2}
                  onChange={handleCountryChange}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.iso2} value={c.iso2}>
                      {c.name} (+{c.dialCode})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="tel"
                name="phone"
                inputMode="numeric"
                minLength={selectedCountry.minLength}
                maxLength={selectedCountry.maxLength}
                required
                title={`Enter a valid phone number for ${selectedCountry.name} (digits only)`}
                value={form.phone}
                onChange={handlePhoneChange}
                onBlur={() => setPhoneTouched(true)}
                data-phone-input
              />
            </div>
            {phoneTouched && !phoneIsValid && (
              <span data-field-hint data-field-error>
                {selectedCountry.name} numbers need{' '}
                {selectedCountry.minLength === selectedCountry.maxLength
                  ? `${selectedCountry.minLength} digits`
                  : `${selectedCountry.minLength}-${selectedCountry.maxLength} digits`}
                .
              </span>
            )}
          </label>

          <label>
            Full Delivery Address
            <textarea
              name="address"
              placeholder="Building, floor, street name, nearest landmark..."
              required
              value={form.address}
              onChange={handleChange}
            />
          </label>

          <label>
            City
            <select name="city" required value={form.city} onChange={handleChange}>
              <option value="" disabled>
                Select your city
              </option>
              {LEBANON_CITIES.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label>
            Additional Notes (optional)
            <textarea name="notes" value={form.notes} onChange={handleChange} />
          </label>

          <p data-payment-method>Payment Method: Cash on Delivery</p>

          {error && <p data-error>{error}</p>}

          {staleCart ? (
            <button type="button" onClick={handleClearStaleCart}>
              <span className="btn-label">Clear Cart &amp; Shop Again</span>
            </button>
          ) : (
            <button type="submit" disabled={submitting}>
              <span className="btn-label">{submitting ? 'Placing order...' : 'Confirm Order'}</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
