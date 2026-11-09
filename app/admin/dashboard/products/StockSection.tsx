'use client';

import { useState } from 'react';
import { STYLES } from '@/lib/styles';

// The "has variations" tick box + the row it controls (stock / material /
// display order). It's a client component so that ticking the box can
// instantly swap the Stock field for a note, and so Stock is only REQUIRED
// when the product has no variations (with variations, each variation
// carries its own stock number instead).
export default function StockSection({
  initialHasVariations,
  initialStock,
  initialStyle,
  initialDisplayOrder,
}: {
  initialHasVariations: boolean;
  initialStock: number | null | undefined;
  initialStyle: string | null | undefined;
  initialDisplayOrder: number | null | undefined;
}) {
  const [hasVariations, setHasVariations] = useState(initialHasVariations);

  return (
    <>
      <label data-admin-checkbox>
        <input
          type="checkbox"
          name="has_variations"
          checked={hasVariations}
          onChange={(e) => setHasVariations(e.target.checked)}
        />
        This product has variations (sizes, colors, letters, etc.)
      </label>

      <div data-admin-field-row>
        {hasVariations ? (
          <div data-admin-field>
            <span>Stock Quantity</span>
            <p data-admin-form-hint style={{ margin: 0 }}>
              Not needed here &mdash; each variation gets its own stock number (required, 0 or more).
              You add the variations right after saving.
            </p>
          </div>
        ) : (
          <label data-admin-field>
            <span>Stock Quantity *</span>
            <input
              type="number"
              name="stock_quantity"
              min="0"
              step="1"
              required
              placeholder="0 or more"
              defaultValue={initialStock ?? ''}
            />
          </label>
        )}
        <label data-admin-field>
          <span>Material / Type *</span>
          <select name="style" required defaultValue={initialStyle ?? ''}>
            <option value="" disabled>
              Choose a material&hellip;
            </option>
            {STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.tabLabel}
              </option>
            ))}
          </select>
        </label>
        <label data-admin-field>
          <span>Display Order</span>
          <input type="number" name="display_order" step="1" defaultValue={initialDisplayOrder ?? 0} />
        </label>
      </div>
    </>
  );
}
