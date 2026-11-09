'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ShareButton from './ShareButton';
import CopyLinkButton from './CopyLinkButton';

type Props = {
  images: string[];
  title: string;
};

// The collection hero shows just the cover photo when that's all there
// is (images.length === 1) — same as before. When collection_images adds
// extra photos, this becomes a swipeable gallery with dots underneath,
// same "big card + dots" pattern as HamsaSwiper.tsx. Native scroll-snap
// handles the swipe itself; this just keeps the dots in sync with scroll
// position and lets tapping a dot jump to that photo.
//
// It wasn't obvious that the photo and the product grid below it were two
// separate, connected things ("here's the look, here's each piece in it
// individually") — people were landing on the photo and not realizing
// there was anything to pick from. Added a "Shop the pieces" pill over
// the photo that scrolls down to the grid (id="collection-items" on the
// wrapper in app/collection/[slug]/page.tsx), plus a gentle bounce so it
// reads as tappable rather than just a caption. Tapping the photo itself
// does the same thing — a tap doesn't fire a click during a swipe, so
// this doesn't interfere with browsing the extra photos.
export default function CollectionHeroGallery({ images, title }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || images.length < 2) return;

    const updateActiveIndex = () => {
      const slideWidth = track.clientWidth;
      if (!slideWidth) return;
      const index = Math.round(track.scrollLeft / slideWidth);
      setActiveIndex(Math.max(0, Math.min(index, images.length - 1)));
    };

    track.addEventListener('scroll', updateActiveIndex, { passive: true });
    return () => track.removeEventListener('scroll', updateActiveIndex);
  }, [images.length]);

  const scrollToIndex = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  };

  const scrollToItems = () => {
    document.getElementById('collection-items')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (images.length === 0) return null;

  return (
    <div className="collection-hero-media">
      <div className="collection-hero-track" ref={trackRef} onClick={scrollToItems}>
        {images.map((src, i) => (
          <div className="collection-hero-slide" key={src + i}>
            <Image
              src={src}
              alt={title}
              width={1200}
              height={800}
              className="collection-hero-image"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {/* Sits as its own sibling (not inside .collection-hero-track above),
          same as .collection-hero-title/-dots below — the track has its
          own onClick={scrollToItems} covering the whole photo, and these
          need their taps to hit the buttons instead of that. */}
      <div className="collection-hero-actions">
        <ShareButton title={title} imageUrl={images[activeIndex]} iconOnly />
        <CopyLinkButton iconOnly />
      </div>

      <h1 className="collection-hero-title">{title}</h1>

      <button type="button" className="collection-hero-shop-cta" onClick={scrollToItems}>
        Shop the pieces
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {images.length > 1 && (
        <div className="collection-hero-dots" role="tablist" aria-label={`${title} photos`}>
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              className={`collection-hero-dot${i === activeIndex ? ' active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
