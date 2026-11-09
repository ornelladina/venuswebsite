// Sends the branded "your order is confirmed" email to the customer through
// Resend. Server-only: it uses the Resend API key.
//
// Returns true only if Resend accepted the email. It never throws, so a
// failed email can't stop an order from being marked completed.

import { formatPrice } from '@/lib/formatPrice';
import { SITE_URL } from '@/lib/siteUrl';
import {
  BRAND_NAME,
  deliveryText,
  escapeHtml,
  firstName,
  orderTotals,
  type OrderItemLike,
  type OrderLike,
} from '@/lib/orderMessages';

function buildEmailHtml(order: OrderLike, items: OrderItemLike[]): string {
  const { deliveryFee, total } = orderTotals(order, items);
  const logoUrl = `${SITE_URL}/venus-emblem.png`;

  const itemRows = items
    .map(
      (i) => `
        <tr>
          <td style="padding:10px 0;width:72px;vertical-align:top;">
            ${
              i.image_url
                ? `<img src="${escapeHtml(i.image_url)}" width="64" height="64" alt="" style="display:block;border-radius:6px;object-fit:cover;" />`
                : ''
            }
          </td>
          <td style="padding:10px 0 10px 12px;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#37152F;">
            ${escapeHtml(i.product_name)}${i.variation_label ? ` (${escapeHtml(i.variation_label)})` : ''}<br/>
            <span style="color:#7A5C70;">${i.quantity} × $${formatPrice(Number(i.unit_price))}</span>
          </td>
          <td style="padding:10px 0;vertical-align:top;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#37152F;white-space:nowrap;">
            $${formatPrice(Number(i.line_total))}
          </td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#FBF6F2;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6F2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFDFA;border-radius:10px;">
            <tr>
              <td align="center" style="padding:32px 32px 8px;">
                <img src="${escapeHtml(logoUrl)}" alt="${BRAND_NAME}" height="48" style="display:block;height:48px;width:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;text-align:center;">
                <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:600;font-size:26px;color:#37152F;">Your order is confirmed</h1>
                <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7A5C70;">Order ${escapeHtml(order.order_number)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#37152F;">
                Hi ${escapeHtml(firstName(order.customer_name))},<br/><br/>
                Thank you for your order. Here is what we have for you:
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8CBB7;">
                  ${itemRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8CBB7;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#37152F;">
                  <tr>
                    <td style="padding:12px 0 4px;">Delivery</td>
                    <td style="padding:12px 0 4px;text-align:right;">${deliveryText(deliveryFee)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-weight:600;font-size:16px;">Total</td>
                    <td style="padding:4px 0;text-align:right;font-weight:600;font-size:16px;">$${formatPrice(total)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:0 0 4px;color:#7A5C70;font-size:12px;">Payment: Cash on Delivery</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#37152F;">
                <strong>Delivering to</strong><br/>
                ${escapeHtml(order.address)}, ${escapeHtml(order.city)}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#37152F;">
                We'll be in touch to arrange delivery. If anything needs to change, just reply to this email.<br/><br/>
                Thank you for shopping with us,<br/>
                ${BRAND_NAME}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildEmailText(order: OrderLike, items: OrderItemLike[]): string {
  const { deliveryFee, total } = orderTotals(order, items);
  const lines = items.map(
    (i) =>
      `- ${i.product_name}${i.variation_label ? ` (${i.variation_label})` : ''} x ${i.quantity}: $${formatPrice(
        Number(i.line_total)
      )}`
  );
  return [
    `Hi ${firstName(order.customer_name)},`,
    '',
    `Your order ${order.order_number} is confirmed.`,
    '',
    ...lines,
    '',
    `Delivery: ${deliveryText(deliveryFee)}`,
    `Total: $${formatPrice(total)} (Cash on Delivery)`,
    `Delivering to: ${order.address}, ${order.city}`,
    '',
    "We'll be in touch to arrange delivery. If anything needs to change, just reply to this email.",
    '',
    `Thank you for shopping with us,`,
    BRAND_NAME,
  ].join('\n');
}

export async function sendOrderConfirmedEmail(order: OrderLike, items: OrderItemLike[]): Promise<boolean> {
  if (!order.email) return false;

  if (!process.env.RESEND_API_KEY) {
    console.error('Customer email not sent: RESEND_API_KEY is not set.');
    return false;
  }

  // RESEND_FROM_EMAIL must be an address on a domain you verified in Resend
  // (for example orders@yourdomain.com). The fallback below is Resend's
  // test sender, which Resend only lets deliver to your own inbox, so it
  // will be refused for real customers. That refusal is logged below.
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${BRAND_NAME} <${fromAddress}>`,
        to: order.email,
        reply_to: process.env.NOTIFY_EMAIL_TO || undefined,
        subject: `Your ${BRAND_NAME} order ${order.order_number} is confirmed`,
        html: buildEmailHtml(order, items),
        text: buildEmailText(order, items),
      }),
    });

    if (!res.ok) {
      console.error(`Customer email failed: Resend returned ${res.status}`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Customer email failed (network error)', err);
    return false;
  }
}
