'use client';

import { useState } from 'react';
import { updateFeaturedSubtitle } from './actions';

// The small uppercase line under the "Featured Items" heading on the
// homepage (currently "Leather brand bracelets") — same
// saving/saved-state pattern as FocalPointEditor.tsx's Save button.
export default function EditFeaturedSubtitleForm({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('featured_subtitle', value);
      await updateFeaturedSubtitle(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} data-admin-field style={{ maxWidth: 420, marginBottom: 20 }}>
      <span>Subtitle text</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Leather brand bracelets"
        required
      />
      <div data-admin-form-actions>
        <button type="submit" data-admin-btn-primary disabled={saving || value.trim() === ''}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span data-admin-form-hint>Saved — live on the homepage now.</span>}
        {error && <span data-admin-form-hint>{error}</span>}
      </div>
    </form>
  );
}
