// Images that live in this site's own Supabase Storage bucket "site-assets"
// (uploaded in Supabase > Storage > site-assets). The address is built from
// NEXT_PUBLIC_SUPABASE_URL, so every copy of this site automatically reads
// from its OWN bucket, never another project's.
export const SITE_ASSETS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-assets`;

export function siteAsset(fileName: string): string {
  return `${SITE_ASSETS_BASE}/${fileName}`;
}
