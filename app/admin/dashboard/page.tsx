import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import SignOutButton from './SignOutButton';
import OrderActions from './OrderActions';
import { formatPrice } from '@/lib/formatPrice';
import { buildWhatsAppLink } from '@/lib/orderMessages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function getOrders() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  // Previously this silently fell back to an empty list on any error (bad
  // service-role key, wrong Supabase project, etc.), which looked exactly
  // like "no orders" even when orders existed. Surfacing the real error
  // here means a connection problem shows up as a clear message instead of
  // a dashboard that just looks empty.
  if (error) {
    throw new Error(`Could not load orders: ${error.message}`);
  }

  return orders ?? [];
}

// Shown in Lebanon time (Vercel's servers run in UTC, which is 2-3 hours
// behind, so without this the times on the cards would look wrong).
function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Beirut',
  });
}

function OrderCard({ order }: { order: any }) {
  return (
    <div data-admin-order-card>
      <div data-admin-order-card-top>
        <div>
          <h2>{order.order_number}</h2>
          <p data-admin-order-date>Placed: {formatDate(order.created_at)}</p>
          {order.status === 'Completed' && (
            <p data-admin-order-date>
              Confirmed: {order.completed_at ? formatDate(order.completed_at) : 'date not recorded'}
            </p>
          )}
        </div>
        <span data-admin-order-status data-status={order.status}>
          {order.status}
        </span>
      </div>

      <div data-admin-order-section>
        <p>
          <strong>{order.customer_name}</strong>
        </p>
        <p>{order.phone}</p>
        {order.email && (
          <p data-admin-order-email>
            {order.email}
            {order.customer_notified_at
              ? ' · confirmation email sent'
              : order.status === 'Completed'
              ? ' · email not sent'
              : ''}
          </p>
        )}
        <p>
          {order.address}, {order.city}
        </p>
        {order.notes && <p data-admin-order-notes>Notes: {order.notes}</p>}
      </div>

      <div data-admin-order-items>
        {order.order_items.map((item: any) => (
          <div key={item.id} data-admin-order-item>
            {item.image_url ? (
              <Image src={item.image_url} alt={item.product_name} width={56} height={56} />
            ) : (
              <div data-admin-order-item-noimage>No photo</div>
            )}
            <div>
              <p data-admin-order-item-name>
                {item.product_name}
                {item.variation_label ? ` (${item.variation_label})` : ''}
              </p>
              <p data-admin-order-item-meta>
                {item.quantity} × ${formatPrice(item.unit_price)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div data-admin-order-total-row>
        <span>Total</span>
        <span>${formatPrice(order.total)}</span>
      </div>

      <OrderActions
        orderId={order.id}
        isCompleted={order.status === 'Completed'}
        whatsappHref={buildWhatsAppLink(order, order.order_items ?? [])}
      />
    </div>
  );
}

export default async function AdminDashboardPage() {
  const orders = await getOrders();
  const activeOrders = orders.filter((o: any) => o.status !== 'Completed');
  const completedOrders = orders.filter((o: any) => o.status === 'Completed');

  return (
    <div data-page="admin-dashboard">
      <div data-admin-dashboard-header>
        <h1>Orders ({orders.length})</h1>
        <div data-admin-header-actions>
          <Link href="/admin/dashboard/products" data-admin-btn-secondary>
            Products
          </Link>
          <Link href="/admin/dashboard/sold-out" data-admin-btn-secondary>
            Sold Out
          </Link>
          <Link href="/admin/dashboard/collections" data-admin-btn-secondary>
            Collections
          </Link>
          <Link href="/admin/dashboard/homepage" data-admin-btn-secondary>
            Homepage Sections
          </Link>
          <SignOutButton />
        </div>
      </div>

      <p data-admin-order-date>
        Loaded {formatDate(new Date().toISOString())} (Lebanon time). If this is not the current
        time, reload the page.
      </p>

      {orders.length > 0 && (
        <p data-admin-order-summary>
          {activeOrders.length} new / pending &middot; {completedOrders.length} completed &middot;{' '}
          {orders.length} total
        </p>
      )}

      {orders.length === 0 && <p data-admin-empty>No orders yet.</p>}

      {orders.length > 0 && (
        <section data-admin-subsection>
          <h2>New / Pending ({activeOrders.length})</h2>
          {activeOrders.length > 0 ? (
            <div data-admin-order-list>
              {activeOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <p data-admin-empty>No new orders right now.</p>
          )}
        </section>
      )}

      {completedOrders.length > 0 && (
        <section data-admin-subsection>
          <h2>Completed ({completedOrders.length})</h2>
          <div data-admin-order-list>
            {completedOrders.map((order: any) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
