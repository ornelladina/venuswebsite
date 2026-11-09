import Script from 'next/script';

// Google Analytics 4. The measurement ID (looks like G-XXXXXXXXXX) is public
// by design, so it is set in Vercel as NEXT_PUBLIC_GA_ID (Config, not Secret)
// instead of being typed into the code. While it is empty, nothing loads and
// no visits are counted anywhere.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// Loaded once from the root layout (see app/layout.tsx), so it covers
// every page including /admin — a handful of extra "visits" from you
// checking the dashboard is normal and not worth the added complexity of
// filtering them out.
export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
