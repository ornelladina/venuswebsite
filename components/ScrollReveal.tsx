'use client';

import { useEffect } from 'react';

/**
 * Mounted once in the root layout. Renders nothing — it just scans the page
 * for any element with a `data-reveal` attribute and adds `.is-inview` to it
 * the first time it scrolls into the viewport (see the [data-reveal] CSS
 * rules in globals.css for the actual fade/slide-up look). Each element is
 * only revealed once; scrolling back up doesn't hide it again.
 *
 * Runs on every route change (App Router keeps this component mounted
 * across navigations since it lives in layout.tsx, so it re-scans whenever
 * the pathname it's told about changes).
 */
export default function ScrollReveal() {
  useEffect(() => {
    const revealNow = (el: Element) => el.classList.add('is-inview');

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('[data-reveal]').forEach(revealNow);
      return;
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      document.querySelectorAll('[data-reveal]').forEach(revealNow);
      return;
    }

    // On mobile the viewport is short, so the old -8% bottom margin (which
    // requires an element to scroll well past the bottom edge before it
    // counts as "in view") made cards sit blank on screen for a long
    // stretch of scrolling. A positive bottom margin does the opposite —
    // it starts revealing a card while it's still a bit below the visible
    // viewport, so by the time it actually scrolls into view it's already
    // faded/slid in.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealNow(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      isMobile
        ? { threshold: 0.01, rootMargin: '0px 0px 120px 0px' }
        : { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    // Observe whatever's already on the page, then keep watching for new
    // [data-reveal] elements that show up later (route changes, data that
    // loads in after the initial render, etc.).
    const observeAll = () => {
      document.querySelectorAll('[data-reveal]:not(.is-inview)').forEach((el) => observer.observe(el));
    };
    observeAll();

    const mutationObserver = new MutationObserver(() => observeAll());
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
