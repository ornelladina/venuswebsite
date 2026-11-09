'use client';

import { useState } from 'react';

export default function CopyLinkButton({ url }: { url: string }) {
  // Briefly shows "Copied!" so it's obvious the tap worked, since there's
  // no other visible change on the page when something lands on the
  // clipboard.
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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
    <button type="button" onClick={handleCopy} data-admin-btn-secondary>
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}
