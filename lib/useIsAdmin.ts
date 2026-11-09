'use client';

import { useEffect, useState } from 'react';
import { getCustomerClient } from '@/lib/customerClient';

// True only when the person signed in on the site is an admin (their email
// is in ADMIN_EMAILS — checked on the server by /api/is-admin). Visitors who
// aren't signed in never trigger a network request: the sign-in check reads
// the browser's own stored session first.
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = getCustomerClient();

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (active) setIsAdmin(false);
        return;
      }
      try {
        const res = await fetch('/api/is-admin', { cache: 'no-store' });
        const json = await res.json();
        if (active) setIsAdmin(json.isAdmin === true);
      } catch {
        if (active) setIsAdmin(false);
      }
    }

    check();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
