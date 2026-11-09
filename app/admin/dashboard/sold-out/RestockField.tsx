'use client';

import { useState } from 'react';

// One inline "type a number, hit Save" control — used for both a plain
// product's stock_quantity and a single variation's stock_quantity on
// /admin/dashboard/sold-out. Deliberately NOT a +/- stepper: restocking
// is usually "I just got 20 more in", i.e. typing a real new total, not
// clicking + twenty times.
export default function RestockField({
  onSave,
}: {
  /** Save the given quantity. Throw to show an error (matches every other
   *  admin form's save pattern in this app, e.g. HeroTextSlideForm). */
  onSave: (quantity: number) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const quantity = Number(value);
    if (value.trim() === '' || !Number.isFinite(quantity) || quantity < 0) {
      setError('Enter a quantity of 0 or more.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(quantity);
      setSaved(true);
      setValue('');
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-admin-restock-field>
      <input
        type="number"
        min={0}
        placeholder="New stock #"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
        }}
        aria-label="New stock quantity"
      />
      <button type="button" data-admin-btn-primary onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Restock'}
      </button>
      {error && <span data-field-hint data-field-error>{error}</span>}
    </div>
  );
}
