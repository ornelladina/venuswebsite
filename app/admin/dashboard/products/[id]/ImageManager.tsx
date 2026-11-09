'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { reorderProductImages, updateProductImage, deleteProductImage, rotateProductImage } from '../actions';

type ProductImageRow = {
  id: string;
  image_url: string;
  display_order: number;
  focal_point: string | null;
  zoom: number | null;
  object_fit: 'contain' | 'cover' | null;
  label: string | null;
  color_tag: string | null;
};

// Turns a stored "x% y%" focal_point string into {x, y} numbers (0-100),
// defaulting to dead center when there isn't one saved yet.
function parseFocalPoint(focalPoint: string | null): { x: number; y: number } {
  if (!focalPoint) return { x: 50, y: 50 };
  const match = focalPoint.match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
  if (!match) return { x: 50, y: 50 };
  return { x: Number(match[1]), y: Number(match[2]) };
}

export default function ImageManager({
  productId,
  images: initialImages,
}: {
  productId: string;
  images: ProductImageRow[];
}) {
  const [images, setImages] = useState(initialImages);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
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
      await reorderProductImages(productId, newOrder);
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleDelete(imageId: string) {
    if (!window.confirm('Remove this photo?')) return;
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    await deleteProductImage(imageId, productId);
  }

  // Click again to keep turning it — 90° each time, so 2 clicks flips it
  // upside down and 4 clicks is back to where it started.
  async function handleRotate(imageId: string) {
    setRotatingId(imageId);
    try {
      const { image_url } = await rotateProductImage(imageId, productId);
      setImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, image_url } : img)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not rotate the photo — try again.');
    } finally {
      setRotatingId(null);
    }
  }

  const editingImage = images.find((img) => img.id === editingId) ?? null;

  return (
    <div>
      <div data-admin-image-grid>
        {images.map((img, index) => {
          const focal = parseFocalPoint(img.focal_point);
          return (
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
              {index === 0 && <span data-admin-image-main-badge>Main</span>}
              <div data-admin-image-thumb-wrap>
                <Image
                  src={img.image_url}
                  alt={img.label || ''}
                  width={120}
                  height={120}
                  style={{
                    objectFit: img.object_fit || 'contain',
                    objectPosition: `${focal.x}% ${focal.y}%`,
                    transform: `scale(${img.zoom || 1})`,
                  }}
                />
              </div>
              <div data-admin-image-card-actions>
                <button
                  type="button"
                  data-admin-image-rotate
                  aria-label="Rotate photo 90°"
                  onClick={() => handleRotate(img.id)}
                  disabled={rotatingId === img.id}
                >
                  {rotatingId === img.id ? '…' : '↻'}
                </button>
                <button
                  type="button"
                  data-admin-image-adjust
                  onClick={() => setEditingId(img.id)}
                >
                  Adjust
                </button>
                <button
                  type="button"
                  data-admin-image-remove
                  aria-label="Remove photo"
                  onClick={() => handleDelete(img.id)}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p data-admin-form-hint>
        Drag a photo to reorder — the first one is the main image shown on product cards. Use ↻
        to rotate a sideways or upside-down photo 90° at a time.
        {savingOrder ? ' Saving order…' : ''}
      </p>

      {editingImage && (
        <PhotoEditor
          key={editingImage.id}
          image={editingImage}
          productId={productId}
          onClose={() => setEditingId(null)}
          onSaved={(updated) => {
            setImages((prev) => prev.map((img) => (img.id === updated.id ? { ...img, ...updated } : img)));
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

function PhotoEditor({
  image,
  productId,
  onClose,
  onSaved,
}: {
  image: ProductImageRow;
  productId: string;
  onClose: () => void;
  onSaved: (updated: ProductImageRow) => void;
}) {
  const initialFocal = parseFocalPoint(image.focal_point);
  const [focal, setFocal] = useState(initialFocal);
  const [zoom, setZoom] = useState(image.zoom || 1);
  const [objectFit, setObjectFit] = useState<'contain' | 'cover'>(image.object_fit || 'contain');
  const [label, setLabel] = useState(image.label || '');
  const [colorTag, setColorTag] = useState(image.color_tag || '');
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const draggingReticle = useRef(false);

  function updateFocalFromEvent(e: { clientX: number; clientY: number }) {
    const box = previewRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setFocal({ x: Math.round(x), y: Math.round(y) });
  }

  async function handleSave() {
    setSaving(true);
    const formData = new FormData();
    formData.set('focal_x', String(focal.x));
    formData.set('focal_y', String(focal.y));
    formData.set('zoom', String(zoom));
    formData.set('object_fit', objectFit);
    formData.set('label', label);
    formData.set('color_tag', colorTag);
    try {
      await updateProductImage(image.id, productId, formData);
      onSaved({
        ...image,
        focal_point: `${focal.x}% ${focal.y}%`,
        zoom,
        object_fit: objectFit,
        label: label || null,
        color_tag: colorTag || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-admin-photo-editor>
      <div data-admin-photo-editor-header>
        <h3>Adjust photo</h3>
        <button type="button" data-admin-btn-secondary onClick={onClose}>
          Close
        </button>
      </div>

      <div data-admin-photo-editor-body>
        <div
          ref={previewRef}
          data-admin-photo-editor-preview
          onClick={updateFocalFromEvent}
          onMouseDown={() => {
            draggingReticle.current = true;
          }}
          onMouseUp={() => {
            draggingReticle.current = false;
          }}
          onMouseLeave={() => {
            draggingReticle.current = false;
          }}
          onMouseMove={(e) => {
            if (draggingReticle.current) updateFocalFromEvent(e);
          }}
        >
          <Image
            src={image.image_url}
            alt=""
            fill
            style={{
              objectFit,
              objectPosition: `${focal.x}% ${focal.y}%`,
              transform: `scale(${zoom})`,
            }}
          />
          <div
            data-admin-photo-editor-reticle
            style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
          />
        </div>

        <div data-admin-photo-editor-controls>
          <p data-admin-form-hint>
            Click or drag inside the photo to choose the focal point — the part of the photo that
            stays visible when it&rsquo;s cropped to fit a frame.
          </p>

          <label data-admin-field>
            <span>Crop mode</span>
            <select value={objectFit} onChange={(e) => setObjectFit(e.target.value as 'contain' | 'cover')}>
              <option value="contain">Fit whole photo (may show empty space)</option>
              <option value="cover">Fill the frame (crops to the focal point)</option>
            </select>
          </label>

          <label data-admin-field>
            <span>Zoom ({zoom.toFixed(2)}x)</span>
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>

          <label data-admin-field>
            <span>Label (used as alt text)</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. gold hamsa bangle, side view"
            />
          </label>

          <label data-admin-field>
            <span>Link to variation value</span>
            <input
              type="text"
              value={colorTag}
              onChange={(e) => setColorTag(e.target.value)}
              placeholder="e.g. Gold — must match a variation value exactly"
            />
            <p data-admin-form-hint>
              Optional. Type the exact variation value this photo shows (e.g. type
              &ldquo;Gold&rdquo; here if this is the gold photo, matching the &ldquo;Gold&rdquo;
              option below). When a customer taps that option on the product page, the gallery
              will jump to this photo. Leave blank if this photo isn&rsquo;t tied to a specific
              option.
            </p>
          </label>

          <div data-admin-form-actions>
            <button type="button" data-admin-btn-primary onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" data-admin-btn-secondary onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
