// Shared helpers for the "your order is confirmed" messages: the one-click
// WhatsApp message and the branded email both build their wording from here,
// so the two can never disagree about items or totals.
//
// No server-only code in this file, so it is safe to import from both the
// admin dashboard page and the email sender.

import { formatPrice } from '@/lib/formatPrice';

export const BRAND_NAME = 'Venus Bijoux';

export type OrderItemLike = {
  product_name: string;
  variation_label?: string | null;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
  image_url?: string | null;
};

export type OrderLike = {
  order_number: string;
  customer_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  delivery_fee?: number | string | null;
  subtotal?: number | string | null;
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// "Free" when there's no delivery charge, otherwise "$4" / "$5".
export function deliveryText(fee: number): string {
  return fee === 0 ? 'Free' : `$${formatPrice(fee)}`;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'there';
}

// Same approach as the new-order notification: add the totals up from the
// line items instead of trusting a stored number.
export function orderTotals(order: OrderLike, items: OrderItemLike[]) {
  const subtotal = items.length
    ? items.reduce((sum, i) => sum + Number(i.line_total), 0)
    : Number(order.subtotal ?? 0);
  const deliveryFee = Number(order.delivery_fee ?? 0);
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

// Orders store the phone as "+961 71123456" (dial code, a space, the
// number). WhatsApp links want digits only, with no leading zero after the
// country code, so "+961 03123456" has to become 96103123456 -> 9613123456.
export function whatsappNumber(phone: string): string | null {
  const trimmed = phone.trim();
  const match = trimmed.match(/^\+?(\d{1,4})\s+(.+)$/);
  if (!match) {
    const digits = trimmed.replace(/\D/g, '');
    return digits.length >= 8 ? digits : null;
  }
  const dial = match[1];
  const national = match[2].replace(/\D/g, '').replace(/^0+/, '');
  if (!national) return null;
  return `${dial}${national}`;
}

// The WhatsApp wording. Edit the text below if you want it to sound
// different, nothing else needs to change.
export function buildWhatsAppConfirmation(order: OrderLike, items: OrderItemLike[]): string {
  const { deliveryFee, total } = orderTotals(order, items);

  const lines = items.map(
    (i) =>
      `• ${i.product_name}${i.variation_label ? ` (${i.variation_label})` : ''} × ${i.quantity} — $${formatPrice(
        Number(i.line_total)
      )}`
  );

  return [
    `Hi ${firstName(order.customer_name)},`,
    '',
    `Thank you for your order from ${BRAND_NAME}. Order ${order.order_number} is confirmed.`,
    '',
    ...lines,
    '',
    `Delivery: ${deliveryText(deliveryFee)}`,
    `Total to pay on delivery: $${formatPrice(total)}`,
    '',
    `Delivering to: ${order.address}, ${order.city}`,
    '',
    "We'll be in touch to arrange delivery. If anything above is wrong, just reply here.",
  ].join('\n');
}

export function buildWhatsAppLink(order: OrderLike, items: OrderItemLike[]): string | null {
  const number = whatsappNumber(order.phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppConfirmation(order, items))}`;
}
