'use client';

export default function RemoveAllButton({
  sectionName,
  count,
  action,
}: {
  sectionName: string;
  count: number;
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          `Remove all ${count} product${count === 1 ? '' : 's'} from ${sectionName}? They'll stay in your catalog — this only takes them out of this section.`
        );
        if (!confirmed) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" data-admin-btn-danger disabled={count === 0}>
        Remove All
      </button>
    </form>
  );
}
