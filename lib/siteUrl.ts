// The live site address, used for page metadata, the sitemap, robots.txt, the
// product feed, copied product links and the logo in order emails.
//
// It is NOT typed in by hand: next.config.js builds NEXT_PUBLIC_SITE_URL from
// the SITE_DOMAIN setting in Vercel (or, if that is missing, from Vercel's own
// production address). When a custom domain is added later, only change
// SITE_DOMAIN in Vercel and redeploy.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
