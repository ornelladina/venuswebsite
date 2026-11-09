import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/types';
import { wordsOf } from '@/lib/searchText';

// "You May Also Like" picks, best first:
//   1. Other pieces from any Shop The Look this product is part of (up to 4).
//   2. Pieces that share what makes this one distinctive: words in the
//      name/description like "zircon", "eye", "butterfly", the same style
//      (material), the Hamsa & Eye or Classical tags. Rarer shared words
//      count for more than common ones ("zircon" beats "gold"), and the
//      results are spread across rings / bracelets / necklaces instead of
//      showing only the same kind.
//   3. If that still leaves fewer than 4, more from the same category.
//
// Words that only describe the kind of jewelry (ring, bracelet, set, ...)
// are ignored when matching, so a zircon ring is matched to zircon pieces,
// not to every ring.

const TYPE_WORDS: { [word: string]: boolean } = {};
[
  'ring', 'band', 'bracelet', 'bangle', 'necklace', 'earring', 'earing', 'stud', 'hoop', 'pendant', 'chain',
  'charm', 'anklet', 'set', 'piece', 'jewelry', 'jewellery', 'accessory', 'accessorie', 'women', 'woman',
  'lady', 'girl', 'new', 'size', 'adjustable', 'color', 'colour', 'design', 'style', 'perfect', 'gift',
  'quality', 'wear', 'daily', 'everyday', 'made', 'item', 'product', 'plated', 'plate',
].forEach((w) => {
  TYPE_WORDS[w] = true;
});

function distinctiveWords(text: string | null | undefined): string[] {
  return wordsOf(text).filter((w) => w.length >= 3 && !TYPE_WORDS[w]);
}

const FULL_SELECT = '*, product_images(*), product_variations(*)';

async function getLookCompanions(productId: string, maxItems: number): Promise<Product[]> {
  const { data: memberships } = await supabase
    .from('collection_products')
    .select('collection_id, collections(is_active)')
    .eq('product_id', productId);

  const collectionIds: string[] = [];
  (memberships ?? []).forEach((m: any) => {
    const c = Array.isArray(m.collections) ? m.collections[0] : m.collections;
    if (c && c.is_active === false) return;
    if (collectionIds.indexOf(m.collection_id) === -1) collectionIds.push(m.collection_id);
  });
  if (collectionIds.length === 0) return [];

  const { data } = await supabase
    .from('collection_products')
    .select(`display_order, products(${FULL_SELECT})`)
    .order('display_order', { foreignTable: 'products.product_images', ascending: true })
    .in('collection_id', collectionIds)
    .order('display_order', { ascending: true });

  const seen: { [id: string]: boolean } = {};
  const out: Product[] = [];
  (data ?? []).forEach((row: any) => {
    const p = Array.isArray(row.products) ? row.products[0] : row.products;
    if (!p || p.id === productId || p.is_active === false || seen[p.id]) return;
    seen[p.id] = true;
    out.push(p);
  });
  return out.slice(0, maxItems);
}

type Light = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  style: string | null;
  is_hamsa_eye: boolean;
  is_classical: boolean;
};

export async function getRelatedProducts(product: Product, limit = 8): Promise<Product[]> {
  const picked: Product[] = [];
  const pickedIds: { [id: string]: boolean } = { [product.id]: true };
  const add = (p: Product) => {
    if (pickedIds[p.id] || picked.length >= limit) return;
    pickedIds[p.id] = true;
    picked.push(p);
  };

  // 1. Same Shop The Look
  const companions = await getLookCompanions(product.id, 4);
  companions.forEach(add);

  // 2. Similar by name/description/style
  const { data: catalog } = await supabase
    .from('products')
    .select('id, name, description, category_id, style, is_hamsa_eye, is_classical')
    .eq('is_active', true)
    .limit(2000);
  const all: Light[] = (catalog ?? []) as Light[];

  const nameWordsById: { [id: string]: string[] } = {};
  const descWordsById: { [id: string]: string[] } = {};
  const docFrequency: { [word: string]: number } = {};
  all.forEach((p) => {
    const nameWords = distinctiveWords(p.name);
    const descWords = distinctiveWords(p.description);
    nameWordsById[p.id] = nameWords;
    descWordsById[p.id] = descWords;
    const unique: { [w: string]: boolean } = {};
    nameWords.concat(descWords).forEach((w) => {
      unique[w] = true;
    });
    Object.keys(unique).forEach((w) => {
      docFrequency[w] = (docFrequency[w] ?? 0) + 1;
    });
  });

  // Rare words matter more: ln(total / products that contain the word).
  const total = Math.max(all.length, 1);
  const weight = (w: string) => Math.log(total / (docFrequency[w] ?? 1));
  const has = (words: string[], w: string) => words.indexOf(w) !== -1;

  const myName = nameWordsById[product.id] ?? distinctiveWords(product.name);
  const myDesc = descWordsById[product.id] ?? distinctiveWords(product.description);

  const scored: { p: Light; score: number }[] = [];
  all.forEach((c) => {
    if (pickedIds[c.id]) return;
    const cName = nameWordsById[c.id];
    const cDesc = descWordsById[c.id];
    let score = 0;
    myName.forEach((w) => {
      if (has(cName, w)) score += 3 * weight(w);
      else if (has(cDesc, w)) score += 1.5 * weight(w);
    });
    myDesc.forEach((w) => {
      if (has(cName, w)) score += 1.5 * weight(w);
      else if (has(cDesc, w)) score += 0.5 * weight(w);
    });
    if (score <= 0) return;
    if (product.style && c.style === product.style) score += 0.5;
    if (product.is_hamsa_eye && c.is_hamsa_eye) score += 2;
    if (product.is_classical && c.is_classical) score += 1;
    if (product.category_id && c.category_id === product.category_id) score += 0.3;
    scored.push({ p: c, score });
  });
  scored.sort((a, b) => b.score - a.score);

  // Spread across categories: at most 3 per category on the first pass,
  // then fill any remaining spots with the next best regardless.
  const wanted = Math.max(limit - picked.length, 0);
  const chosenIds: string[] = [];
  const perCategory: { [cat: string]: number } = {};
  scored.forEach((s) => {
    if (chosenIds.length >= wanted) return;
    const cat = s.p.category_id ?? 'none';
    if ((perCategory[cat] ?? 0) >= 3) return;
    perCategory[cat] = (perCategory[cat] ?? 0) + 1;
    chosenIds.push(s.p.id);
  });
  scored.forEach((s) => {
    if (chosenIds.length >= wanted) return;
    if (chosenIds.indexOf(s.p.id) === -1) chosenIds.push(s.p.id);
  });

  if (chosenIds.length > 0) {
    const { data: full } = await supabase
      .from('products')
      .select(FULL_SELECT)
      .order('display_order', { foreignTable: 'product_images', ascending: true })
      .in('id', chosenIds);
    const byId: { [id: string]: Product } = {};
    (full ?? []).forEach((p: any) => {
      byId[p.id] = p;
    });
    chosenIds.forEach((id) => {
      if (byId[id]) add(byId[id]);
    });
  }

  // 3. Not enough similar pieces — fall back to the same category.
  if (picked.length < 4 && product.category_id) {
    const { data } = await supabase
      .from('products')
      .select(FULL_SELECT)
      .order('display_order', { foreignTable: 'product_images', ascending: true })
      .eq('category_id', product.category_id)
      .eq('is_active', true)
      .neq('id', product.id)
      .order('created_at', { ascending: false })
      .limit(8);
    (data ?? []).forEach((p: any) => add(p));
  }

  return picked;
}
