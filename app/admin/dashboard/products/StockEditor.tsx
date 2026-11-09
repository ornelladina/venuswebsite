'use client';

import { useEffect, useRef, useState } from 'react';
import { restockProduct, restockVariation } from './actions';

// One "type the number, hit Save" box that starts out showing the CURRENT
// stock (unlike the Sold Out page's restock box, which starts empty). Built
// for going down the Products list fixing many numbers quickly: change the
// number, press Enter or click Save, move on to the next row.
//
// It only ever writes stock_quantity (via restockProduct / restockVariation
// in actions.ts) — nothing else on the product is touched.
function StockInput({
  initial,
  label,
  onSave,
}: {
  initial: number;
  label: string;
  onSave: (quantity: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(initial));
  const [baseline, setBaseline] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the page refreshes with a different number from the server (e.g. an
  // order just came in) and you haven't started typing, show the new one.
  const prevInitial = useRef(initial);
  useEffect(() => {
    if (prevInitial.current !== initial) {
      const prev = prevInitial.current;
      prevInitial.current = initial;
      setBaseline(initial);
      setValue((current) => (current === String(prev) ? String(initial) : current));
    }
  }, [initial]);

  const dirty = value.trim() !== String(baseline);

  async function handleSave() {
    const quantity = Number(value);
    if (value.trim() === '' || !Number.isInteger(quantity) || quantity < 0) {
      setError('Whole number, 0 or more.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(quantity);
      setBaseline(quantity);
      setValue(String(quantity));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-admin-stock-input data-dirty={dirty ? 'true' : undefined}>
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (dirty && !saving) handleSave();
          }
        }}
        aria-label={label}
      />
      <button
        type="button"
        data-admin-btn-primary
        onClick={handleSave}
        disabled={saving || (!dirty && !saved)}
      >
        {saving ? '...' : saved ? 'Saved ✓' : 'Save'}
      </button>
      {error && (
        <span data-field-hint data-field-error>
          {error}
        </span>
      )}
    </div>
  );
}

export default function StockEditor({ product }: { product: any }) {
  const variations: any[] = product.product_variations ?? [];

  // Plain product: its own stock number.
  if (variations.length === 0) {
    return (
      <div data-admin-stock-block>
        <span data-admin-stock-label>Stock</span>
        <StockInput
          initial={product.stock_quantity ?? 0}
          label={`Stock for ${product.name}`}
          onSave={(q) => restockProduct(product.id, q)}
        />
      </div>
    );
  }

  // Product with options (colors, sizes, letters...): the real stock lives
  // on each option, so each one gets its own box, tucked into a dropdown so
  // a product with 26 letters doesn't stretch the whole list.
  const total = variations.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0);
  return (
    <div data-admin-stock-block>
      <details data-admin-stock-variations>
        <summary>
          Stock: {total} · {variations.length} option{variations.length === 1 ? '' : 's'}
        </summary>
        <div data-admin-stock-variation-list>
          {variations.map((v) => (
            <div key={v.id} data-admin-stock-variation-row>
              <span data-admin-stock-variation-name>
                {v.variation_value}
                {v.variation_type ? <small> ({v.variation_type})</small> : null}
              </span>
              <StockInput
                initial={v.stock_quantity ?? 0}
                label={`Stock for ${product.name} — ${v.variation_value}`}
                onSave={(q) => restockVariation(v.id, product.id, q)}
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
