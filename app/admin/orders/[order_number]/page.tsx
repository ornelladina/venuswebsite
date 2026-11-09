import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { formatPrice } from '@/lib/formatPrice';

export const dynamic = 'force-dynamic';

async function getOrder(orderNumber: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (!order) return null;

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  return { order, items: items ?? [] };
}

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: { order_number: string };
  searchParams: { key?: string };
}) {
  if (searchParams.key !== process.env.ADMIN_VIEW_KEY) {
    notFound();
  }

  const data = await getOrder(params.order_number);
  if (!data) notFound();

  const { order, items } = data;

  return (
    <div data-page="admin-order">
      <div data-admin-order-card>
        <h1>Order {order.order_number}</h1>
        <p data-admin-order-status>{order.status}</p>

        <div data-admin-order-section>
          <h2>Customer</h2>
          <p>{order.customer_name}</p>
          <p>{order.phone}</p>
          {order.email && <p>{order.email}</p>}
          <p>
            {order.address}, {order.city}
          </p>
          {order.notes && <p data-admin-order-notes>Notes: {order.notes}</p>}
        </div>

        <div data-admin-order-section>
          <h2>Items</h2>
          <div data-admin-order-items>
            {items.map((item: any) => (
              <div key={item.id} data-admin-order-item>
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.product_name}
                    width={72}
                    height={72}
                  />
                ) : (
                  <div data-admin-order-item-noimage>No photo</div>
                )}
                <div>
                  <p data-admin-order-item-name>
                    {item.product_name}
                    {item.variation_label ? ` (${item.variation_label})` : ''}
                  </p>
                  <p data-admin-order-item-meta>
                    {item.quantity} × ${formatPrice(item.unit_price)} = $
                    {formatPrice(item.line_total)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div data-admin-order-section>
          <div data-admin-order-totals>
            <p>
              <span>Subtotal</span>
              <span>${formatPrice(order.subtotal)}</span>
            </p>
            <p>
              <span>Delivery</span>
              <span>${formatPrice(order.delivery_fee)}</span>
            </p>
            <p data-admin-order-grand-total>
              <span>Total</span>
              <span>${formatPrice(order.total)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
