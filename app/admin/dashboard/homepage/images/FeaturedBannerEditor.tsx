'use client';

import { useRef, useState } from 'react';
import FocalPointEditor from './FocalPointEditor';
import { removeFeaturedBanner, updateFeaturedBanner, updateFeaturedBannerPosition } from './actions';

// The banner above the Featured Items cards on the homepage. Replace the
// photo, drag it to move it, Ctrl/⌘ + scroll (or pinch) to zoom, then Save.
export default function FeaturedBannerEditor({
  initialUrl,
  initialPosition,
  initialZoom,
}: {
  initialUrl: string;
  initialPosition: string;
  initialZoom: number;
}) {
  const [url, setUrl] = useState(initialUrl);
  // Bumped whenever a photo is replaced/removed so the editor below starts
  // fresh (centered, no zoom) instead of keeping the old photo's framing.
  const [version, setVersion] = useState(0);
  const [position, setPosition] = useState(initialPosition || '50% 50%');
  const [zoom, setZoom] = useState(Number(initialZoom) || 0);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
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
      const newUrl = await updateFeaturedBanner(formData);
      setUrl(newUrl);
      setPosition('50% 50%');
      setZoom(0);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload — try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove the banner from the homepage?')) return;
    setRemoving(true);
    setError(null);
    try {
      await removeFeaturedBanner();
      setUrl('');
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove — try again.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <div data-admin-form-actions style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          type="button"
          data-admin-btn-secondary
          onClick={() => inputRef.current?.click()}
          disabled={uploading || removing}
        >
          {uploading ? 'Uploading…' : url ? 'Replace Banner Photo' : 'Upload Banner Photo'}
        </button>
        {url && (
          <button type="button" data-admin-btn-secondary onClick={handleRemove} disabled={uploading || removing}>
            {removing ? 'Removing…' : 'Remove Banner'}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      {error && <p data-admin-error>{error}</p>}

      {url ? (
        <FocalPointEditor
          key={`${version}-${url}`}
          previewImageUrl={url}
          previewLabel="the Featured Items banner"
          initialPosition={position}
          initialZoom={zoom}
          zoomRange={[0, 60]}
          sharedAcrossGroup={false}
          frame="banner"
          onSave={async (pos, z) => {
            await updateFeaturedBannerPosition(pos, z ?? zoom);
            setPosition(pos);
            setZoom(z ?? zoom);
          }}
        />
      ) : (
        <p data-admin-empty>No banner yet — upload a photo and it appears above the Featured Items cards.</p>
      )}
    </div>
  );
}
