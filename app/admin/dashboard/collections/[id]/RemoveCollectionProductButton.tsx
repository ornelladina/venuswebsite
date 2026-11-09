'use client';

import { removeCollectionProduct } from '../actions';

export default function RemoveCollectionProductButton({
  rowId,
  collectionId,
}: {
  rowId: string;
  collectionId: string;
}) {
  return (
    <form action={removeCollectionProduct.bind(null, rowId, collectionId)}>
      <button type="submit" data-admin-btn-danger>
        Remove
      </button>
    </form>
  );
}
