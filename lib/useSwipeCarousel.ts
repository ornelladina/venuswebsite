'use client';

import { useEffect } from 'react';
import { smoothScrollTo, easeOutCubic } from './smoothScroll';

// Turns a horizontally-scrolling carousel track into a hand-controlled
// swipe: while a finger is down, the track follows it 1:1 (same feel as
// before). On release this settles to a single nearest card (never lets
// a too-hard flick send the whole row flying several cards past where
// you meant to stop), over the same fixed, gentle animation (see
// smoothScrollTo).
//
// Which card it lands on now depends on BOTH how far your finger
// travelled AND how fast it was moving right at release — a quick,
// decisive flick advances one card even if it only covered a short
// distance (same as native momentum scrolling), while a slow, deliberate
// drag falls back to snapping to whichever card is nearest. Previously
// this only ever looked at distance, which is what made a normal quick
// swipe often fall short of the halfway point between cards and snap
// straight back — you had to drag unusually far/hard for anything to
// visibly happen.
//
// Used for the home page's Featured Items, Hamsa & Eye, and Best Sellers
// carousels. Each card inside these tracks is rendered with
// swipeable={false} (see ProductCard.tsx), and the matching CSS gives
// these specific tracks touch-action: pan-y so the browser leaves
// horizontal drags on them alone for this to handle — see the
// [data-swipeable='false'] override for these track classes in
// globals.css.

// Instantaneous speed (px/ms) right at release that counts as a
// deliberate flick — measured from the last two touchmove samples, not
// the whole gesture's average, so a quick flick after a brief pause
// still registers correctly. ~0.35px/ms is roughly 350px/s, comfortably
// above ordinary finger jitter but well below what it takes to "throw"
// the track today.
const FLICK_VELOCITY = 0.35;
// A flick still needs to have moved a little in the right direction —
// this rules out a fast but essentially stationary tap/wobble from
// being misread as a flick.
const FLICK_MIN_DISTANCE = 10;

export function useSwipeCarousel(trackRef: React.RefObject<HTMLDivElement | null>, settleMs = 220) {
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let dragging = false;
    let dirCommitted: 'horizontal' | 'vertical' | null = null;
    // The last two touchmove samples (position + time), used at release
    // to work out how fast the finger was moving at that exact instant.
    let lastMoveX = 0;
    let lastMoveTime = 0;
    let prevMoveX = 0;
    let prevMoveTime = 0;

    const settle = (targetLeft: number) => {
      const max = track.scrollWidth - track.clientWidth;
      const clamped = Math.max(0, Math.min(targetLeft, max));
      // Ease-out, not the ease-in-out used for button/dot taps: the
      // finger was already moving when it lifted, so this continues that
      // motion straight into the landing spot instead of visibly winding
      // up from a stop first — that's what made the snap feel slow.
      smoothScrollTo(track, clamped, settleMs, easeOutCubic);
    };

    // Picks the child whose left edge is closest to where the track
    // currently sits, biased toward whichever direction the finger was
    // actually still moving in when it lifted (so a deliberate, if short,
    // drag past the halfway point of a card still advances a slide,
    // matching how a paged swipe is expected to feel).
    const nearestChildLeft = (bias: number) => {
      const children = Array.from(track.children) as HTMLElement[];
      if (children.length === 0) return track.scrollLeft;
      const current = track.scrollLeft + bias;
      let closest = children[0].offsetLeft;
      let closestDist = Math.abs(closest - current);
      for (const child of children) {
        const dist = Math.abs(child.offsetLeft - current);
        if (dist < closestDist) {
          closest = child.offsetLeft;
          closestDist = dist;
        }
      }
      return closest;
    };

    // For a fast flick: always steps exactly one card from whichever
    // card the track is currently closest to, in the direction the
    // finger was moving — regardless of how little distance it actually
    // covered. Clamped so a flick at either end of the row can't step
    // past the first/last card.
    const neighborChildLeft = (dir: 1 | -1) => {
      const children = Array.from(track.children) as HTMLElement[];
      if (children.length === 0) return track.scrollLeft;
      let closestIndex = 0;
      let closestDist = Infinity;
      children.forEach((child, i) => {
        const dist = Math.abs(child.offsetLeft - track.scrollLeft);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      });
      const targetIndex = Math.max(0, Math.min(children.length - 1, closestIndex + dir));
      return children[targetIndex].offsetLeft;
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startScrollLeft = track.scrollLeft;
      dragging = true;
      dirCommitted = null;
      lastMoveX = t.clientX;
      lastMoveTime = e.timeStamp;
      prevMoveX = t.clientX;
      prevMoveTime = e.timeStamp;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (dirCommitted === null) {
        // Small jitter tolerance before committing to a direction, same
        // threshold used for the per-photo swipe on an individual card.
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        dirCommitted = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'horizontal' : 'vertical';
      }

      if (dirCommitted === 'horizontal') {
        e.preventDefault();
        track.scrollLeft = startScrollLeft - dx;
        prevMoveX = lastMoveX;
        prevMoveTime = lastMoveTime;
        lastMoveX = t.clientX;
        lastMoveTime = e.timeStamp;
      }
      // Vertical drags are left alone entirely so the page scrolls normally.
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!dragging) return;
      dragging = false;
      if (dirCommitted !== 'horizontal') return;

      const t = e.changedTouches[0];
      const dx = t.clientX - startX;

      // Instantaneous velocity right at release, from the last two
      // recorded touchmove samples — a quick flick advances one card
      // even if the finger barely travelled, same as native momentum
      // scrolling would.
      const dt = lastMoveTime - prevMoveTime;
      const velocity = dt > 0 ? (lastMoveX - prevMoveX) / dt : 0;

      if (Math.abs(velocity) > FLICK_VELOCITY && Math.abs(dx) > FLICK_MIN_DISTANCE) {
        settle(neighborChildLeft(velocity < 0 ? 1 : -1));
        return;
      }

      // A short, slow drag still counts as "moving toward" whichever
      // direction it was headed, even if the finger didn't travel a full
      // card's width — a small nudge in the negative-dx direction biases
      // the nearest-card search a bit further along, so a light-but-clear
      // drag still advances one card instead of snapping straight back.
      const bias = dx < 0 ? 40 : dx > 0 ? -40 : 0;
      settle(nearestChildLeft(bias));
    };

    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchmove', onTouchMove, { passive: false });
    track.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      track.removeEventListener('touchstart', onTouchStart);
      track.removeEventListener('touchmove', onTouchMove);
      track.removeEventListener('touchend', onTouchEnd);
    };
  }, [trackRef, settleMs]);
}

