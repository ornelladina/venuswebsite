'use client';

import { useState, useTransition } from 'react';
import { toggleCollectionHomepage } from './actions';

// A toggle switch for "Shop the Look" homepage visibility, right on the
// collections list — previously this was just a read-only "Homepage"
// badge and the only way to change it was opening the full edit page.
// Flips optimistically (updates the switch immediately) and rolls back
// if the save fails, so it feels instant on a normal connection without
// silently lying if something goes wrong.
export default function HomepageToggle({
  collectionId,
  initialValue,
}: {
  collectionId: string;
  initialValue: boolean;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    const next = !checked;
    setChecked(next);
    setError(null);

    startTransition(async () => {
      try {
        await toggleCollectionHomepage(collectionId, next);
      } catch (err) {
        setChecked(!next);
        setError(err instanceof Error ? err.message : 'Could not save. Try again.');
      }
    });
  };

  return (
    <div data-admin-toggle-wrap>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Show in Shop the Look on homepage"
        data-admin-toggle
        data-checked={checked}
        disabled={isPending}
        onClick={handleToggle}
      >
        <span data-admin-toggle-knob />
      </button>
      <span data-admin-toggle-label>Shop the Look (homepage)</span>
      {error && <span data-admin-toggle-error>{error}</span>}
    </div>
  );
}
