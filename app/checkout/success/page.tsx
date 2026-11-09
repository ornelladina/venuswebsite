'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const params = useSearchParams();
  const orderNumber = params.get('order');

  return (
    <div data-page="checkout-success">
      <div data-success-icon>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1>Thank you for your order!</h1>
      {orderNumber && (
        <p>
          Your order number is <strong>{orderNumber}</strong>.
        </p>
      )}
      <p>We&apos;ll contact you soon to confirm delivery. Payment is Cash on Delivery.</p>
      <Link href="/">
        <span className="btn-label">Continue Shopping</span>
      </Link>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SuccessContent />
    </Suspense>
  );
}
