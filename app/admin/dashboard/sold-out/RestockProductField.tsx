'use client';

import RestockField from './RestockField';
import { restockProduct } from '../products/actions';

export default function RestockProductField({ productId }: { productId: string }) {
  return <RestockField onSave={(quantity) => restockProduct(productId, quantity)} />;
}
