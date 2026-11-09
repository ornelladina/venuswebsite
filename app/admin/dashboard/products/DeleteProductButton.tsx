'use client';

import { deleteProduct } from './actions';

export default function DeleteProductButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteProduct.bind(null, id)}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          `Delete "${name}"? This also removes its photos and variations. This can't be undone.`
        );
        if (!confirmed) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" data-admin-btn-danger>
        Delete
      </button>
    </form>
  );
}
