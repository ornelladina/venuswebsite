import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { SITE_URL } from '@/lib/siteUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('products').select('slug, updated_at').eq('is_active', true),
    supabase.from('categories').select('slug'),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/new`, changeFrequency: 'daily', priority: 0.8 },
  ];

  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${SITE_URL}/product/${p.slug}`,
    lastModified: p.updated_at ?? undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
