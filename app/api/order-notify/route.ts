import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatPrice } from '@/lib/formatPrice';
import { escapeHtml } from '@/lib/orderMessages';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json();
  const order = payload.record;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('product_name, variation_label, quantity, unit_price, line_total, image_url')
    .eq('order_id', order.id);

  // Recompute the total straight from the line items + delivery fee instead
  // of trusting order.total. This is what was producing the wrong number in
  // WhatsApp/email before: line_total on each item is already price ×
  // quantity, so summing line_total again and multiplying anything by
  // quantity a second time double-counts it. Computing it once, here, from
  // the source numbers means the message can never drift from reality no
  // matter what a given order row happens to contain.
  const computedSubtotal =
    items?.reduce((sum, i) => sum + Number(i.line_total), 0) ?? Number(order.subtotal ?? 0);
  const deliveryFee = Number(order.delivery_fee ?? 0);
  const computedTotal = computedSubtotal + deliveryFee;

  const orderLink = `https://${process.env.SITE_DOMAIN}/admin/orders/${order.order_number}?key=${process.env.ADMIN_VIEW_KEY}`;

  // ----- Plain text version (used for WhatsApp, which can't show images) -----
  const itemsListText =
    items
      ?.map(
        (i) =>
          `• ${i.product_name}${i.variation_label ? ` (${i.variation_label})` : ''} × ${i.quantity} — $${formatPrice(
            i.line_total
          )}`
      )
      .join('\n') ?? '';

  const summaryText = `New order ${order.order_number}

Customer: ${order.customer_name}
Phone: ${order.phone}
${order.email ? `Email: ${order.email}\n` : ''}Address: ${order.address}, ${order.city}
${order.notes ? `Notes: ${order.notes}\n` : ''}
Items:
${itemsListText}

Total: $${formatPrice(computedTotal)}

View with photos: ${orderLink}`;

  // ----- HTML version (used for email, shows real product photos) -----
  const itemsHtml =
    items
      ?.map(
        (i) => `
      <tr>
        <td style="padding: 8px 0; width: 64px;">
          ${
            i.image_url
              ? `<img src="${i.image_url}" width="64" height="64" style="border-radius:6px;object-fit:cover;display:block;" />`
              : ''
          }
        </td>
        <td style="padding: 8px 0 8px 12px; font-family: sans-serif; font-size: 14px; color: #37152F;">
          ${i.product_name}${i.variation_label ? ` (${i.variation_label})` : ''}<br/>
          <span style="color:#7A5C70;">${i.quantity} × $${formatPrice(i.unit_price)} = $${formatPrice(
            i.line_total
          )}</span>
        </td>
      </tr>`
      )
      .join('') ?? '';

  const summaryHtml = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#37152F;">New order ${order.order_number}</h2>
      <p style="color:#37152F; font-size:14px;">
        <strong>${order.customer_name}</strong><br/>
        ${order.phone}<br/>
        ${order.email ? `${escapeHtml(order.email)}<br/>` : ''}
        ${order.address}, ${order.city}
        ${order.notes ? `<br/><em>Notes: ${order.notes}</em>` : ''}
      </p>
      <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        ${itemsHtml}
      </table>
      <p style="font-size:16px; font-weight:600; color:#37152F; margin-top:16px;">
        Total: $${formatPrice(computedTotal)}
      </p>
      <p style="margin-top:20px;">
        <a href="${orderLink}" style="background:#37152F; color:#FBF4EE; padding:10px 18px; border-radius:4px; text-decoration:none; font-weight:600; font-family:sans-serif; font-size:14px;">
          View full order
        </a>
      </p>
    </div>`;

  // 1. Email via Resend
  //
  // NOTE on "email stopped arriving": Resend's shared sandbox address
  // (onboarding@resend.dev) is only allowed to deliver to the email
  // address on the Resend account itself — it will silently refuse to
  // send to anyone else. fetch() does NOT throw on that refusal (it's an
  // HTTP 4xx response, not a network error), which is why the old code's
  // try/catch never logged anything. If NOTIFY_EMAIL_TO is not the exact
  // inbox the Resend account was created with, this is almost always why.
  // Fixes, in order of how quick they are:
  //   1. In Resend, verify your own sending domain (e.g. venusbijoux.com)
  //      and change the "from" address below to use it — then Resend can
  //      send to any address, not just the account owner's.
  //   2. Or, until that's set up, make sure NOTIFY_EMAIL_TO in Vercel is
  //      set to the exact email the Resend account is registered under.
  // Either way, check the Vercel function logs for this route after a test
  // order — a failure now logs the exact status and error Resend returned.
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Venus Bijoux Orders <onboarding@resend.dev>',
        to: process.env.NOTIFY_EMAIL_TO,
        subject: `New order ${order.order_number} — $${formatPrice(computedTotal)}`,
        html: summaryHtml,
        text: summaryText,
      }),
    });

    if (!resendRes.ok) {
      const body = await resendRes.text();
      console.error(`Email notification failed: Resend returned ${resendRes.status}`, body);
    }
  } catch (err) {
    console.error('Email notification failed (network error)', err);
  }

  // 2. WhatsApp via CallMeBot (text only, includes a link to view photos)
  try {
    const waUrl = `https://api.callmebot.com/whatsapp.php?phone=${process.env.CALLMEBOT_PHONE}&text=${encodeURIComponent(
      summaryText
    )}&apikey=${process.env.CALLMEBOT_APIKEY}`;
    const waRes = await fetch(waUrl);
    const waBody = await waRes.text();
    if (!waRes.ok || waBody.toLowerCase().includes('error')) {
      console.error(`WhatsApp notification failed: CallMeBot returned ${waRes.status}`, waBody);
    }
  } catch (err) {
    console.error('WhatsApp notification failed (network error)', err);
  }

  return NextResponse.json({ ok: true });
}
