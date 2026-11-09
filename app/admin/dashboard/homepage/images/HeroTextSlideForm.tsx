'use client';

import { useState } from 'react';
import { updateHeroSlideText } from './actions';

export type HeroSlideText = {
  heading: string;
  subtext: string;
  buttonLabel: string;
  buttonLink: string;
  // Applied to both the heading and subtext on the homepage — see
  // HeroPanelCycle.tsx.
  textColor: string;
  // Mobile-only color ('' = default beige).
  mobileTextColor: string;
};

// One save form for one of the hero's 3 photo slots — see "Hero Text &
// Buttons" on the Cover Images page and HeroPanelCycle.tsx (the actual
// homepage component that cycles between all 3 of these). `heading` is a
// plain textarea — a line break there becomes a <br/> on the homepage,
// matching how the original 2-line "Trendy. Classy. / Affordable."
// heading was written.
export default function HeroTextSlideForm({
  slideNumber,
  initial,
}: {
  slideNumber: 1 | 2 | 3;
  initial: HeroSlideText;
}) {
  const [heading, setHeading] = useState(initial.heading);
  const [subtext, setSubtext] = useState(initial.subtext);
  const [buttonLabel, setButtonLabel] = useState(initial.buttonLabel);
  const [buttonLink, setButtonLink] = useState(initial.buttonLink);
  // Empty string ('') means "no override" — the homepage falls back to
  // its normal CSS colors (brown on desktop, beige on mobile). Only once
  // this is actually set to a real color does that one color apply on
  // both breakpoints for this slide — see HeroPanelCycle.tsx.
  const [textColor, setTextColor] = useState(initial.textColor);
  const [mobileTextColor, setMobileTextColor] = useState(initial.mobileTextColor);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('heading', heading);
      formData.set('subtext', subtext);
      formData.set('button_label', buttonLabel);
      formData.set('button_link', buttonLink);
      formData.set('text_color', textColor);
      formData.set('mobile_text_color', mobileTextColor);
      await updateHeroSlideText(slideNumber, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} data-admin-subsection style={{ marginTop: 12 }}>
      <h3 style={{ margin: '0 0 12px' }}>Slide {slideNumber}</h3>

      <label data-admin-field>
        <span>Heading (2 lines max — press Enter for a line break)</span>
        <textarea value={heading} onChange={(e) => setHeading(e.target.value)} rows={2} required />
      </label>

      <label data-admin-field>
        <span>Text color — desktop (heading &amp; subtext)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="color"
            value={textColor || '#37152F'}
            onChange={(e) => setTextColor(e.target.value)}
            style={{ width: 44, height: 32, padding: 0, border: 'none', background: 'none' }}
          />
          <input
            type="text"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            placeholder="Default (brown)"
            style={{ maxWidth: 260 }}
          />
          {textColor && (
            <button
              type="button"
              data-admin-btn-secondary
              onClick={() => setTextColor('')}
              style={{ padding: '4px 10px' }}
            >
              Use default
            </button>
          )}
        </div>
      </label>

      <label data-admin-field>
        <span>Text color — mobile (heading &amp; subtext)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="color"
            value={mobileTextColor || '#FBF4EE'}
            onChange={(e) => setMobileTextColor(e.target.value)}
            style={{ width: 44, height: 32, padding: 0, border: 'none', background: 'none' }}
          />
          <input
            type="text"
            value={mobileTextColor}
            onChange={(e) => setMobileTextColor(e.target.value)}
            placeholder="Default (beige)"
            style={{ maxWidth: 260 }}
          />
          {mobileTextColor && (
            <button
              type="button"
              data-admin-btn-secondary
              onClick={() => setMobileTextColor('')}
              style={{ padding: '4px 10px' }}
            >
              Use default
            </button>
          )}
        </div>
      </label>

      <label data-admin-field>
        <span>Subtext</span>
        <input type="text" value={subtext} onChange={(e) => setSubtext(e.target.value)} />
      </label>

      <label data-admin-field>
        <span>Button text</span>
        <input
          type="text"
          value={buttonLabel}
          onChange={(e) => setButtonLabel(e.target.value)}
          placeholder="SHOP NOW"
        />
      </label>

      <label data-admin-field>
        <span>Button link</span>
        <input
          type="text"
          value={buttonLink}
          onChange={(e) => setButtonLink(e.target.value)}
          placeholder="/shop or /style/gold-plated or /collection/your-look"
          required
        />
      </label>

      <div data-admin-form-actions>
        <button type="submit" data-admin-btn-primary disabled={saving}>
          {saving ? 'Saving…' : `Save Slide ${slideNumber}`}
        </button>
        {saved && <span data-admin-form-hint>Saved — live on the homepage now.</span>}
        {error && <span data-admin-form-hint>{error}</span>}
      </div>
    </form>
  );
}
