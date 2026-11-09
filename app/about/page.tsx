import type { Metadata } from 'next';
import { STYLES } from '@/lib/styles';
import { siteAsset } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'About',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div data-page="about" className="home-section">
      <h1 className="section-heading-eb center">About Venus Bijoux</h1>
      <div style={{ maxWidth: 720, margin: '0 auto', lineHeight: 1.7 }}>
        {/* Same emblem used in the site header — see components/Header.tsx.
            The file is /public/venus-emblem.png. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/venus-emblem.png"
          alt="Venus Bijoux"
          style={{ display: 'block', margin: '32px auto 0', maxWidth: 200, height: 'auto' }}
        />

        {/* Same hamsa icon used above the Hamsa & Eye grid on the home
            page (see app/page.tsx) — shown smaller here, under the logo. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={siteAsset('hamsa-icon-design.png')}
          alt=""
          style={{ display: 'block', margin: '20px auto 0', width: 'min(90px, 30vw)', height: 'auto' }}
        />

        <p style={{ marginTop: 32 }}>
          Venus Bijoux is a Lebanese fashion accessories brand, established in 2018. We carry
          high-quality pieces in the latest trends, all made in Turkey, and we deliver across Lebanon.
          Every message gets a quick response, so you're never left waiting on an order or a question.
        </p>

        <p style={{ marginTop: 20 }}>
          Reach us on Instagram{' '}
          <a href="https://www.instagram.com/venusbijoux.lb/" target="_blank" rel="noreferrer">
            @venusbijoux.lb
          </a>
          {/* TODO: add the Facebook page link here once it's sent over. */}
          , or by phone/WhatsApp at +961 81 191 446.
        </p>

        {STYLES.map((s) => (
          <div key={s.slug} style={{ marginTop: 36 }}>
            <h2 className="section-heading-eb" style={{ fontSize: '1.1rem' }}>
              {s.tabLabel}
            </h2>
            <p style={{ marginTop: 8 }}>{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

