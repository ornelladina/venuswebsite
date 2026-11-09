'use client';

import { useState } from 'react';

// Sits next to ShareButton wherever that appears (product page, collection
// hero) — a separate, always-available way to grab the link regardless of
// what ShareButton's native share sheet does. Exists specifically because
// ShareButton's image-file share (see its own comment) deliberately
// doesn't include the link — so this is how you get the link to paste
// into Instagram's own Link sticker afterward, or to send anywhere a
// native share sheet doesn't cover.
export default function CopyLinkButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard access can be blocked (older browsers, some in-app
      // browsers). Fall back to selecting the text via a prompt so it can
      // still be copied manually.
      window.prompt('Copy this link:', url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      data-copy-link-button
      data-icon-only={iconOnly || undefined}
      aria-label={iconOnly ? 'Copy link' : undefined}
      onClick={handleCopy}
    >
      <span className="icon-svg icon-link" aria-hidden="true" />
      {!iconOnly && (copied ? 'Copied!' : 'Copy Link')}
      {iconOnly && copied && <span data-copy-toast>Copied!</span>}
    </button>
  );
}
