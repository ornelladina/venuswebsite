import { supabase } from '@/lib/supabaseClient';
import { Collection } from '@/types';
import CollectionCard from '@/components/CollectionCard';
import { withPriceRanges } from '@/lib/collectionPriceRange';
import { compareNewestUnlessPinned } from '@/lib/ordering';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Shop The Look',
  alternates: { canonical: '/shop-the-look' },
};

// Every active collection shows up here (the same collections table that
// powers the curated homepage strip — this page just shows all of them,
// not only the ones flagged show_on_homepage).
async function getCollections(): Promise<Collection[]> {
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true);
  // Newest look first, oldest last — unless you typed a display order on a
  // look (1, 2, 3...), which pins it to the front in that order. See
  // lib/ordering.ts.
  const collections = await withPriceRanges(data ?? []);
  return collections.sort(compareNewestUnlessPinned);
}

export default async function ShopTheLookPage() {
  const collections = await getCollections();

  return (
    <div data-page="shop-the-look" className="home-section">
      <h1 className="section-heading-eb center">Shop The Look</h1>
      {collections.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: 24 }}>No looks yet — check back soon!</p>
      ) : (
        <div data-grid="products" style={{ marginTop: 40 }}>
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      )}
    </div>
  );
}
