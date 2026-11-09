import { STYLES } from '@/lib/styles';
import { Collection } from '@/types';

type Category = { id: string; name: string };

// Shared by the "new collection" and "edit collection" forms, same pattern
// as products/ProductFormFields.tsx.
export default function CollectionFormFields({
  collection,
  categories,
}: {
  collection?: Collection;
  categories: Category[];
}) {
  return (
    <>
      <label data-admin-field>
        <span>Name *</span>
        <input type="text" name="name" required defaultValue={collection?.name ?? ''} />
      </label>

      <label data-admin-field>
        <span>URL Slug</span>
        <input
          type="text"
          name="slug"
          placeholder="leave blank to generate from the name"
          defaultValue={collection?.slug ?? ''}
        />
      </label>

      <div data-admin-field-row>
        <label data-admin-field>
          <span>Category</span>
          <select name="category_id" defaultValue={collection?.category_id ?? ''}>
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label data-admin-field>
          <span>Style</span>
          <select name="style" defaultValue={collection?.style ?? ''}>
            <option value="">— None —</option>
            {STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.tabLabel}
              </option>
            ))}
          </select>
        </label>
        <label data-admin-field>
          <span>Display Order</span>
          <input
            type="number"
            name="display_order"
            step="1"
            defaultValue={collection?.display_order ?? 0}
          />
        </label>
      </div>

      <p data-admin-form-hint>
        Setting BOTH Category and Style also shows this collection&rsquo;s card mixed in with
        regular products on that category page, in addition to its normal spot on Shop The Look.
        Leave either blank to keep it off category pages.
      </p>

      <fieldset data-admin-checkbox-grid>
        <legend>Where this collection shows up</legend>
        <label data-admin-checkbox>
          <input type="checkbox" name="is_active" defaultChecked={collection?.is_active ?? true} />
          Active (visible on the site)
        </label>
        <label data-admin-checkbox>
          <input
            type="checkbox"
            name="show_on_homepage"
            defaultChecked={collection?.show_on_homepage ?? false}
          />
          Also show in the homepage Shop The Look strip
        </label>
        <label data-admin-checkbox>
          <input type="checkbox" name="is_featured" defaultChecked={collection?.is_featured ?? false} />
          Featured (homepage)
        </label>
        <label data-admin-checkbox>
          <input
            type="checkbox"
            name="is_best_seller"
            defaultChecked={collection?.is_best_seller ?? false}
          />
          Best Sellers
        </label>
        <label data-admin-checkbox>
          <input type="checkbox" name="is_hamsa_eye" defaultChecked={collection?.is_hamsa_eye ?? false} />
          Themes → Hamsa &amp; Eye
        </label>
        <label data-admin-checkbox data-admin-checkbox-nested>
          <input
            type="checkbox"
            name="is_hamsa_eye_home"
            defaultChecked={collection?.is_hamsa_eye_home ?? false}
          />
          Also show in the homepage Hamsa &amp; Eye strip
        </label>
      </fieldset>
    </>
  );
}
