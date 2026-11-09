'use client';

import RestockField from './RestockField';
import { restockVariation } from '../products/actions';

export default function RestockVariationField({
  variationId,
  productId,
}: {
  variationId: string;
  productId: string;
}) {
  return <RestockField onSave={(quantity) => restockVariation(variationId, productId, quantity)} />;
}
