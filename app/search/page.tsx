import { supabase } from '@/lib/supabaseClient';
import { Product, Collection, GridItem } from '@/types';
import ProductCard from '@/components/ProductCard';
import CollectionCard from '@/components/CollectionCard';
import { withPriceRanges } from '@/lib/collectionPriceRange';
import { wordsOf, anyWordMatches } from '@/lib/searchText';

export const revalidate = 0;

// How the search works now:
//  - The search is split into words. A product shows up if ANY of those
//    words is a word in its name, its category, its SKU, or its
//    description. "triple ring" finds "Triple Zircon Band-Ring".
//  - Words match whole words only ("ring" will not pull in "earring"), and
//    plurals don't matter ("rings" = "ring"). Typing the start of a word
//    works too ("zirc" finds "zircon").
//  - Results are ranked: the more of your words a product has, and the
//    more important the place they're found (name > category > SKU >
//    description), the higher it sits.
function cleanTokens(query: string): string[] {
  return wordsOf(query).slice(0, 8);
}

type Scored<T> = { item: T; score: number };

async function searchProducts(tokens: string[]): Promise<Scored<Product>[]> {
  if (tokens.length === 0) return [];

  // Wide net first: anything where a word appears as plain text inside the
  // name / description / SKU, or whose category name contains it. The exact
  // whole-word check happens right after, in the scoring below.
  const { data: matchingCategories } = await supabase
    .from('categories')
    .select('id')
    .or(tokens.map((t) => `name.ilike.%${t}%`).join(','));
  const categoryIds = (matchingCategories ?? []).map((c: any) => c.id);

  const orFilters: string[] = [];
  tokens.forEach((t) => {
    orFilters.push(`name.ilike.%${t}%`);
    orFilters.push(`description.ilike.%${t}%`);
    orFilters.push(`sku.ilike.%${t}%`);
  });
  if (categoryIds.length > 0) {
    orFilters.push(`category_id.in.(${categoryIds.join(',')})`);
  }

  const { data } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*), categories(name)')
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .eq('is_active', true)
    .or(orFilters.join(','))
    .limit(400);

  const scored: Scored<Product>[] = [];
  (data ?? []).forEach((product: any) => {
    const nameWords = wordsOf(product.name);
    const descWords = wordsOf(product.description);
    const categoryRel = Array.isArray(product.categories) ? product.categories[0] : product.categories;
    const categoryWords = wordsOf(categoryRel?.name);
    const sku = (product.sku ?? '').toLowerCase();

    let score = 0;
    let matchedTokens = 0;
    tokens.forEach((t) => {
      let tokenScore = 0;
      if (anyWordMatches(nameWords, t)) tokenScore += 10;
      if (anyWordMatches(categoryWords, t)) tokenScore += 5;
      if (sku && sku.indexOf(t) !== -1) tokenScore += 6;
      if (anyWordMatches(descWords, t)) tokenScore += 2;
      if (tokenScore > 0) matchedTokens += 1;
      score += tokenScore;
    });

    if (score === 0) return;
    // Bonus for matching every word typed, so "triple ring" ranks the
    // product that has both words above ones that only have one.
    if (matchedTokens === tokens.length && tokens.length > 1) score += 10;
    scored.push({ item: product, score });
  });

  return scored;
}

// "Shop The Look" collections only have a name to search.
async function searchCollections(tokens: string[]): Promise<Scored<Collection>[]> {
  if (tokens.length === 0) return [];

  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .or(tokens.map((t) => `name.ilike.%${t}%`).join(','));

  const withRanges = await withPriceRanges((data ?? []) as Collection[]);

  const scored: Scored<Collection>[] = [];
  withRanges.forEach((collection) => {
    const nameWords = wordsOf(collection.name);
    let score = 0;
    let matchedTokens = 0;
    tokens.forEach((t) => {
      if (anyWordMatches(nameWords, t)) {
        score += 10;
        matchedTokens += 1;
      }
    });
    if (score === 0) return;
    if (matchedTokens === tokens.length && tokens.length > 1) score += 10;
    scored.push({ item: collection, score });
  });
  return scored;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q ?? '';
  const tokens = cleanTokens(query);
  const [products, collections] = await Promise.all([searchProducts(tokens), searchCollections(tokens)]);

  // One ranked list (best match first). Ties keep the shop's own order.
  const ranked = [
    ...products.map((p) => ({
      score: p.score,
      order: p.item.display_order,
      grid: { type: 'product' as const, display_order: p.item.display_order, product: p.item } as GridItem,
    })),
    ...collections.map((c) => ({
      score: c.score,
      order: c.item.display_order,
      grid: { type: 'collection' as const, display_order: c.item.display_order, collection: c.item } as GridItem,
    })),
  ].sort((a, b) => (b.score !== a.score ? b.score - a.score : a.order - b.order));

  const results: GridItem[] = ranked.map((r) => r.grid);

  return (
    <div data-page="search">
      <h1 className="section-heading-eb center" style={{ marginTop: 40 }}>
        Search Results for &quot;{query}&quot;
      </h1>
      {results.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div data-grid="products">
          {results.map((item) =>
            item.type === 'product' ? (
              <ProductCard key={`product-${item.product.id}`} product={item.product} />
            ) : (
              <CollectionCard key={`collection-${item.collection.id}`} collection={item.collection} />
            )
          )}
        </div>
      )}
    </div>
  );
}
