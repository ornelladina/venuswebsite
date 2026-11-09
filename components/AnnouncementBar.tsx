import Link from 'next/link';

// Slim strip above the header (same idea as the "Free shipping above..."
// bar on the reference site). The three messages fade into each other on
// a pure-CSS loop — see "Announcement bar" in globals.css — so there is
// no JavaScript or state here.
//
// TO CHANGE THE TEXT: edit the four lines below. Keep exactly 4 messages
// (the fade timing in globals.css is built around 4). Add `href` to make
// a message clickable.
const MESSAGES: { text: string; href?: string }[] = [
  { text: 'Free delivery on orders $75+', href: '/shop' },
  { text: 'Cash on delivery across Lebanon' },
  { text: 'Hypoallergenic gold-plated jewelry' },
  { text: 'Shop the new arrivals', href: '/new' },
];

export default function AnnouncementBar() {
  return (
    <div className="announcement-bar" role="region" aria-label="Announcements">
      <div className="announcement-stack">
        {MESSAGES.map((m, i) => (
          <span className={`announcement-msg announcement-msg-${i + 1}`} key={m.text}>
            {m.href ? <Link href={m.href}>{m.text}</Link> : m.text}
          </span>
        ))}
      </div>
    </div>
  );
}
