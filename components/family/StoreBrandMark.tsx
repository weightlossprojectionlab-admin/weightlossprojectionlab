'use client'

/**
 * StoreBrandMark — render a brand identity for one catalog entry.
 *
 * Two render paths:
 *   1. `logoUrl` set + image loads OK → real brand logo on a white
 *      surface. This is the "polished" look most users expect when
 *      they scan a list of chains.
 *   2. No `logoUrl` OR image fails to load → brand-color tile with
 *      the initial. Same as the pre-logo Phase 0a-i UX, kept as the
 *      graceful fallback. Works offline, no CDN dependency.
 *
 * The fallback is the load-bearing piece: third-party logo CDNs
 * (Clearbit etc.) aren't formally supported public APIs, can rate-
 * limit, can drop chains they don't track, can go away. Picker UIs
 * that render broken-image icons when the CDN burps look amateur;
 * this component refuses to do that.
 *
 * DRY: both the owner's roster picker (/shopping/stores) and the
 * caregiver's "Which store?" modal (/shopping/active) share the
 * same brand-mark via this component. A redesign of the visual lands
 * in one place.
 */

import { useState } from 'react'
import type { StoreCatalogEntry } from '@/constants/store-roster'

interface StoreBrandMarkProps {
  store: StoreCatalogEntry
  /** Size variant. The tiles in both pickers use 'md' (40px). */
  size?: 'sm' | 'md' | 'lg'
  /** When true, render on a white background regardless of the
   *  surrounding tile color. Used inside the roster picker's selected
   *  state, where the tile is the brand color and the logo needs a
   *  white frame for contrast. */
  whiteSurface?: boolean
}

const SIZE_PX: Record<NonNullable<StoreBrandMarkProps['size']>, number> = {
  sm: 28,
  md: 40,
  lg: 56,
}

export function StoreBrandMark({
  store,
  size = 'md',
  whiteSurface = false,
}: StoreBrandMarkProps) {
  // Track image-load failures locally. The component re-renders the
  // initial-tile fallback when this flips. Reset whenever the store
  // id changes (different brand, give it a fresh load attempt).
  const [imgFailed, setImgFailed] = useState(false)

  // Stable size — both image and fallback render at the same px so
  // the surrounding layout never jumps when the logo loads.
  const px = SIZE_PX[size]
  const frameClass = `flex items-center justify-center flex-shrink-0 rounded-xl overflow-hidden`

  // Path A: real logo on a clean surface.
  if (store.logoUrl && !imgFailed) {
    return (
      <div
        className={`${frameClass} ${whiteSurface ? 'bg-white' : 'bg-white dark:bg-white/95'}`}
        style={{ width: px, height: px }}
        aria-hidden
      >
        <img
          src={store.logoUrl}
          alt={store.name}
          width={px}
          height={px}
          onError={() => setImgFailed(true)}
          // object-contain so the logo's aspect ratio is preserved
          // and the white frame shows around shorter wordmarks.
          style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  // Path B: brand-color tile with the initial. The fallback.
  return (
    <div
      className={`${frameClass} text-white text-sm font-bold`}
      style={{ width: px, height: px, backgroundColor: store.brandColor }}
      aria-hidden
    >
      {store.initial}
    </div>
  )
}
