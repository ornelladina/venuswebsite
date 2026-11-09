'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// Turns a stored "x% y%" string into {x, y} numbers (0-100), defaulting
// to dead center — same format/parsing already used for product photo
// focal points (see app/admin/dashboard/products/[id]/ImageManager.tsx).
function parsePosition(position: string | null | undefined): { x: number; y: number } {
  if (!position) return { x: 50, y: 50 };
  const match = position.match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
  if (!match) return { x: 50, y: 50 };
  return { x: Number(match[1]), y: Number(match[2]) };
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// The site scales the photo layer by (1 + 2 x zoom/100), about the focal
// point (transform-origin = the saved position). The preview uses the same
// math so what you see here is what the site shows — and because the zoom
// is anchored on the focal point, every part of the photo can be reached.
const zoomToScale = (zoom: number) => 1 + (2 * zoom) / 100;
const scaleToZoom = (scale: number) => ((scale - 1) / 2) * 100;

/**
 * Drag-the-photo editor:
 *   - Drag the photo to move it inside the frame (this sets the focal point).
 *   - Hold Ctrl (⌘ on Mac) and scroll, or pinch on a touch screen / trackpad,
 *     to zoom. Plain scrolling never changes the zoom, so the page scrolls
 *     normally when your mouse passes over the photo.
 *   - The slider and number box are still there for fine-tuning.
 * The saved values are exactly the same "x% y%" position and zoom number as
 * before, so nothing on the website or in the database changes.
 */
export default function FocalPointEditor({
  previewImageUrl,
  previewLabel,
  initialPosition,
  initialZoom,
  zoomRange,
  sharedAcrossGroup = true,
  frame = 'square',
  onSave,
}: {
  previewImageUrl: string;
  previewLabel?: string;
  initialPosition: string;
  /** Omit entirely to hide the zoom controls (used for category covers,
   *  which don't have a separate crop-zoom the way the hero does). */
  initialZoom?: number;
  /** [min, max] — hero desktop/mobile use different sensible ranges. */
  zoomRange?: [number, number];
  /** True (default) for the desktop hero, where one position/zoom is
   *  shared across all 3 photos — shows the "applies to all photos"
   *  hint. False for the mobile hero, where each of the 3 photos now
   *  has its own independent position/zoom. */
  sharedAcrossGroup?: boolean;
  /** Shape of the preview frame so it matches the real hero: 'wide' for
   *  desktop, 'tall' for mobile, 'square' (default) for everything else. */
  frame?: 'square' | 'wide' | 'tall' | 'banner';
  onSave: (position: string, zoom?: number) => Promise<void>;
}) {
  const initial = parsePosition(initialPosition);
  const zoomEnabled = initialZoom !== undefined && !!zoomRange;
  const zoomMax = zoomRange ? zoomRange[1] : 0;

  const [pos, setPos] = useState(initial);
  const [zoom, setZoom] = useState(initialZoom ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  // Latest values for the event handlers (so the wheel listener, which is
  // attached once, never reads stale state).
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const posRef = useRef(pos);
  posRef.current = pos;

  // Active pointers (1 = pan, 2 = pinch).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panStart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  // Size of the photo once it is fitted to cover the frame (object-fit:
  // cover), before zoom.
  function coverSize(rect: DOMRect) {
    if (!natural) return { w: rect.width, h: rect.height };
    const k = Math.max(rect.width / natural.w, rect.height / natural.h);
    return { w: natural.w * k, h: natural.h * k };
  }

  function beginPan(clientX: number, clientY: number) {
    panStart.current = { px: clientX, py: clientY, x: posRef.current.x, y: posRef.current.y };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setDragging(true);
    setTouched(true);

    if (pointers.current.size === 1) {
      beginPan(e.clientX, e.clientY);
    } else if (pointers.current.size === 2 && zoomEnabled) {
      const [a, b] = Array.from(pointers.current.values());
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: zoomRef.current };
      panStart.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const box = previewRef.current;
    if (!box) return;

    // Two fingers: pinch to zoom.
    if (pointers.current.size === 2 && pinchStart.current && zoomEnabled) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const ratio = dist / pinchStart.current.dist;
      const nextScale = zoomToScale(pinchStart.current.zoom) * ratio;
      setZoom(clamp(scaleToZoom(nextScale), 0, zoomMax));
      return;
    }

    // One pointer: drag the photo. The photo follows the finger/cursor, so
    // dragging right reveals more of the left side (position % goes down).
    if (pointers.current.size === 1 && panStart.current) {
      const rect = box.getBoundingClientRect();
      const cover = coverSize(rect);
      const s = zoomEnabled ? zoomToScale(zoomRef.current) : 1;
      // Because the zoom is anchored on the focal point, the photo moves
      // (s x photo size - frame size) pixels across the full 0-100% range.
      const rangeX = s * cover.w - rect.width;
      const rangeY = s * cover.h - rect.height;
      const dx = e.clientX - panStart.current.px;
      const dy = e.clientY - panStart.current.py;
      const nx = rangeX > 0.5 ? panStart.current.x - (dx / rangeX) * 100 : panStart.current.x;
      const ny = rangeY > 0.5 ? panStart.current.y - (dy / rangeY) * 100 : panStart.current.y;
      setPos({ x: Math.round(clamp(nx, 0, 100)), y: Math.round(clamp(ny, 0, 100)) });
    }
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    pinchStart.current = null;
    if (pointers.current.size === 1) {
      // Went from two fingers back to one: carry on panning from here
      // instead of jumping.
      const [p] = Array.from(pointers.current.values());
      beginPan(p.x, p.y);
    } else if (pointers.current.size === 0) {
      panStart.current = null;
      setDragging(false);
    }
  }

  // Ctrl/⌘ + scroll (and trackpad pinch, which browsers report as
  // Ctrl + scroll) zooms. Plain scrolling is left alone on purpose so a
  // stray mouse-over never changes your zoom. Attached manually (not via
  // React's onWheel) because it has to be non-passive to stop the browser
  // page-zoom while you zoom the photo.
  useEffect(() => {
    const box = previewRef.current;
    if (!box || !zoomEnabled) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setTouched(true);
      const nextScale = zoomToScale(zoomRef.current) * Math.exp(-e.deltaY * 0.002);
      setZoom(clamp(scaleToZoom(nextScale), 0, zoomMax));
    }
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [zoomEnabled, zoomMax]);

  function handleReset() {
    setPos({ x: 50, y: 50 });
    if (zoomEnabled) setZoom(initialZoom ?? 0);
    setTouched(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await onSave(`${pos.x}% ${pos.y}%`, zoomEnabled ? Math.round(zoom * 10) / 10 : undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-admin-photo-editor>
      <div data-admin-photo-editor-body>
        <div
          ref={previewRef}
          data-admin-photo-editor-preview
          data-frame={frame}
          data-dragging={dragging ? 'true' : 'false'}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onDragStart={(e) => e.preventDefault()}
        >
          <Image
            src={previewImageUrl}
            alt={previewLabel || ''}
            fill
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setNatural({ w: img.naturalWidth, h: img.naturalHeight });
              }
            }}
            style={{
              objectFit: 'cover',
              objectPosition: `${pos.x}% ${pos.y}%`,
              transform: zoomEnabled ? `scale(${zoomToScale(zoom)})` : undefined,
              transformOrigin: `${pos.x}% ${pos.y}%`,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
          <div data-admin-photo-editor-badge data-hidden={touched ? 'true' : 'false'}>
            {zoomEnabled ? 'Drag to move · Ctrl/⌘ + scroll or pinch to zoom' : 'Drag to move'}
          </div>
        </div>

        <div data-admin-photo-editor-controls>
          <p data-admin-form-hint>
            Drag the photo to choose which part stays visible when it&rsquo;s cropped to fit the
            frame.
            {zoomEnabled ? ' Hold Ctrl (⌘ on Mac) and scroll, or pinch, to zoom — or use the slider.' : ''}
            {previewLabel ? ` Shown on ${previewLabel} — ` : ' '}
            {zoomEnabled && sharedAcrossGroup
              ? 'this same position and zoom apply to all photos in this group.'
              : ''}
            {zoomEnabled && !sharedAcrossGroup
              ? 'position and zoom here apply only to this photo.'
              : ''}
          </p>

          {zoomEnabled && zoomRange && (
            <label data-admin-field>
              <span>Zoom ({Math.round(zoom * 10) / 10}%)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="range"
                  min={0}
                  max={zoomRange[1]}
                  step={0.5}
                  value={Math.min(zoom, zoomRange[1])}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                {/* Free-typed value alongside the slider — a slider alone
                    tops out at zoomRange[1], but some photos need to go
                    further than that to stop cropping weird, so this lets
                    zoom go as high as needed regardless of the slider's
                    max. */}
                <input
                  type="number"
                  min={0}
                  value={Math.round(zoom * 10) / 10}
                  onChange={(e) => setZoom(Number(e.target.value) || 0)}
                  style={{ width: 64 }}
                />
              </div>
            </label>
          )}

          <div data-admin-form-actions style={{ display: 'flex', gap: 10 }}>
            <button type="button" data-admin-btn-primary onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
            </button>
            <button type="button" data-admin-btn-secondary onClick={handleReset} disabled={saving}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
