import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Tells the site whether the person who is signed in is an admin, so the
// "Admin Dashboard" button can be shown to them and ONLY them. It uses the
// same rule as the dashboard's own lock (middleware.ts): the signed-in
// email must be listed in the ADMIN_EMAILS setting in Vercel. This only
// controls whether a button is VISIBLE — the dashboard itself stays locked
// by the middleware no matter what.
export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Read-only here: this route never changes the session.
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter((e: string) => e.length > 0);
  const email = (user?.email ?? '').toLowerCase();
  const isAdmin = !!email && adminEmails.indexOf(email) !== -1;

  return NextResponse.json({ isAdmin }, { headers: { 'Cache-Control': 'no-store' } });
}
