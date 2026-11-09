// One shared browser-side Supabase client for customer accounts (sign in,
// sign up, order history, and placing an order while signed in so the order
// is attached to the account). Only call this from event handlers or
// effects, never while a component is rendering.
import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getCustomerClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );
  }
  return client;
}
