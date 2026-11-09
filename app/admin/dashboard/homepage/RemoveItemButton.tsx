'use client';

// itemId is the encoded "product:<id>" / "collection:<id>" form — see
// AddItemForm.tsx and actions.ts.
export default function RemoveItemButton({
  itemId,
  action,
}: {
  itemId: string;
  action: (itemId: string) => Promise<void>;
}) {
  return (
    <form action={action.bind(null, itemId)}>
      <button type="submit" data-admin-btn-danger>
        Remove
      </button>
    </form>
  );
}
