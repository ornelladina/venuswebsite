import type { Metadata, Viewport } from 'next';
import { CartProvider } from '@/components/CartContext';
import { FavoritesProvider } from '@/components/FavoritesContext';
import AnnouncementBar from '@/components/AnnouncementBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { SITE_URL } from '@/lib/siteUrl';
import { siteAsset } from '@/lib/assets';
import './globals.css';

// Decorative images that the stylesheet uses as backgrounds. CSS cannot read
// settings, so the addresses are handed to it here as CSS variables (they
// point at THIS site's own Supabase "site-assets" bucket).
const assetVars = {
  '--asset-heroimg': `url(${siteAsset('heroimg.png')})`,
  '--asset-banner-pattern': `url(${siteAsset('banner-bckgd-pattern.png')})`,
  '--asset-banner-img': `url(${siteAsset('banner-img.png')})`,
  '--asset-banner-line': `url(${siteAsset('banner-line.png')})`,
  '--asset-bestseller-pattern': `url(${siteAsset('bestseller-patternbckgd.png')})`,
} as React.CSSProperties;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Proves to Google Search Console that this site is ours. Set
  // GOOGLE_SITE_VERIFICATION in Vercel to the code Google gives you; nothing
  // is shown while it is empty. Renders as the google-site-verification meta tag.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  title: {
    default: 'Venus Bijoux | Jewelry Lebanon — Bracelets, Necklaces, Rings & More',
    template: '%s | Venus Bijoux Jewelry Lebanon',
  },
  description:
    'Shop trendy, hypoallergenic, gold-plated jewelry and fashion accessories in Lebanon — bracelets, necklaces, rings, earrings, anklets & sets. Cash on delivery across Lebanon.',
  keywords: [
    'jewelry Lebanon',
    'jewelry brand Lebanon',
    'fashion accessories Lebanon',
    'accessories Lebanon',
    'bracelets Lebanon',
    'gold bracelets Lebanon',
    'necklaces Lebanon',
    'gold necklaces Lebanon',
    'rings Lebanon',
    'earrings Lebanon',
    'anklets Lebanon',
    'jewelry sets Lebanon',
    'matching jewelry sets',
    'gold plated jewelry Lebanon',
    'hypoallergenic jewelry Lebanon',
    'waterproof jewelry Lebanon',
    'dainty jewelry Lebanon',
    'everyday jewelry',
    'trendy jewelry Lebanon',
    'affordable jewelry Lebanon',
    'buy jewelry online Lebanon',
    'buy jewelry Beirut',
    'jewelry shop Beirut',
    'jewelry store Lebanon',
    'online jewelry store Lebanon',
    'Lebanese jewelry brand',
    'cash on delivery jewelry Lebanon',
    'gift jewelry Lebanon',
    'hamsa jewelry',
    'evil eye jewelry',
    'evil eye bracelet Lebanon',
    'Venus Bijoux',
    'Venus Bijoux Lebanon',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Venus Bijoux',
  },
  openGraph: {
    type: 'website',
    locale: 'en_LB',
    url: SITE_URL,
    siteName: 'Venus Bijoux Jewelry Lebanon',
    title: 'Venus Bijoux | Jewelry Lebanon',
    description:
      'Trendy, hypoallergenic, gold-plated jewelry and fashion accessories — bracelets, necklaces, rings, earrings, anklets & sets. Shop with cash on delivery across Lebanon.',
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: '#f5f0e8',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={assetVars}>
      <body>
        <GoogleAnalytics />
        <CartProvider>
          <FavoritesProvider>
            <AnnouncementBar />
            <Header />
            <main>{children}</main>
            <Footer />
            <ScrollReveal />
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
