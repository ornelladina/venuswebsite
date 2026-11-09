'use client';

// Keeps a list (cart or favorites) in step with the signed-in customer's
// account, so it follows them to other devices. Guests are untouched: with
// nobody signed in this does nothing and the list stays in the browser only.
//
// Rules:
//  - First time this device meets this account: the browser's list and the
//    account's list are MERGED (nothing is lost), then saved to the account.
//  - After that, the account's list wins (so removing an item on one device
//    removes it everywhere). It refreshes whenever the tab is opened again.
//  - Signing out clears the list from this browser (shared-device privacy).
//  - If the database table is missing (supabase/migration_saved_cart_favorites.sql
//    not run yet) everything keeps working exactly as before, browser only.

import { useEffect, useRef, useState } from 'react';
import { getCustomerClient } from '@/lib/customerClient';

const SYNCED_KEY = 'womanlylebanon_synced_user_';

type Column = 'cart' | 'favorites';

// undefined = could not reach the table, null = this customer has no row yet
async function pullSaved<T>(userId: string, column: Column): Promise<T[] | null | undefined> {
  try {
    const { data, error } = await getCustomerClient()
      .from('customer_saved')
      .select(column)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return undefined;
    if (!data) return null;
    const value = (data as any)[column];
    return Array.isArray(value) ? (value as T[]) : null;
  } catch {
    return undefined;
  }
}

async function pushSaved<T>(userId: string, column: Column, value: T[]) {
  try {
    await getCustomerClient()
      .from('customer_saved')
      .upsert(
        { user_id: userId, [column]: value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  } catch {
    // Saving is best-effort; the list is still kept in the browser.
  }
}

export function useAccountSync<T>({
  column,
  value,
  setValue,
  merge,
  loaded,
}: {
  column: Column;
  value: T[];
  setValue: (next: T[]) => void;
  merge: (remote: T[], local: T[]) => T[];
  loaded: boolean;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const userRef = useRef<string | null>(null);
  const valueRef = useRef<T[]>(value);
  valueRef.current = value;

  // Watch who is signed in.
  useEffect(() => {
    if (!loaded) return;
    const supabase = getCustomerClient();
    let active = true;

    const apply = (id: string | null) => {
      if (userRef.current === id) return;
      userRef.current = id;
      setSynced(false);
      setUserId(id);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (active) apply(data.session?.user?.id ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (userRef.current !== null) {
          localStorage.removeItem(SYNCED_KEY + column);
          setValue([]);
        }
        apply(null);
        return;
      }
      apply(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const pull = async (id: string) => {
    const remote = await pullSaved<T>(id, column);
    if (userRef.current !== id) return;
    if (remote === undefined) return; // table not reachable: stay browser-only

    const lastSynced = localStorage.getItem(SYNCED_KEY + column);
    if (remote === null) {
      // No saved row yet: keep what's here, it gets saved below.
    } else if (lastSynced === id) {
      setValue(remote);
    } else {
      setValue(merge(remote, valueRef.current));
    }
    localStorage.setItem(SYNCED_KEY + column, id);
    setSynced(true);
  };

  // First load after signing in.
  useEffect(() => {
    if (userId) pull(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Refresh when the customer comes back to the tab.
  useEffect(() => {
    if (!userId || !synced) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull(userId);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, synced]);

  // Save changes to the account.
  useEffect(() => {
    if (!userId || !synced) return;
    const timer = setTimeout(() => pushSaved(userId, column, value), 600);
    return () => clearTimeout(timer);
  }, [value, userId, synced, column]);
}
