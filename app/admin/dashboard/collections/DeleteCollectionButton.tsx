'use client';

import { deleteCollection } from './actions';

export default function DeleteCollectionButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteCollection.bind(null, id)}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          `Delete "${name}"? This removes its photos and un-links its products (the products themselves are kept). This can't be undone.`
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
