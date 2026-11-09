'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { reorderCollectionImages, deleteCollectionImage } from '../actions';

type CollectionImageRow = {
  id: string;
  image_url: string;
  display_order: number;
};

export default function CollectionImageManager({
  collectionId,
  images: initialImages,
}: {
  collectionId: string;
  images: CollectionImageRow[];
}) {
  const [images, setImages] = useState(initialImages);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const orderRef = useRef(initialImages.map((img) => img.id));

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, overIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === overIndex) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(overIndex, 0, moved);
      return next;
    });
    setDragIndex(overIndex);
  }

  async function handleDrop() {
    if (dragIndex === null) return;
    setDragIndex(null);
    const newOrder = images.map((img) => img.id);
    if (newOrder.join(',') === orderRef.current.join(',')) return;
    orderRef.current = newOrder;
    setSavingOrder(true);
    try {
      await reorderCollectionImages(collectionId, newOrder);
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleDelete(imageId: string) {
    if (!window.confirm('Remove this photo?')) return;
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    await deleteCollectionImage(imageId, collectionId);
  }

  return (
    <div>
      <div data-admin-image-grid>
        {images.map((img, index) => (
          <div
            key={img.id}
            data-admin-image-card
            data-dragging={dragIndex === index || undefined}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            onDragEnd={handleDrop}
          >
            <div data-admin-image-thumb-wrap>
              <Image src={img.image_url} alt="" width={120} height={120} style={{ objectFit: 'cover' }} />
            </div>
            <div data-admin-image-card-actions>
              <button
                type="button"
                data-admin-image-remove
                aria-label="Remove photo"
                onClick={() => handleDelete(img.id)}
                style={{ margin: '0 auto' }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <p data-admin-form-hint>
        Drag a photo to reorder — these show after the cover photo when someone swipes through the
        collection page.
        {savingOrder ? ' Saving order…' : ''}
      </p>
    </div>
  );
}
