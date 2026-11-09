'use client';

import { useEffect, useRef, useState } from 'react';

export type HeroSlide = {
  heading: string;
  subtext: string;
  buttonLabel: string;
  buttonLink: string;
  // Applied to both the heading and subtext of this slide — see
  // supabase/migration_hero_text_colors_and_mobile_per_photo.sql and the
  // "Text color" field on each slide at /admin/dashboard/homepage/images.
  textColor: string;
  // Same, but for mobile only ('' = default beige).
  mobileTextColor?: string;
};

// The heading+subtext now crossfade on-screen exactly like the 3 photos
// do — see the "Hero text crossfade" block in globals.css for the actual
// fade (it's pure CSS: 3 stacked slides, each with its own animation-
// delay, identical 18s/0-6-12s timing to the photo crossfade so the two
// change in lockstep). This component's job is just to render all 3
// slides for that CSS to animate, plus separately track which slide is
// "current" for the button below.
//
// The button is deliberately NOT one of the 3 fading slides — see the
// note above .hero-text-stack in globals.css: a CTA that periodically
// disappears was already flagged once as a real risk on mobile (someone
// glancing back mid-cycle finding no "Shop Now" button). It stays
// permanently on screen and only swaps its own label/link — timed below
// to land at t=7s, 13s, 19s... i.e. the midpoint of each photo/text
// crossfade window (each crossfade runs from t=6s to t=8s within its
// slide's local 18s loop, staggered 6s apart per slide — see @keyframes
// hero-slide-fade in globals.css), so the button's swap doesn't visibly
// lead or lag the fade happening above it.
// Turns a heading into display lines. If you typed line breaks in the admin
// they are respected exactly. If a heading is one unbroken line (e.g.
// "High-Fashion Brand Bracelets"), it is split automatically so every slide
// gets the same regular/bold/italic rhythm as slide 1:
//   1. split after sentence endings ("Trendy. Classy. Affordable." -> 3 lines)
//   2. otherwise split into two lines of as-even-as-possible length.
function splitHeading(heading: string): string[] {
  const manual = heading.split('\n').map((l) => l.trim()).filter(Boolean);
  if (manual.length > 1) return manual;
  const text = manual[0] ?? '';
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((x) => x.trim()) ?? [];
  if (sentences.length > 1 && sentences.length <= 3) return sentences;
  const words = text.split(/\s+/);
  if (words.length < 2) return [text];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

export default function HeroPanelCycle({ slides }: { slides: HeroSlide[] }) {
  const [buttonIndex, setButtonIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (slides.length <= 1) return;
    // First swap at 7s (midpoint of the first crossfade, 6s-8s), then
    // every 6s after that — matches one slide's 6s "slot" exactly, so it
    // keeps landing on each subsequent crossfade's midpoint indefinitely
    // without needing to reset/resync against the CSS animation's own
    // 18s loop.
    timeoutRef.current = setTimeout(() => {
      setButtonIndex((i) => (i + 1) % slides.length);
      intervalRef.current = setInterval(() => {
        setButtonIndex((i) => (i + 1) % slides.length);
      }, 6000);
    }, 7000);

    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(intervalRef.current);
    };
  }, [slides.length]);

  if (slides.length === 0) return null;
  const buttonSlide = slides[buttonIndex] ?? slides[0];

  return (
    <div className="hero-panel">
      <div className="hero-text-stack">
        {slides.map((slide, i) => {
          const headingLines = splitHeading(slide.heading);
          return (
            <div
              className={`hero-text-slide hero-text-slide-${i + 1}`}
              key={i}
              // Colors go in as CSS variables so desktop and mobile can differ
              // (the actual color rules are at the end of globals.css).
              style={
                {
                  '--hero-c-d': slide.textColor || undefined,
                  '--hero-c-m': slide.mobileTextColor || undefined,
                } as React.CSSProperties
              }
            >
              <h1 className="hero-heading">
                {headingLines.map((line, j) => {
                  // Each line gets its own style, like the reference site:
                  // first line regular, middle lines bold, last line italic
                  // (a 2-line heading is bold + italic, 1 line is bold).
                  const last = headingLines.length - 1;
                  const style =
                    j === last && last > 0
                      ? 'italic'
                      : j === 0 && last > 1
                        ? 'regular'
                        : 'bold';
                  return (
                    <span className={`hero-line hero-line-${style}`} key={j}>
                      {line}
                    </span>
                  );
                })}
              </h1>
              <p className="hero-subtext">
                {slide.subtext}
              </p>
            </div>
          );
        })}
      </div>
      <a href={buttonSlide.buttonLink || '/shop'} className="hero-cta">
        <span className="btn-label">{buttonSlide.buttonLabel || 'SHOP NOW'}</span>
      </a>
    </div>
  );
}
