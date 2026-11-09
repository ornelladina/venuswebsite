import StockSection from './StockSection';
import { Product } from '@/types';

type Category = { id: string; name: string };

// Shared by the "new product" and "edit product" forms so their fields
// can never drift out of sync with each other. Plain server-rendered
// markup — no interactivity needed here, the form itself is submitted to
// a Server Action (createProduct / updateProduct) in actions.ts.
export default function ProductFormFields({
  product,
  categories,
  hasVariations = false,
}: {
  product?: Product;
  categories: Category[];
  // True when the product already has variation rows (edit page), so the
  // "has variations" box starts ticked.
  hasVariations?: boolean;
}) {
  return (
    <>
      <label data-admin-field>
        <span>Name *</span>
        <input type="text" name="name" required defaultValue={product?.name ?? ''} />
      </label>

      <label data-admin-field>
        <span>URL Slug</span>
        <input
          type="text"
          name="slug"
          placeholder="leave blank to generate from the name"
          defaultValue={product?.slug ?? ''}
        />
      </label>

      <label data-admin-field>
        <span>Description</span>
        <textarea name="description" rows={4} defaultValue={product?.description ?? ''} />
      </label>

      <div data-admin-field-row>
        <label data-admin-field>
          <span>SKU</span>
          <input type="text" name="sku" defaultValue={product?.sku ?? ''} />
        </label>
        <label data-admin-field>
          <span>Category *</span>
          <select name="category_id" required defaultValue={product?.category_id ?? ''}>
            <option value="" disabled>
              Choose a category&hellip;
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div data-admin-field-row>
        <label data-admin-field>
          <span>Price *</span>
          <input
            type="number"
            name="price"
            step="0.01"
            min="0"
            required
            defaultValue={product?.price ?? ''}
          />
        </label>
        <label data-admin-field>
          <span>Sale Price</span>
          <input
            type="number"
            name="sale_price"
            step="0.01"
            min="0"
            defaultValue={product?.sale_price ?? ''}
          />
        </label>
        <label data-admin-field>
          <span>&ldquo;Was&rdquo; Price</span>
          <input
            type="number"
            name="original_price"
            step="0.01"
            min="0"
            defaultValue={product?.original_price ?? ''}
          />
        </label>
      </div>

      <StockSection
        initialHasVariations={hasVariations}
        initialStock={product?.stock_quantity}
        initialStyle={product?.style}
        initialDisplayOrder={product?.display_order}
      />

      <fieldset data-admin-checkbox-grid>
        <legend>Where this product shows up</legend>
        <label data-admin-checkbox>
          <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} />
          Active (visible on the site)
        </label>
        <label data-admin-checkbox>
          <input type="checkbox" name="is_new" defaultChecked={product?.is_new ?? false} />
          New Arrivals
        </label>
        <label data-admin-checkbox>
          <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} />
          Featured (homepage)
        </label>
        <label data-admin-checkbox>
          <input
            type="checkbox"
            name="is_best_seller"
            defaultChecked={product?.is_best_seller ?? false}
          />
          Best Sellers
        </label>
        <label data-admin-checkbox>
          <input type="checkbox" name="is_set" defaultChecked={product?.is_set ?? false} />
          Sets collection
        </label>
        <label data-admin-checkbox>
          <input type="checkbox" name="is_hamsa_eye" defaultChecked={product?.is_hamsa_eye ?? false} />
          Themes → Hamsa &amp; Eye
        </label>
        <label data-admin-checkbox data-admin-checkbox-nested>
          <input
            type="checkbox"
            name="is_hamsa_eye_home"
            defaultChecked={product?.is_hamsa_eye_home ?? false}
          />
          Also show in the homepage Hamsa &amp; Eye strip
        </label>
        <label data-admin-checkbox>
          <input type="checkbox" name="is_classical" defaultChecked={product?.is_classical ?? false} />
          Themes → Classical
        </label>
      </fieldset>
    </>
  );
}
