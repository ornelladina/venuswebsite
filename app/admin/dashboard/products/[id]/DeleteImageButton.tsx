'use client';

import { deleteProductImage } from '../actions';

export default function DeleteImageButton({
  imageId,
  productId,
}: {
  imageId: string;
  productId: string;
}) {
  return (
    <form
      action={deleteProductImage.bind(null, imageId, productId)}
      onSubmit={(e) => {
        if (!window.confirm('Remove this photo?')) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" data-admin-image-remove aria-label="Remove photo">
        ×
      </button>
    </form>
  );
}
