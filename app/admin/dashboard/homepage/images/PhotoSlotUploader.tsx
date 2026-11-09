'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { updateHeroPhoto } from './actions';

type HeroSlot =
  | 'hero_desktop_1'
  | 'hero_desktop_2'
  | 'hero_desktop_3'
  | 'hero_mobile_1'
  | 'hero_mobile_2'
  | 'hero_mobile_3';

export default function PhotoSlotUploader({
  slot,
  label,
  imageUrl,
  onUploaded,
}: {
  slot: HeroSlot;
  label: string;
  imageUrl: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const url = await updateHeroPhoto(slot, formData);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload — try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div data-admin-image-card data-wide>
      <div data-admin-image-thumb-wrap data-wide>
        <Image src={imageUrl} alt={label} width={160} height={100} style={{ objectFit: 'cover' }} />
      </div>
      <div data-admin-image-card-actions>
        <button
          type="button"
          data-admin-image-adjust
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : `Replace ${label}`}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      {error && <p data-admin-error>{error}</p>}
    </div>
  );
}
