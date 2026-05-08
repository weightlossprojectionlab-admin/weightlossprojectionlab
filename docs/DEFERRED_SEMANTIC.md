# Deferred Work — Semantic Todo

**Last updated**: 2026-05-08

Organized by **user intent moment** (what is the user trying to do?) rather than by file or technical category. Each section names a moment in the user's flow + what's blocking that intent today + what's already shipped.

When updating: keep the section structure (intent moments), move `[ ]` → `[x]` as items ship, add new items under the intent they belong to (not by code locality).

---

## When the user is building their shopping list

- [ ] **Self-healing search** — when `/api/products/search` returns a thin doc (no name, no nutrition), auto-enrich it via `lookupProductHybrid` so the next search sees the populated row. Improves over time without admin work.
- [ ] **Inline edit/upload on catalog match rows** — pencil + camera icons per row in `/inventory` and `/shopping` search results, so users can fix bad names ("COFFEE") or upload an image without leaving the search context.

## When the user is adding an item

- [x] Catalog match → tap → qty + on-hand sheet (`/shopping` + `/inventory`)
- [x] Not in catalog → editable-name sheet (both surfaces)
- [ ] **Add to cart on the fly** — `+ Add` button on `/shopping/active` header is stubbed. Wire the real cart-mode flow: scan or type → AddToShoppingListSheet in cart mode → adds with `foundInStore: true`.
- [ ] **Out-of-stock preference at list-build time** — schema field `outOfStockPreference: 'replace' | 'skip' | 'remove'` set when the list-builder adds an item. Captures family intent so the in-store shopper doesn't have to guess.

## When the user is acting on an item in-store

- [x] Scan → auto-fulfill at list qty (no qty modal)
- [x] Tappable success toast with Adjust affordance for partial qty
- [x] Per-row trash + UI confirmation modal
- [x] Empty-trip cancel prompt
- [x] 3-dot menu IA (Go to Check Out / Snap receipt / Message family / Share list / Cancel trip)
- [ ] **Can't-find action sheet** — four real options (Replace / Out of Stock / Skip / Remove). Today's `Can't find item` button still toasts a stub.
- [ ] **Replacement path with similarity engine** — when user picks Replace, server returns top 5 catalog candidates ranked by category + size + descriptors + household purchase history. Build behind `/api/products/similar` + `lib/similar-products.ts`. Phase 1.5 from the design: token overlap + structured-field guards.
- [ ] **Skip + Remove paths** — wire the simple ones first (skip = session state, remove = `deleteShoppingItem`). Replace requires the similarity engine, so it's the last to ship.

## When the user is closing out a trip

- [x] Skipped-items decision gate before purchase-complete
- [x] "Go to Check Out" copy
- [ ] **Receipt OCR** — long-aspect camera capture component + multi-shot stack + `/api/ocr/receipt` (Gemini Vision) + match-and-apply screen. Three phases: capture (~1.5 hr), endpoint (~1.5 hr), review screen (~2 hr).

## When the user is configuring an item in Item Details

- [x] Pack/Case fields wired with category-aware placeholder defaults
- [x] Sticky save bar + drop "Saved" copy
- [x] Buy Again gate dropped
- [ ] **Pack-concept consolidation** — `pack tier` (read-only) + `units per pack` (read-only) + `pack size` (editable) describe the same idea. Pick one canonical and drop the others from this surface.
- [ ] **Pack/Case panel placement** — currently in Classification, semantically belongs in Product Facts (packaging facts, not "what kind of thing").
- [ ] **Quick Actions destructive separation** — Delete shouldn't sit in the same row as Used Up / Buy Again. Move to a different row or "More actions" overflow.
- [ ] **On-hand inline ± stepper** — the common +/- 1 case shouldn't force a tab-switch to Adjust. Inline ± on the On-hand panel + audit-trail-aware adjustment under the hood.
- [ ] **Add-photo affordance** when the header thumb is empty — small CTA that deep-links to the Image tab.
- [ ] **UPC tab cross-link** from the Product Facts panel header.
- [ ] **Stale empty-state copy** in `renderScanPickEmpty` for Item Details (mentions only category/location/expiration/notes; missed pack/case + the new flows).

## When the user wants to coordinate with family

- [ ] **In-app chat** — `Message family` button is a placeholder. Blocked on PRD-in-app-chat.md Phase 1.
- [ ] **Share list** — placeholder in 3-dot menu. Native share sheet on mobile + plain-text fallback for email/SMS. Not blocked on chat.
- [ ] **Caregiver hand-off** within an active shopping session (blocks: in-app chat).

## When the platform needs to maintain data quality

- [ ] **Re-fetch nutrition for bad per-100g-as-per-serving rows** — was a known issue earlier. Manual click on admin barcode edit OR small batch admin tool.
- [ ] **Pre-existing tsc error in `lib/nutrition-extraction.ts:143`** — only persistent tsc warning all session. Trivial fix, repeatedly skipped.

## When the developer is landing work

- [ ] **Audit-and-land uncommitted work** — the tree is far from a coherent commit. Splits into roughly:
  - camera-stream architecture (built then reverted; a couple of incidental fixes survived)
  - AddToShoppingListSheet + useAddSheet hook + format-on-hand lib
  - Mobile-first scanner (4:3 aspect, full-bleed modal, partial-decode rejection, aim guidance, manual-entry button always available)
  - /shopping not-found → editable-name sheet
  - /inventory tabs mobile-first + Item Details refactor (sticky save, pack/case fields, placeholder defaults, Buy Again unblocked)
  - /shopping/active rewrite (friction-minimum scan flow, trash + remove confirmation, empty-trip prompt, 3-dot menu, skipped-items decision gate, "Go to Check Out" copy)
  - Footer hide on `/shopping` + `/inventory`
  - Tailwind `darkMode: 'class'` (mobile contrast fix)
  - Admin gating on `/admin/barcodes` deep-links
- [ ] **Decide on the family simulation script** — sits in repo unused. Either commit and document, or remove.

## Pre-launch / out-of-band

- [ ] **API key rotation** — flagged in memory `session_2026-05-06_family_meal_polish.md`. Outstanding user action, unrelated to code.
- [x] Storage rules deploy (done mid-session)

---

## Recommended order of operations

1. **Audit-and-land** the uncommitted tree before more feature work — anything piled on top compounds the risk.
2. **In-store action sheet + similarity engine** — replaces the biggest current dead-end UX path (Can't Find Item).
3. **Receipt OCR** — high-value, high-effort, build it once.
4. **Item Details polish** (pack-concept consolidation, on-hand inline stepper, etc.) — incremental friction reductions.
5. **Family chat + Share list** — partly blocked on PRDs; revisit after #2/#3.
