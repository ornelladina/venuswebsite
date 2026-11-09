'use client';

import { useState } from 'react';
import PhotoSlotUploader from './PhotoSlotUploader';
import FocalPointEditor from './FocalPointEditor';
import { updateHeroPosition } from './actions';

type DesktopProps = {
  breakpoint: 'desktop';
  photos: [string, string, string];
  // One position/zoom per photo (see
  // supabase/migration_desktop_per_photo_and_mobile_text_color.sql).
  positions: [string, string, string];
  zooms: [number, number, number];
  zoomMax: number;
};

type MobileProps = {
  breakpoint: 'mobile';
  photos: [string, string, string];
  // One position/zoom per photo now, instead of one shared pair — see
  // supabase/migration_hero_text_colors_and_mobile_per_photo.sql.
  positions: [string, string, string];
  zooms: [number, number, number];
  zoomMax: number;
};

export default function HeroBreakpointSection(props: DesktopProps | MobileProps) {
  const [photos, setPhotos] = useState<[string, string, string]>(props.photos);
  const slots =
    props.breakpoint === 'desktop'
      ? (['hero_desktop_1', 'hero_desktop_2', 'hero_desktop_3'] as const)
      : (['hero_mobile_1', 'hero_mobile_2', 'hero_mobile_3'] as const);

  function handleUploaded(i: number, url: string) {
    setPhotos((prev) => {
      const next = [...prev] as [string, string, string];
      next[i] = url;
      return next;
    });
  }

  return (
    <div>
      <div data-admin-image-grid>
        {slots.map((slot, i) => (
          <PhotoSlotUploader
            key={slot}
            slot={slot}
            label={`Photo ${i + 1}`}
            imageUrl={photos[i]}
            onUploaded={(url) => handleUploaded(i, url)}
          />
        ))}
      </div>

      {[0, 1, 2].map((i) => (
        <FocalPointEditor
          // The photo URL is in the key so the editor reloads its preview
          // when a new photo is uploaded into that slot.
          key={`${i}-${photos[i]}`}
          previewImageUrl={photos[i]}
          previewLabel={`Photo ${i + 1}`}
          initialPosition={props.positions[i]}
          initialZoom={props.zooms[i]}
          zoomRange={[0, props.zoomMax]}
          sharedAcrossGroup={false}
          frame={props.breakpoint === 'desktop' ? 'wide' : 'tall'}
          onSave={(pos, z) =>
            updateHeroPosition(props.breakpoint, pos, z ?? props.zooms[i], (i + 1) as 1 | 2 | 3)
          }
        />
      ))}
    </div>
  );
}
