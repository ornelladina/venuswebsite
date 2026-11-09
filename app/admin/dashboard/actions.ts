'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { sendOrderConfirmedEmail } from '@/lib/orderEmail';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

// 'Completed' needs supabase/migration_order_completed.sql run once —
// otherwise the status column's check constraint rejects it.
//
// Also sends the customer their branded confirmation email, if they gave an
// email address at checkout. Sent once per order (customer_notified_at
// remembers it). If the email fails, the order is still marked completed and
// the dashboard shows "email not sent" on that order. To retry, use the
// undo button and press the check again.
export async function markOrderCompleted(orderId: string) {
  const supabase = adminClient();

  // Saves WHEN the order was confirmed (completed_at) along with the status.
  // If the database hasn't had supabase/migration_accounts_and_order_dates.sql
  // run yet, that column doesn't exist, so fall back to saving just the
  // status — pressing the button must never break.
  let order: any = null;
  let error: any = null;
  const withDate = await supabase
    .from('orders')
    .update({ status: 'Completed', completed_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('*, order_items(*)')
    .single();
  order = withDate.data;
  error = withDate.error;

  if (error && /completed_at/i.test(error.message ?? '')) {
    const statusOnly = await supabase
      .from('orders')
      .update({ status: 'Completed' })
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single();
    order = statusOnly.data;
    error = statusOnly.error;
  }

  if (error || !order) {
    throw new Error(`Could not update the order: ${error?.message ?? 'order not found'}`);
  }

  if (order.email && !order.customer_notified_at) {
    const sent = await sendOrderConfirmedEmail(order, order.order_items ?? []);
    if (sent) {
      await supabase
        .from('orders')
        .update({ customer_notified_at: new Date().toISOString() })
        .eq('id', orderId);
    }
  }

  revalidatePath('/admin/dashboard');
}

// Moves a Completed order back to Active (Pending) in case it was marked
// done by mistake.
export async function restoreOrder(orderId: string) {
  const supabase = adminClient();
  let { error } = await supabase
    .from('orders')
    .update({ status: 'Pending', completed_at: null })
    .eq('id', orderId);

  // Same fallback as markOrderCompleted: works before the new database
  // migration has been run.
  if (error && /completed_at/i.test(error.message ?? '')) {
    const statusOnly = await supabase.from('orders').update({ status: 'Pending' }).eq('id', orderId);
    error = statusOnly.error;
  }

  if (error) {
    throw new Error(`Could not update the order: ${error.message}`);
  }

  revalidatePath('/admin/dashboard');
}

// Deletes the order entirely (order_items cascade-delete with it — see
// "on delete cascade" in schema.sql). This can't be undone.
export async function deleteOrder(orderId: string) {
  const supabase = adminClient();
  const { error } = await supabase.from('orders').delete().eq('id', orderId);

  if (error) {
    throw new Error(`Could not remove the order: ${error.message}`);
  }

  revalidatePath('/admin/dashboard');
}
