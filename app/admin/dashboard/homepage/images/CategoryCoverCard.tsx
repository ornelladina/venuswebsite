'use client';

import { useRef, useState } from 'react';
import { updateCategoryCover } from './actions';
import FocalPointEditor from './FocalPointEditor';
import { siteAsset } from '@/lib/assets';

export default function CategoryCoverCard({
  category,
}: {
  category: { id: string; name: string; slug: string; cover_image_url: string | null; cover_position: string | null };
}) {
  const fallbackUrl = siteAsset(`category-${category.slug}.webp`);
  const [imageUrl, setImageUrl] = useState(category.cover_image_url || fallbackUrl);
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
      const url = await updateCategoryCover(category.id, formData);
      // Use the real uploaded URL for the preview — next/image can't
      // optimize a local blob: URL, so this avoids that entirely rather
      // than working around it.
      if (url) setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload — try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleSavePosition(position: string) {
    const formData = new FormData();
    formData.set('position', position);
    await updateCategoryCover(category.id, formData);
  }

  return (
    <div data-admin-subsection>
      <div data-admin-dashboard-header>
        <h3>{category.name}</h3>
        <button type="button" data-admin-btn-secondary onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload New Cover Photo'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      {error && <p data-admin-error>{error}</p>}

      <FocalPointEditor
        previewImageUrl={imageUrl}
        previewLabel={category.name}
        initialPosition={category.cover_position || '50% 50%'}
        onSave={handleSavePosition}
      />
    </div>
  );
}
