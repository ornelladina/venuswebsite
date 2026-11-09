import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping',
  alternates: { canonical: '/shipping' },
};

export default function ShippingPage() {
  return (
    <div data-page="shipping" className="home-section">
      <h1 className="section-heading-eb center">Shipping</h1>
      <div style={{ maxWidth: 720, margin: '0 auto', lineHeight: 1.7 }}>
        <p style={{ marginTop: 32 }}>We currently deliver across Lebanon only.</p>

        <p style={{ marginTop: 20 }}>
          Cash on delivery — pay when your order arrives at your door. Delivery is $4 within Beirut
          and $5 outside Beirut, and free on orders of $75 or more.
        </p>

        <p style={{ marginTop: 20 }}>
          Have a question about your order? Reach us anytime on WhatsApp at{' '}
          <a href="https://wa.me/96181191446" target="_blank" rel="noreferrer">
            +961 81 191 446
          </a>
          .
        </p>
      </div>
    </div>
  );
}
