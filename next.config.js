const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // Cache product images for speed + offline support
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-images',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      // Never cache the admin area or any API route: the orders dashboard
      // must always show live data, not a saved copy from earlier.
      urlPattern: /^https:\/\/[^/]+\/(admin|api)(\/.*)?$/i,
      handler: 'NetworkOnly',
    },
    {
      // Cache pages for fast repeat visits
      urlPattern: /^https:\/\/.*\/(new|category|product|favorites|cart|checkout)?.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
      },
    },
  ],
});

// Site address (see lib/siteUrl.ts). SITE_DOMAIN is a Vercel setting without
// "https://"; VERCEL_PROJECT_PRODUCTION_URL is Vercel's own fallback.
const siteDomain = (process.env.SITE_DOMAIN || process.env.VERCEL_PROJECT_PRODUCTION_URL || '').replace(/^https?:\/\//, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SITE_URL: siteDomain ? `https://${siteDomain}` : '',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    unoptimized: true,
  },
};

module.exports = withPWA(nextConfig);
