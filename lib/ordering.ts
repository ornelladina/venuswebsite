// Default ordering for any list that mixes things you can sort by hand
// (display_order) with things that should just show newest first.
//
// Rule: if you typed a display order (anything above 0), that item is
// "pinned" and goes first, in that order (1, 2, 3...). Everything you left
// at 0 follows, newest added first. This is what lets Shop The Look cards
// and regular products mix together by date instead of one group landing at
// the bottom.
export type OrderableItem = {
  display_order: number;
  created_at?: string | null;
};

function timeOf(value?: string | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return isNaN(t) ? 0 : t;
}

export function compareNewestUnlessPinned(a: OrderableItem, b: OrderableItem): number {
  const aPinned = a.display_order > 0;
  const bPinned = b.display_order > 0;

  if (aPinned && bPinned) {
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return timeOf(b.created_at) - timeOf(a.created_at);
  }
  if (aPinned) return -1;
  if (bPinned) return 1;
  return timeOf(b.created_at) - timeOf(a.created_at);
}
