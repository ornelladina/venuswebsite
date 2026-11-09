'use client';

import { useState } from 'react';

// Used on both the product page and the collection hero — anything with a
// title + a photo to share.
//
// Two different things happen depending on whether the browser/OS can
// share an actual image FILE (not just a link) — checked via
// navigator.canShare({ files }), supported on modern iOS Safari + Chrome
// Android:
//
//  - Can share files: we fetch the photo, share it as a file with no URL
//    attached. This is what makes "share to Instagram Story with the
//    photo actually there" work — when the shared content is an image,
//    Instagram's share extension opens straight into the Story composer
//    with that photo as the background, the same as sharing a photo from
//    the Photos app. Deliberately NOT sending the link alongside the
//    file: some apps only pick up one or the other when both are present
//    in the same share, and the photo is the part that doesn't have a
//    fallback (the link does — see CopyLinkButton, meant to be used
//    right alongside this for exactly that reason: copy the link
//    separately, then paste it into Instagram's own Link sticker once
//    inside the Story composer).
//  - Can't share files (older/unsupported browsers, or the photo fetch
//    below fails — e.g. blocked by CORS): falls back to sharing the
//    title + link the normal way.
//
// Desktop browsers mostly don't implement navigator.share AT ALL, so
// there it falls back further, to copying the link — same as
// CopyLinkButton's own fallback.
export default function ShareButton({
  title,
  imageUrl,
  iconOnly = false,
}: {
  title: string;
  /** Absolute URL of the photo to try to share as an actual file. */
  imageUrl?: string;
  /** Icon-only, no visible label — used over a photo (collection hero)
   *  where a text button would crowd the image. Still has an aria-label. */
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function getShareableImageFile(): Promise<File | null> {
    if (!imageUrl || typeof navigator === 'undefined' || !navigator.canShare) return null;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1]?.split('+')[0] || 'jpg';
      const file = new File([blob], `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${ext}`, {
        type: blob.type,
      });
      return navigator.canShare({ files: [file] }) ? file : null;
    } catch {
      // Fetch/CORS failure, unsupported image type, etc. — just fall back
      // to a link share below rather than surfacing an error for what's
      // ultimately a nice-to-have.
      return null;
    }
  }

  const handleShare = async () => {
    // Read straight off the current page rather than rebuilding it from
    // a slug + some hardcoded domain — always exactly right whichever
    // domain (production, a preview deploy, etc.) it's viewed from.
    const url = window.location.href;

    if (typeof navigator !== 'undefined' && navigator.share) {
      const file = await getShareableImageFile();
      try {
        if (file) {
          await navigator.share({ title, files: [file] });
        } else {
          await navigator.share({ title, url });
        }
      } catch {
        // Thrown when someone just closes the share sheet without picking
        // anything (AbortError) — not an actual failure, nothing to show.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link:', url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      data-share-button
      data-icon-only={iconOnly || undefined}
      aria-label={iconOnly ? 'Share' : undefined}
      onClick={handleShare}
    >
      <span className="icon-svg icon-share" aria-hidden="true" />
      {!iconOnly && (copied ? 'Link Copied!' : 'Share')}
      {iconOnly && copied && <span data-copy-toast>Link Copied!</span>}
    </button>
  );
}
