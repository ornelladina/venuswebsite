'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCustomerClient } from '@/lib/customerClient';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { formatPrice } from '@/lib/formatPrice';

// Optional customer account: sign in / create an account, and see the
// orders placed while signed in. Checkout still works without an account.

type Mode = 'signin' | 'signup';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Beirut',
  });
}

// The "Continue with Google" button is hidden until Google approves the app's
// branding (until then Google's consent screen shows the long Supabase
// address instead of "Venus Bijoux"). To turn it back on: in Vercel
// add the setting NEXT_PUBLIC_SHOW_GOOGLE_LOGIN = true, then redeploy.
const SHOW_GOOGLE_LOGIN = process.env.NEXT_PUBLIC_SHOW_GOOGLE_LOGIN === 'true';

export default function AccountPage() {
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[] | null>(null);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    const supabase = getCustomerClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserEmail(data.session?.user?.email ?? null);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userEmail) {
      setOrders(null);
      return;
    }
    let active = true;
    getCustomerClient()
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) setOrders(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [userEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError('Your password needs at least 6 characters.');
      return;
    }

    setBusy(true);
    const supabase = getCustomerClient();

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError('Incorrect email or password.');
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
      } else if (!data.session) {
        // The shop's Supabase setting asks new customers to confirm their
        // email first.
        setNotice('Almost done. Check your email and confirm your address, then sign in here.');
        setMode('signin');
      }
    }
    setBusy(false);
  };

  // Google sign in / sign up. Needs the Google provider switched on in
  // Supabase (Authentication > Sign In / Providers > Google). After Google,
  // the customer comes back to this page already signed in.
  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    const { error: oauthError } = await getCustomerClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (oauthError) setError('Google sign in is not available right now. Please use email instead.');
  };

  const handleSignOut = async () => {
    await getCustomerClient().auth.signOut();
    setPassword('');
  };

  if (checking) {
    return <div data-page="account" />;
  }

  if (!userEmail) {
    return (
      <div data-page="account">
        <h1 className="section-heading-eb center">{mode === 'signin' ? 'Sign In' : 'Create Account'}</h1>
        <p data-account-intro>
          An account is optional. Create one to see your past orders here. You can always check out without one.
        </p>

        {SHOW_GOOGLE_LOGIN && (
        <div data-account-social>
          <button type="button" data-account-google onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
              <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.9 6.1C6.500 42.6 14.600 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
          <span data-account-or>or use email</span>
        </div>
        )}

        <form onSubmit={handleSubmit} data-account-form>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>
          {error && <p data-account-error>{error}</p>}
          {notice && <p data-account-notice>{notice}</p>}
          <button type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
          <button
            type="button"
            data-account-switch
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setNotice(null);
            }}
          >
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div data-page="account">
      <h1 className="section-heading-eb center">My Account</h1>
      <p data-account-intro>
        Signed in as <strong>{userEmail}</strong>.{' '}
        <button type="button" data-account-switch onClick={handleSignOut}>
          Sign out
        </button>
      </p>

      {isAdmin && (
        <Link href="/admin/dashboard" data-account-admin-btn>
          Admin Dashboard
        </Link>
      )}

      <h2 data-account-orders-heading>My Orders</h2>
      {orders === null ? (
        <p data-account-intro>Loading your orders…</p>
      ) : orders.length === 0 ? (
        <p data-account-intro>
          No orders yet. Orders you place while signed in will show up here.{' '}
          <Link href="/shop">Start shopping</Link>
        </p>
      ) : (
        <div data-account-orders>
          {orders.map((order) => (
            <div key={order.id} data-account-order>
              <div data-account-order-top>
                <div>
                  <strong>{order.order_number}</strong>
                  <span>Placed {formatDate(order.created_at)}</span>
                  {order.status === 'Completed' && order.completed_at && (
                    <span>Confirmed {formatDate(order.completed_at)}</span>
                  )}
                </div>
                <span data-account-status data-confirmed={order.status === 'Completed'}>
                  {order.status === 'Completed' ? 'Confirmed' : 'Received'}
                </span>
              </div>

              {(order.order_items ?? []).map((item: any) => (
                <div key={item.id} data-account-order-item>
                  {item.image_url && (
                    <Image src={item.image_url} alt={item.product_name} width={56} height={56} />
                  )}
                  <div>
                    <p>
                      {item.product_name}
                      {item.variation_label ? ` (${item.variation_label})` : ''}
                    </p>
                    <p data-account-order-meta>
                      {item.quantity} × ${formatPrice(item.unit_price)}
                    </p>
                  </div>
                </div>
              ))}

              <div data-account-order-total>
                <span>Delivery</span>
                <span>{Number(order.delivery_fee) === 0 ? 'Free' : `$${formatPrice(order.delivery_fee)}`}</span>
              </div>
              <div data-account-order-total>
                <strong>Total</strong>
                <strong>${formatPrice(order.total)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
