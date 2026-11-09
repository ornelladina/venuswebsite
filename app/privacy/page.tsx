import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div data-page="privacy" className="home-section">
      <h1 className="section-heading-eb center">Privacy Policy</h1>
      <div style={{ maxWidth: 720, margin: '0 auto', lineHeight: 1.7 }}>
        <p style={{ marginTop: 32 }}>
          Venus Bijoux is an online jewelry and accessories shop that delivers across
          Lebanon. This page explains what information we collect and how we use it.
        </p>

        <h2 style={{ marginTop: 32 }}>What we collect</h2>
        <p style={{ marginTop: 12 }}>
          When you place an order we collect your name, phone number, delivery address, city, any
          notes you add, and your email address if you choose to give one. If you create an
          account, we also store your email address and the orders linked to it. If you sign in
          with Google, we receive your name and email address from Google. We never see your
          Google password.
        </p>

        <h2 style={{ marginTop: 32 }}>How we use it</h2>
        <p style={{ marginTop: 12 }}>
          We use your information only to prepare and deliver your order, to contact you about it,
          to send your order confirmation email, and to show your past orders in your account.
          We do not sell your information and we do not share it with anyone for advertising.
        </p>

        <h2 style={{ marginTop: 32 }}>Services we use</h2>
        <p style={{ marginTop: 12 }}>
          Your information is stored with our database provider, Supabase. Order emails are sent
          through Resend. The website is hosted on Vercel. We use Google Analytics to understand
          how the site is used, which records anonymous visit information such as pages viewed.
        </p>

        <h2 style={{ marginTop: 32 }}>Your choices</h2>
        <p style={{ marginTop: 12 }}>
          You can check out without an account. You can ask us at any time to see, correct or
          delete the information we hold about you by messaging us on WhatsApp at{' '}
          <a href="https://wa.me/96181191446" target="_blank" rel="noreferrer">
            +961 81 191 446
          </a>
          .
        </p>

        <h2 style={{ marginTop: 32 }}>Changes</h2>
        <p style={{ marginTop: 12 }}>
          If we change this policy, the updated version will be posted on this page.
        </p>
      </div>
    </div>
  );
}
