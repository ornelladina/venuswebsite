'use client';

import { useRouter } from 'next/navigation';
import { useRef, ReactNode } from 'react';

// Wraps a /style/[slug] page so that swiping/dragging moves to the
// neighboring material tab, in the same left-to-right order the tabs are
// shown in (Gold-Plated, Stainless Steel, Vintage Accessories). Swiping
// or dragging left goes to the next tab, e.g. Gold-Plated -> Stainless
// Steel (the standard "swipe left to advance" convention); dragging
// right goes to the previous one. Does nothing past the first/last tab
// (no wraparound), and ignores mostly-vertical drags so normal scrolling
// isn't affected.
//
// Uses the Pointer Events API (not Touch Events) so this works the same
// way for a finger swipe on mobile AND a mouse/trackpad drag on desktop.
// The wrapper below gets the shared .swipe-nav-pointer class (see
// globals.css) — without it, the browser treats any vertical wobble in
// the drag as an attempt to scroll the page and cancels the pointer
// sequence before pointerup ever fires, so the swipe would almost never
// register.
// Individual product-card photo swipes (touch-based, see ProductCard)
// are excluded from this: handlePointerDown below ignores any drag that
// starts on a card's own image (.product-card-image-wrap), so a swipe on
// a product photo only ever cycles that card's photos and never also
// jumps to the next/previous material page.
const SWIPE_THRESHOLD = 50; // minimum horizontal drag, in px, to count as a swipe

export default function StyleSwipeNav({
  slugs,
  currentSlug,
  children,
}: {
  slugs: string[];
  currentSlug: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  // A two-finger swipe on a trackpad never fires pointer/touch events at
  // all — the browser reports it as a 'wheel' event instead (deltaX/deltaY
  // are how far that gesture moved), which handlePointerDown/Up below never
  // listens for. This is a separate, additional listener just for that
  // gesture. wheelCooldown blocks repeat triggers: a single physical
  // two-finger swipe fires many rapid wheel events (one per tiny movement
  // frame), so without it one swipe would flip through several tabs at once
  // instead of moving to just the next one.
  const wheelCooldown = useRef(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (wheelCooldown.current) return;
    // Ignore mostly-vertical wheel activity (ordinary page-scroll trackpad
    // motion) so it isn't mistaken for a horizontal swipe.
    if (Math.abs(e.deltaX) < SWIPE_THRESHOLD || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;

    const currentIndex = slugs.indexOf(currentSlug);
    if (currentIndex === -1) return;

    // Same left/right convention as the pointer-drag handler below:
    // deltaX positive = content moving left under your fingers = advance.
    const nextIndex = e.deltaX > 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= slugs.length) return;

    wheelCooldown.current = true;
    router.push(`/style/${slugs[nextIndex]}`);
    setTimeout(() => {
      wheelCooldown.current = false;
    }, 600);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // A drag that starts on a product card's own photo has nothing to do
    // with switching material tabs — that's the card's own left/right
    // swipe between that product's photos (see ProductCard.tsx). Without
    // this check, both gestures fired off the same physical swipe: the
    // card would cycle to its next photo AND the page would jump to the
    // next material tab. Not tracking the drag at all here (rather than
    // just skipping the tab-switch on pointerup) means a swipe that
    // starts on a card image is left entirely to the card's own touch
    // handlers, with no interference from this wrapper.
    if (e.target instanceof Element && e.target.closest('.product-card-image-wrap')) {
      pointerStart.current = null;
      return;
    }
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;

    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) return;

    const currentIndex = slugs.indexOf(currentSlug);
    if (currentIndex === -1) return;

    // Swipe left (finger moves right-to-left, deltaX negative) -> next
    // page; swipe right -> previous. Standard "swipe left to advance"
    // convention (like flipping to the next page/photo).
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= slugs.length) return;

    router.push(`/style/${slugs[nextIndex]}`);
  };

  return (
    <div
      className="swipe-nav-pointer"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
      onWheel={handleWheel}
    >
      {children}
    </div>
  );
}
