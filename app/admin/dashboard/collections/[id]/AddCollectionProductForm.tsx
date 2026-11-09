'use client';

import { useState } from 'react';
import { addCollectionProduct } from '../actions';

type ProductOption = { id: string; name: string };

export default function AddCollectionProductForm({
  collectionId,
  options,
}: {
  collectionId: string;
  options: ProductOption[];
}) {
  const [filter, setFilter] = useState('');

  const filtered = filter.trim()
    ? options.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : options;

  if (options.length === 0) {
    return (
      <p data-admin-form-hint>
        Every active product is already in this collection — add another product first if you
        want more options here.
      </p>
    );
  }

  return (
    <form
      action={addCollectionProduct.bind(null, collectionId)}
      data-admin-variation-row
      data-admin-variation-row-new
    >
      <input
        type="text"
        placeholder="Filter products…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ maxWidth: 180 }}
      />
      <select name="product_id" required defaultValue="">
        <option value="" disabled>
          Choose a product…
        </option>
        {filtered.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div data-admin-variation-row-actions>
        <button type="submit" data-admin-btn-primary>
          + Add to Look
        </button>
      </div>
    </form>
  );
}
