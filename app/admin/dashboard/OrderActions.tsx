'use client';

import { markOrderCompleted, restoreOrder, deleteOrder } from './actions';

// Small inline icons so the dots don't depend on an icon-font/library
// being installed — each is just a tiny standalone SVG.
function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M5 10.5L8.2 13.7L15 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M5.5 5.5V9H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.7 12.3A5.5 5.5 0 1 0 6.6 6.6L5.5 7.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M6 6L14 14M14 6L6 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

export default function OrderActions({
  orderId,
  isCompleted,
  whatsappHref,
}: {
  orderId: string;
  isCompleted: boolean;
  whatsappHref?: string | null;
}) {
  return (
    <div data-admin-order-actions>
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          data-admin-order-whatsapp
          title="Opens WhatsApp with the confirmation message ready to send"
        >
          <WhatsAppIcon />
          <span>Message customer</span>
        </a>
      )}
      {isCompleted ? (
        <form action={restoreOrder.bind(null, orderId)}>
          <button type="submit" data-admin-order-icon-btn data-variant="restore" title="Move back to active" aria-label="Move back to active">
            <UndoIcon />
          </button>
        </form>
      ) : (
        <form action={markOrderCompleted.bind(null, orderId)}>
          <button type="submit" data-admin-order-icon-btn data-variant="complete" title="Mark completed" aria-label="Mark completed">
            <CheckIcon />
          </button>
        </form>
      )}
      <form
        action={deleteOrder.bind(null, orderId)}
        onSubmit={(e) => {
          if (!window.confirm('Remove this order permanently? This can\u2019t be undone.')) {
            e.preventDefault();
          }
        }}
      >
        <button type="submit" data-admin-order-icon-btn data-variant="remove" title="Remove order" aria-label="Remove order">
          <XIcon />
        </button>
      </form>
    </div>
  );
}
