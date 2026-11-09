'use client';

import { useState } from 'react';

type ItemOption = { id: string; name: string };

// Value submitted is "product:<id>" or "collection:<id>" — actions.ts
// splits on the first colon to know which table to update.
export default function AddItemForm({
  productOptions,
  collectionOptions,
  action,
  emptyMessage,
}: {
  productOptions: ItemOption[];
  collectionOptions: ItemOption[];
  action: (formData: FormData) => Promise<void>;
  emptyMessage: string;
}) {
  const [filter, setFilter] = useState('');

  const term = filter.trim().toLowerCase();
  const filteredProducts = term ? productOptions.filter((p) => p.name.toLowerCase().includes(term)) : productOptions;
  const filteredCollections = term
    ? collectionOptions.filter((c) => c.name.toLowerCase().includes(term))
    : collectionOptions;

  if (productOptions.length === 0 && collectionOptions.length === 0) {
    return <p data-admin-form-hint>{emptyMessage}</p>;
  }

  return (
    <form action={action} data-admin-variation-row data-admin-variation-row-new>
      <input
        type="text"
        placeholder="Filter…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ maxWidth: 180 }}
      />
      <select name="item_id" required defaultValue="">
        <option value="" disabled>
          Choose a product or collection…
        </option>
        {filteredProducts.length > 0 && (
          <optgroup label="Products">
            {filteredProducts.map((p) => (
              <option key={`product-${p.id}`} value={`product:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
        {filteredCollections.length > 0 && (
          <optgroup label="Collections (Shop The Look)">
            {filteredCollections.map((c) => (
              <option key={`collection-${c.id}`} value={`collection:${c.id}`}>
                {c.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <div data-admin-variation-row-actions>
        <button type="submit" data-admin-btn-primary>
          + Add
        </button>
      </div>
    </form>
  );
}
