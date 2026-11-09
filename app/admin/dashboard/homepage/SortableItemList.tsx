'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RemoveItemButton from './RemoveItemButton';
import { formatPrice } from '@/lib/formatPrice';

// itemId is the encoded "product:<id>" / "collection:<id>" form used
// throughout this section's actions (see actions.ts) — one shared id
// format lets products and collections share a single draggable list.
export type SectionItem = {
  itemId: string;
  kind: 'product' | 'collection';
  name: string;
  price?: number;
  thumb?: string;
};

// Drag-to-reorder list mixing products and collections in one section.
// Kept as its own client component because dnd-kit needs the browser
// (drag events, pointer tracking) — the rest of the admin homepage page
// stays a server component fetching the initial list from Supabase.
function SortableRow({ item, removeAction }: { item: SectionItem; removeAction: (itemId: string) => Promise<void> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} data-admin-product-row data-dragging={isDragging ? 'true' : undefined}>
      {/* A dedicated handle (rather than the whole row) so tapping the
          row elsewhere — or scrolling the page past it on mobile —
          doesn't accidentally start a drag. */}
      <button type="button" data-admin-drag-handle aria-label={`Drag to reorder ${item.name}`} {...attributes} {...listeners}>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
          <circle cx="6" cy="5" r="1.5" fill="currentColor" />
          <circle cx="6" cy="10" r="1.5" fill="currentColor" />
          <circle cx="6" cy="15" r="1.5" fill="currentColor" />
          <circle cx="14" cy="5" r="1.5" fill="currentColor" />
          <circle cx="14" cy="10" r="1.5" fill="currentColor" />
          <circle cx="14" cy="15" r="1.5" fill="currentColor" />
        </svg>
      </button>
      <div data-admin-product-thumb>
        {item.thumb ? (
          <Image src={item.thumb} alt={item.name} width={64} height={64} />
        ) : (
          <div data-admin-order-item-noimage>No photo</div>
        )}
      </div>
      <div data-admin-product-info>
        <p data-admin-product-name>
          {item.name}
          {item.kind === 'collection' ? ' (Collection)' : ''}
        </p>
        {typeof item.price === 'number' && <p data-admin-product-meta>${formatPrice(item.price)}</p>}
      </div>
      <div data-admin-product-actions>
        <RemoveItemButton itemId={item.itemId} action={removeAction} />
      </div>
    </div>
  );
}

export default function SortableItemList({
  initialItems,
  reorderAction,
  removeAction,
}: {
  initialItems: SectionItem[];
  reorderAction: (orderedItemIds: string[]) => Promise<void>;
  removeAction: (itemId: string) => Promise<void>;
}) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  // PointerSensor covers mouse/trackpad; TouchSensor is separate so a
  // finger has to move a few pixels before a drag starts, which leaves
  // an ordinary tap (e.g. on the Remove button) and page-scrolling alone.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.itemId === active.id);
    const newIndex = items.findIndex((i) => i.itemId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    // Update immediately so the drag feels instant; the server call below
    // just persists it. If it fails, roll back and say so.
    setItems(reordered);
    setSaveError(null);

    startTransition(async () => {
      try {
        await reorderAction(reordered.map((i) => i.itemId));
      } catch (err) {
        setItems(items);
        setSaveError(err instanceof Error ? err.message : 'Could not save the new order — try again.');
      }
    });
  };

  if (items.length === 0) return null;

  return (
    <div>
      <p data-admin-form-hint style={{ marginTop: 0 }}>
        Drag the <span aria-hidden="true">⠿</span> handle to reorder — newest additions start at the top.
      </p>
      {saveError && <p data-admin-error>{saveError}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.itemId)} strategy={verticalListSortingStrategy}>
          <div data-admin-product-list aria-busy={isPending}>
            {items.map((item) => (
              <SortableRow key={item.itemId} item={item} removeAction={removeAction} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
