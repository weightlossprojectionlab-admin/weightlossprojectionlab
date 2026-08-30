/**
 * Tenant branding helpers.
 *
 * TenantBranding colors are stored as HSL triplets (e.g. "262 83% 58%"), NOT
 * hex. Render them through hslToCss so a raw triplet becomes a valid CSS color
 * `hsl(262 83% 58%)`, while an already-formatted value (hex, rgb(), a named
 * color, or an existing hsl()) passes through untouched.
 *
 * This is the canonical version of the `toCss` helper that was previously
 * inlined in app/tenant-shell/page.tsx, layout.tsx, and BrandingEditor.tsx
 * ("extract on the next reuse — rule of three"). New tenant-branding consumers
 * (the care-package proposal) use this; the older inlined copies can migrate
 * on their next touch.
 */

/** Convert a stored branding color to a CSS-usable color string. */
export function hslToCss(color: string | undefined | null, fallback = '262 83% 58%'): string {
  const value = (color ?? '').trim() || fallback
  // A leading digit means it's a bare HSL triplet ("262 83% 58%").
  return /^\d/.test(value) ? `hsl(${value})` : value
}
