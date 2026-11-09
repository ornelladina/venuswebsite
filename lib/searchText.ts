// Word handling shared by the search page and the "You May Also Like"
// matching, so both treat words the same way.
//
// Words are lowercased, accents removed, and a trailing "s" dropped, so
// "rings" and "ring" are the same word. Splitting happens on anything that
// isn't a letter or number, so "Band-Ring" becomes "band" and "ring".

const STOP_WORDS: { [word: string]: boolean } = {};
['a', 'an', 'the', 'and', 'or', 'for', 'with', 'of', 'in', 'on', 'to', 'my', 'me', 'is', 'it', 'by', 'at', 'from'].forEach(
  (w) => {
    STOP_WORDS[w] = true;
  }
);

export function isStopWord(word: string): boolean {
  return STOP_WORDS[word] === true;
}

export function normalizeWord(word: string): string {
  let s = word.toLowerCase();
  if (typeof s.normalize === 'function') {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  if (s.length > 3 && s.charAt(s.length - 1) === 's' && s.charAt(s.length - 2) !== 's') {
    s = s.slice(0, -1);
  }
  return s;
}

// Every normalized word in a piece of text (duplicates removed, stop words
// and 1-letter words dropped).
export function wordsOf(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen: { [word: string]: boolean } = {};
  const out: string[] = [];
  text
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06ff\u00c0-\u024f]+/)
    .forEach((raw) => {
      if (!raw) return;
      const w = normalizeWord(raw);
      if (w.length < 2 || isStopWord(w) || seen[w]) return;
      seen[w] = true;
      out.push(w);
    });
  return out;
}

// True when `word` is the same as, or starts with, `token`
// ("zirc" finds "zircon"; "ring" does NOT find "earring").
export function wordStartsWith(word: string, token: string): boolean {
  return word === token || word.indexOf(token) === 0;
}

export function anyWordMatches(words: string[], token: string): boolean {
  for (let i = 0; i < words.length; i++) {
    if (wordStartsWith(words[i], token)) return true;
  }
  return false;
}
