'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './CartContext';
import { useFavorites } from './FavoritesContext';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { SHOW_ACCOUNT } from '@/lib/featureFlags';

// "Shop" dropdown holds every way into the catalog: the All Products page,
// Type (what the piece is), Material (what it's made of), and Themes
// (curated groupings like Hamsa & Eye) — one menu instead of the old mix of
// separate top-level links.
const ALL_PRODUCTS_LINK = { label: 'All Products', href: '/shop' };

const TYPE_LINKS = [
  { label: 'Necklaces', href: '/category/necklaces' },
  { label: 'Bracelets', href: '/category/bracelets' },
  { label: 'Rings', href: '/category/rings' },
  // Note: "Anklets" needs to exist as a category row in Supabase (categories
  // table) if it doesn't already.
  { label: 'Anklets', href: '/category/anklets' },
  { label: 'Earrings', href: '/category/earrings' },
  { label: 'Sets', href: '/category/sets' },
];

const MATERIAL_LINKS = [
  { label: 'Gold-Plated', href: '/style/gold-plated' },
  { label: 'Stainless Steel', href: '/style/stainless-steel' },
  { label: 'Vintage Accessories', href: '/style/vintage' },
  // Page/material itself is "Silver-Plated" (see lib/styles.ts) — kept
  // as "Charm Bracelets" here specifically, since that's the term
  // customers actually browse/search by; the page it links to is themed
  // around silver-plated, Pandora-style charm bracelets.
  { label: 'Charm Bracelets', href: '/style/silver-plated' },
];

const THEME_LINKS = [
  { label: 'Hamsa & Eye', href: '/hamsa-eye' },
  { label: 'Classical', href: '/classical' },
];

// Everything the "Shop" trigger's own active/highlight state should react
// to — i.e. every page reachable from inside its dropdown.
const SHOP_LINKS = [ALL_PRODUCTS_LINK, ...TYPE_LINKS, ...MATERIAL_LINKS, ...THEME_LINKS];

const NEW_ARRIVALS_LINK = { label: 'New Arrivals', href: '/new' };
const ABOUT_LINK = { label: 'About', href: '/about' };

// Shown inside the desktop search modal under "Popular Searches" — a mix of
// the real category and style links above so they always point somewhere
// with actual products, instead of hardcoded generic terms.
const POPULAR_SEARCHES = [
  { label: 'Necklaces', href: '/category/necklaces' },
  { label: 'Earrings', href: '/category/earrings' },
  { label: 'Bracelets', href: '/category/bracelets' },
  { label: 'Rings', href: '/category/rings' },
  { label: 'Sets', href: '/category/sets' },
  { label: 'Gold-Plated', href: '/style/gold-plated' },
];

export default function Header() {
  const isAdmin = useIsAdmin();
  const { itemCount } = useCart();
  const { favoriteIds } = useFavorites();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  // Desktop "Shop" dropdown itself (the top-level one, not the nested
  // Material/Themes accordions below): click-toggled off the caret instead
  // of pure CSS :hover, so pressing the arrow again closes it — see the
  // click handler on .nav-item-trigger below for why hover alone couldn't
  // support that.
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  // Which of the Material/Themes accordion columns inside the Shop
  // dropdown is open. Hover-driven (with a short intent delay via the
  // timers below), with click kept as a fallback for touch/keyboard.
  const [shopColumnOpen, setShopColumnOpen] = useState<'material' | 'themes' | null>(null);
  // Hover-intent timers for the Material/Themes columns: a short delay
  // before opening (so a quick mouse glide across the row toward the other
  // column doesn't pop both open along the way) and a short delay before
  // closing (so moving from the heading down into its just-opened list
  // doesn't slam it shut). Click still works too (see the onClick handlers
  // below) as a touch/keyboard-friendly fallback.
  const columnOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const columnCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearColumnTimers = () => {
    if (columnOpenTimer.current) clearTimeout(columnOpenTimer.current);
    if (columnCloseTimer.current) clearTimeout(columnCloseTimer.current);
  };
  const openColumnOnHover = (column: 'material' | 'themes') => {
    clearColumnTimers();
    columnOpenTimer.current = setTimeout(() => setShopColumnOpen(column), 90);
  };
  const closeColumnOnHover = () => {
    clearColumnTimers();
    columnCloseTimer.current = setTimeout(() => setShopColumnOpen(null), 150);
  };
  // Grace period before the whole "Shop" dropdown itself closes on mouse-out
  // (separate from the per-column timers above). This is what actually
  // fixes "hover Shop, hover a column heading, move down toward its list,
  // and the whole menu vanishes": that list opens after its own 90ms
  // delay above, so a mouse moving straight down toward it arrives BEFORE
  // the list has expanded — at that instant the cursor is briefly below
  // the still-collapsed column, outside every hoverable box in the menu,
  // which used to fire the close (setShopMenuOpen(false)) on .nav-item's
  // onMouseLeave instantly. Now that close is itself delayed by this timer,
  // so that momentary gap doesn't matter: the cursor lands back inside the
  // menu (on the now-expanded list) well within the delay window, which
  // re-fires onMouseEnter and cancels this timer before it ever runs.
  const shopMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearShopMenuCloseTimer = () => {
    if (shopMenuCloseTimer.current) clearTimeout(shopMenuCloseTimer.current);
  };
  const openShopMenuOnHover = () => {
    clearShopMenuCloseTimer();
    setShopMenuOpen(true);
  };
  const closeShopMenuOnHover = () => {
    clearShopMenuCloseTimer();
    shopMenuCloseTimer.current = setTimeout(() => {
      clearColumnTimers();
      setShopColumnOpen(null);
      setShopMenuOpen(false);
    }, 220);
  };
  // Clicking any link inside the Shop dropdown navigates away, but since
  // this Header persists across client-side navigation, the dropdown's
  // own open state doesn't reset on its own — it would otherwise still be
  // sitting open over whatever page the click just landed on.
  const closeShopMenu = () => {
    clearShopMenuCloseTimer();
    clearColumnTimers();
    setShopColumnOpen(null);
    setShopMenuOpen(false);
  };
  // The Shop submenu's own Type/Material/Themes facets are each their own
  // nested accordion on mobile (rather than side-by-side columns, which
  // don't have room to breathe at mobile widths) — tracked separately so
  // opening one doesn't affect the others.
  const [mobileMaterialOpen, setMobileMaterialOpen] = useState(false);
  const [mobileThemesOpen, setMobileThemesOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  // Desktop-only search overlay — the always-visible search input is
  // replaced by a single icon on desktop; clicking it opens this modal
  // instead (mobile keeps its own inline expanding bar, untouched).
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  // Tracks whether the page has been scrolled past the top. On desktop this
  // swaps the full nav row (All Products / Style / Categories / etc.) for a
  // single menu icon next to the search bar — see [data-scrolled] rules in
  // globals.css. The header itself is already position: sticky, so this is
  // purely about what's shown inside it once it's stuck to the top.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const SCROLL_THRESHOLD = 24;
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu whenever the route changes (tapping a link
  // navigates but this component stays mounted across pages).
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileShopOpen(false);
    setMobileMaterialOpen(false);
    setMobileThemesOpen(false);
    setMobileSearchOpen(false);
    setSearchModalOpen(false);
    setShopColumnOpen(null);
    setShopMenuOpen(false);
  }, [pathname]);

  // Lock background scroll while the mobile menu or the search modal is open.
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen || searchModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, searchModalOpen]);

  // Let Esc close the search modal, same as clicking the backdrop/close icon.
  useEffect(() => {
    if (!searchModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchModalOpen]);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);
  const isGroupActive = (links: { href: string }[]) => links.some((l) => isActive(l.href));

  return (
    <header data-component="site-header" data-scrolled={scrolled} data-home={pathname === '/'} data-search-open={mobileSearchOpen}>
      <div className="header-top">
        <div className="header-left-group">
          <button
            type="button"
            className="header-burger"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="icon-svg icon-menu" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="header-search-toggle"
            aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
            aria-expanded={mobileSearchOpen}
            onClick={() => setMobileSearchOpen((open) => !open)}
          >
            <span className="icon-svg icon-search" aria-hidden="true" />
          </button>
        </div>

        {/* Desktop: Shop / New Arrivals / Best Sellers sit on the LEFT of the
            centered logo (hidden on mobile — the burger panel below
            replaces them there). */}
        <nav className="header-nav header-nav-left" aria-label="Primary">
        <div
          className="nav-item"
          onMouseEnter={openShopMenuOnHover}
          onMouseLeave={closeShopMenuOnHover}
        >
          <button
            type="button"
            className="nav-item-trigger"
            data-active={isGroupActive(SHOP_LINKS)}
            aria-expanded={shopMenuOpen}
            onClick={(e) => {
              const willClose = shopMenuOpen;
              setShopMenuOpen((open) => !open);
              // Same fix as the Material/Themes triggers below: this
              // dropdown used to open on CSS :hover alone, which meant
              // clicking the arrow a 2nd time to close it did nothing —
              // the mouse was still hovering the button, so :hover kept
              // it visually open no matter what state React was in.
              // It's now click-driven (see .nav-dropdown.open in
              // globals.css), and blurring on close stops :focus-within
              // from doing the same thing to a keyboard/click-focused
              // button.
              if (willClose) e.currentTarget.blur();
            }}
          >
            Shop
            <span className={`nav-caret${shopMenuOpen ? ' open' : ''}`} aria-hidden="true" />
          </button>
          <div className={`nav-dropdown nav-dropdown-shop${shopMenuOpen ? ' open' : ''}`}>
            <Link
              href={ALL_PRODUCTS_LINK.href}
              className="nav-dropdown-all-link"
              data-active={isActive(ALL_PRODUCTS_LINK.href)}
              onClick={closeShopMenu}
            >
              {ALL_PRODUCTS_LINK.label}
            </Link>
            {/* Flat, always-visible — no more "Shop by Category" accordion
                to open first. Sits directly below All Products, same as
                every category link on the mobile menu already does. */}
            {TYPE_LINKS.map((link) => (
              <Link key={link.href} href={link.href} data-active={isActive(link.href)} onClick={closeShopMenu}>
                {link.label}
              </Link>
            ))}
            <div className="nav-dropdown-columns">
              {/* Material and Themes are collapsed accordions, each
                  opening on hover of that specific column (see
                  openColumnOnHover/closeColumnOnHover above; click also
                  works as a touch/keyboard fallback). */}
              <div
                className="nav-dropdown-column nav-dropdown-column-accordion"
                onMouseEnter={() => openColumnOnHover('material')}
                onMouseLeave={closeColumnOnHover}
              >
                <button
                  type="button"
                  className="nav-dropdown-heading-trigger"
                  aria-expanded={shopColumnOpen === 'material'}
                  onClick={(e) => {
                    const willClose = shopColumnOpen === 'material';
                    setShopColumnOpen(willClose ? null : 'material');
                    // Same :focus-within issue as the Themes trigger
                    // below — blur on close so the list actually hides.
                    if (willClose) e.currentTarget.blur();
                  }}
                >
                  <p className="nav-dropdown-heading">Shop by Material</p>
                  <span
                    className={`nav-caret${shopColumnOpen === 'material' ? ' open' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  className={`nav-dropdown-column-links${shopColumnOpen === 'material' ? ' open' : ''}`}
                >
                  {MATERIAL_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} data-active={isActive(link.href)} onClick={closeShopMenu}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div
                className="nav-dropdown-column nav-dropdown-column-accordion"
                onMouseEnter={() => openColumnOnHover('themes')}
                onMouseLeave={closeColumnOnHover}
              >
                <button
                  type="button"
                  className="nav-dropdown-heading-trigger"
                  aria-expanded={shopColumnOpen === 'themes'}
                  onClick={(e) => {
                    const willClose = shopColumnOpen === 'themes';
                    setShopColumnOpen(willClose ? null : 'themes');
                    if (willClose) e.currentTarget.blur();
                  }}
                >
                  <p className="nav-dropdown-heading">Themes</p>
                  <span
                    className={`nav-caret${shopColumnOpen === 'themes' ? ' open' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  className={`nav-dropdown-column-links${shopColumnOpen === 'themes' ? ' open' : ''}`}
                >
                  {THEME_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} data-active={isActive(link.href)} onClick={closeShopMenu}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Link href={NEW_ARRIVALS_LINK.href} data-active={isActive(NEW_ARRIVALS_LINK.href)}>
          {NEW_ARRIVALS_LINK.label}
        </Link>
        <Link href="/best-sellers" data-active={isActive('/best-sellers')}>
          Best Sellers
        </Link>
        </nav>

        {/* Logo lockup: emblem | divider | VENUS over BIJOUX (Cormorant Garamond).
            The emblem files are in /public (venus-emblem.png and
            venus-emblem-beige.png). The beige emblem and beige text show only
            while the header floats over the home hero photo; styles are at the
            end of globals.css ("Logo lockup"). The class names header-logo-turquoise /
            header-logo-beige are old names still used by the stylesheet. */}
        <Link href="/" className="header-logo" aria-label="Venus Bijoux">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/venus-emblem.png" alt="" className="header-logo-img header-logo-turquoise" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/venus-emblem-beige.png" alt="" aria-hidden="true" className="header-logo-img header-logo-beige" />
          <span className="venus-logo-divider" aria-hidden="true" />
          <span className="venus-logo-text" aria-hidden="true">
            <span className="venus-logo-name">VENUS</span>
            <span className="venus-logo-sub">
              <span className="venus-logo-rule" />
              BIJOUX
              <span className="venus-logo-rule" />
            </span>
          </span>
        </Link>

        {/* Desktop: Shop The Look / About + search / wishlist / cart sit on
            the RIGHT of the logo. On mobile this wrapper is
            display: contents, so its children behave exactly as they did
            before it existed. */}
        <div className="header-right-desktop">
          <nav className="header-nav header-nav-right" aria-label="Secondary">
        <Link href="/shop-the-look" data-active={isActive('/shop-the-look')}>
          Shop The Look
        </Link>
        <Link href={ABOUT_LINK.href} data-active={isActive(ABOUT_LINK.href)}>
          {ABOUT_LINK.label}
        </Link>
          </nav>

          <div className="header-search-group">
            <button
              type="button"
              className="header-nav-toggle-desktop"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <span className="icon-svg icon-menu" aria-hidden="true" />
            </button>

            <form
              action="/search"
              className={`header-search-bar${mobileSearchOpen ? ' mobile-search-open' : ''}`}
            >
              <span className="header-search-icon" aria-hidden="true">
                <span className="icon-svg icon-search" aria-hidden="true" />
              </span>
              <input type="text" name="q" placeholder="search" aria-label="Search" />
            </form>

            <button
              type="button"
              className="header-desktop-search-btn"
              aria-label="Open search"
              aria-expanded={searchModalOpen}
              onClick={() => setSearchModalOpen(true)}
            >
              <span className="icon-svg icon-search" aria-hidden="true" />
            </button>
          </div>

          <div className="header-links">
            {isAdmin && (
              // Only ever shown to signed-in admin emails (ADMIN_EMAILS) —
              // a shortcut to the dashboard. Desktop only; on phones the same
              // button lives on the Account page.
              <Link href="/admin/dashboard" className="header-icon-link header-admin-link" aria-label="Admin Dashboard">
                <span className="header-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" rx="1" />
                    <rect x="14" y="3" width="7" height="5" rx="1" />
                    <rect x="14" y="12" width="7" height="9" rx="1" />
                    <rect x="3" y="16" width="7" height="5" rx="1" />
                  </svg>
                </span>
                <span className="header-link-text">ADMIN</span>
              </Link>
            )}
            {SHOW_ACCOUNT && (
            <Link href="/account" className="header-icon-link" aria-label="Account">
              <span className="header-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                </svg>
              </span>
              <span className="header-link-text">ACCOUNT</span>
            </Link>
            )}
            <Link href="/favorites" className="header-icon-link" aria-label="Wishlist">
              <span className="header-icon" data-active={favoriteIds.length > 0} aria-hidden="true">
                <span className="icon-svg icon-heart" aria-hidden="true" />
              </span>
              <span className="header-link-text">WISHLIST</span>
            </Link>
            <Link href="/cart" className="header-icon-link" aria-label="Cart">
              <span className="header-icon" aria-hidden="true">
                <span className="icon-svg icon-cart" aria-hidden="true" />
              </span>
              <span className="header-link-text">CART</span>
              {itemCount > 0 && (
                <span data-badge>
                  <span className="btn-label">{itemCount}</span>
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ---------- Mobile nav ---------- */}
      <div
        className={`mobile-nav-backdrop${mobileMenuOpen ? ' open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <nav className={`mobile-nav-panel${mobileMenuOpen ? ' open' : ''}`} aria-label="Primary">
        <div className="mobile-nav-group">
          <button
            type="button"
            className="mobile-nav-link mobile-nav-group-trigger"
            aria-expanded={mobileShopOpen}
            data-active={isGroupActive(SHOP_LINKS)}
            onClick={() => setMobileShopOpen((open) => !open)}
          >
            Shop
            <span className={`nav-caret${mobileShopOpen ? ' open' : ''}`} aria-hidden="true" />
          </button>
          {mobileShopOpen && (
            <div className="mobile-nav-submenu">
              <Link
                href={ALL_PRODUCTS_LINK.href}
                data-active={isActive(ALL_PRODUCTS_LINK.href)}
                className="mobile-nav-submenu-link"
              >
                {ALL_PRODUCTS_LINK.label}
              </Link>

              {/* Flat, always-visible — no accordion to open first, same
                  as the desktop "Shop" dropdown's category list. */}
              {TYPE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  data-active={isActive(link.href)}
                  className="mobile-nav-submenu-link"
                >
                  {link.label}
                </Link>
              ))}

              {/* Material and Themes stay as their own nested accordions —
                  there isn't enough width for every option to sit flat on
                  mobile the way it does in the desktop dropdown. */}
              <div className="mobile-nav-subgroup">
                <button
                  type="button"
                  className="mobile-nav-subgroup-trigger"
                  aria-expanded={mobileMaterialOpen}
                  data-active={isGroupActive(MATERIAL_LINKS)}
                  onClick={() => setMobileMaterialOpen((open) => !open)}
                >
                  Shop by Material
                  <span className={`nav-caret${mobileMaterialOpen ? ' open' : ''}`} aria-hidden="true" />
                </button>
                {mobileMaterialOpen && (
                  <div className="mobile-nav-subsubmenu">
                    {MATERIAL_LINKS.map((link) => (
                      <Link key={link.href} href={link.href} data-active={isActive(link.href)}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="mobile-nav-subgroup">
                <button
                  type="button"
                  className="mobile-nav-subgroup-trigger"
                  aria-expanded={mobileThemesOpen}
                  data-active={isGroupActive(THEME_LINKS)}
                  onClick={() => setMobileThemesOpen((open) => !open)}
                >
                  Themes
                  <span className={`nav-caret${mobileThemesOpen ? ' open' : ''}`} aria-hidden="true" />
                </button>
                {mobileThemesOpen && (
                  <div className="mobile-nav-subsubmenu">
                    {THEME_LINKS.map((link) => (
                      <Link key={link.href} href={link.href} data-active={isActive(link.href)}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Link
          href={NEW_ARRIVALS_LINK.href}
          data-active={isActive(NEW_ARRIVALS_LINK.href)}
          className="mobile-nav-link"
        >
          {NEW_ARRIVALS_LINK.label}
        </Link>
        <Link href="/best-sellers" data-active={isActive('/best-sellers')} className="mobile-nav-link">
          Best Sellers
        </Link>
        <Link href="/shop-the-look" data-active={isActive('/shop-the-look')} className="mobile-nav-link">
          Shop The Look
        </Link>
        <Link href={ABOUT_LINK.href} data-active={isActive(ABOUT_LINK.href)} className="mobile-nav-link">
          {ABOUT_LINK.label}
        </Link>
      </nav>

      {/* ---------- Desktop search modal ---------- */}
      <div
        className={`search-modal-backdrop${searchModalOpen ? ' open' : ''}`}
        onClick={() => setSearchModalOpen(false)}
      />
      <div
        className={`search-modal${searchModalOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        aria-hidden={!searchModalOpen}
      >
        <button
          type="button"
          className="search-modal-close"
          aria-label="Close search"
          onClick={() => setSearchModalOpen(false)}
        >
          <span className="icon-svg icon-x" aria-hidden="true" />
        </button>

        <form action="/search" className="search-modal-form">
          <span className="icon-svg icon-search" aria-hidden="true" />
          <input
            type="text"
            name="q"
            placeholder="Search for jewelry..."
            aria-label="Search"
            tabIndex={searchModalOpen ? 0 : -1}
          />
        </form>

        <div className="search-modal-popular">
          <p className="search-modal-popular-title">Popular Searches</p>
          <div className="search-modal-popular-list">
            {POPULAR_SEARCHES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                tabIndex={searchModalOpen ? 0 : -1}
                onClick={() => setSearchModalOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
