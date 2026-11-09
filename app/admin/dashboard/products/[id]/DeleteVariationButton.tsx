'use client';

import { deleteVariation } from '../actions';

export default function DeleteVariationButton({
  variationId,
  productId,
}: {
  variationId: string;
  productId: string;
}) {
  return (
    <form
      action={deleteVariation.bind(null, variationId, productId)}
      onSubmit={(e) => {
        if (!window.confirm('Remove this variation?')) {
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
