# Smoke Test — 2026-05-09 Session

Covers all changes pushed this session (commits `049bbe9..cfd3b71`).
Test as a single user walking through state transitions to verify
the connected user journey, not just isolated features.

## Setup

- **Test account:** `artofloveandromance@gmail.com` (or any test user with Stripe sandbox)
- **Stripe CLI listener** running: `stripe listen --forward-to https://localhost:3003/api/stripe/webhook`
- **Webhook secret** (`whsec_...`) from CLI startup is in `.env.local`
- **Dev server** on `https://192.168.1.159:3003` (HTTPS for camera/PWA)
- **Firestore rules + indexes** deployed (already done — `purchase_orders` → `order_receipts` rename, fingerprint indexes, etc.)

---

## Phase 1 — Active subscriber baseline

Goal: verify the happy path didn't regress.

- [ ] Sign in as active subscriber → land on `/dashboard` or `/patients` (no loop)
- [ ] `/profile` shows: Current Plan badge (clickable), Status: `Active` in green, no banner above the page
- [ ] Tap Current Plan badge → **PlanDetailModal** opens
  - [ ] Header reads "Current plan · [Plan Name] · $X.XX/mo"
  - [ ] Body lists included features + excluded features (with em-dash)
  - [ ] Footer has **Manage Subscription** button + **View all plans**
  - [ ] Tap Manage Subscription → Stripe Customer Portal opens
- [ ] `/pricing` renders 5 cards in tier order
  - [ ] Active plan's card shows **Current Plan** badge + disabled button
  - [ ] Other plans show tier-aware copy: *"Upgrade to Family Plus"*, *"Switch to Single User"*, etc. (full plan names, not ambiguous "Plus")
- [ ] **Active-sub guard test:** click any plan that's NOT current → expected behavior:
  - [ ] If upgrading via existing flow: no parallel sub created
  - [ ] If trying to checkout: returns 409 `ACTIVE_SUBSCRIPTION_EXISTS` or routes to portal

---

## Phase 2 — Receipt OCR + Order Receipts (the new feature)

Goal: verify Phases A–D end-to-end on a real receipt.

- [ ] `/inventory` → **Purchase History** tab (no item selected) → "Add an order receipt" CTA visible
- [ ] Tap **Snap receipt** → camera surface opens
  - [ ] Vertical/portrait orientation
  - [ ] Continuous autofocus working (text stays sharp as you move)
  - [ ] Torch button visible on Android (absent on iOS — expected)
  - [ ] Capture button + multi-shot thumbnail strip
- [ ] Snap a real receipt (1–3 sections)
- [ ] Tap **Done** → "Reading receipt…" overlay (5–30s)
- [ ] Toast: `RC-XXXXXX saved · review and apply when ready`
- [ ] Page lands on Purchase History → **OrderReceiptDetail** view auto-opens
  - [ ] Header: `Draft · RC-XXXXXX · [Store Name] · [Date] · [Total] · [N lines] · [Confidence]%`
  - [ ] Each line is editable: qty, unit$, total$, cleaner name, route segmented control (Inventory / List / Skip), match override
  - [ ] Auto-matched lines show "Merge into [Item Name]" with "Make new" override
- [ ] Edit a line (e.g., change qty) → auto-saves (no Save button needed for line edits)
- [ ] Tap **Apply to inventory**
  - [ ] Toast confirms: `Applied RC-XXXXXX · X merged · Y new · Z list`
  - [ ] Modal closes
  - [ ] Receipt status flips from Draft → Applied in the feed
- [ ] Tap an inventory item that was merged → Item Details → **Pricing panel** shows the captured price in the matching tier (Unit/Pack/Case)
- [ ] **Duplicate detection test:** snap the same physical receipt again → toast says `looks like a duplicate of RC-XXXXXX` + the new draft has "Possible duplicate" pill in the feed

---

## Phase 3 — Cancel subscription (Stripe Dashboard, immediate cancel)

Goal: verify the webhook + auth-router + limited-access transition.

- [ ] Open Stripe Dashboard (Test mode) → find this customer → Cancel subscription with **"Cancel immediately"**
- [ ] Watch Stripe CLI terminal: `customer.subscription.deleted` fires, returns 200 OK
- [ ] Refresh `/profile`:
  - [ ] Banner at top of subscription panel: red **"Your subscription has ended"**
  - [ ] Plan badge muted (opacity-50)
  - [ ] Label flipped from "Current Plan" to **"Previous Plan"**
  - [ ] Family Members panel muted
  - [ ] Status: **Expired** in red
  - [ ] **No footer button** (per the trialing-only narrowing — this is intentional)
- [ ] Tap the (now muted) Plan badge → PlanDetailModal opens
  - [ ] Header reads "Previous plan · [Plan Name]"
  - [ ] Footer shows **Reactivate Subscription** button (NOT Manage Subscription)

---

## Phase 4 — Limited-access mode (the big one)

Goal: verify terminated users can use the app in read-only mode with FOMO surfaces driving reactivation.

### Routing (no infinite loop)
- [ ] Navigate to `/dashboard` → loads (no redirect to /auth or /pricing)
- [ ] Navigate to `/patients` → loads, patient list visible
- [ ] Navigate to `/inventory` → loads, items visible
- [ ] Navigate to `/medications` → loads, medications visible
- [ ] Navigate to `/recipes` → loads
- [ ] Navigate to `/log-meal` → loads (form visible)

### Persistent FOMO banner
- [ ] Top of `/dashboard`: amber banner with `⚠` icon — *"Your subscription has ended. You can still see your data, but adding new entries is paused."* + **Reactivate** button
- [ ] Same banner on `/patients`, `/inventory`, `/medications`, `/recipes`, `/log-meal`, etc.
- [ ] Banner SUPPRESSED on `/pricing` (no double-prompting)
- [ ] Banner SUPPRESSED on `/profile` (PlanDetailModal handles it)
- [ ] Banner SUPPRESSED on `/auth`
- [ ] Tap Reactivate in banner → routes to `/pricing`

### Locked action surfaces (Layer 5 sweep)
For each, confirm: lock icon visible + label changed + clicking toasts + routes to `/pricing`.

- [ ] `/log-meal` → main **Log Meal** button shows 🔒 + "Reactivate to log meals"
- [ ] `/log-meal` → **Take Photo** affordance replaced with a lock-icon button "Reactivate to use AI photo recognition"
- [ ] Caregiver shopping (`/shopping/<householdId>`) → **Add to list** form button shows 🔒 + "Reactivate"
- [ ] Caregiver shopping → **Scan** barcode button shows 🔒 + "Locked"
- [ ] Active shopping mode (`/shopping/active` with active session) → ⋮ menu → **Snap receipt** entry shows 🔒 + "Snap receipt (locked)"
- [ ] Active shopping mode → in-trip ScanItemCard → tap Scan → toast + redirect (no scanner opens)
- [ ] `/inventory` Purchase History tab → **Snap receipt** CTA shows 🔒 + "Reactivate to snap receipts"
- [ ] `/inventory` Inventory Adjustment tab → **Apply** button shows 🔒 + "Reactivate to apply"
- [ ] `/medications` → **Photograph Prescription Label** button shows 🔒 + "Reactivate to scan labels"
- [ ] Family caregiver invite modal → **Send Invitation** shows 🔒 + "Reactivate to invite"
- [ ] `/patients` → **Add Patient** button shows 🔒 + "Reactivate to add"
- [ ] `/appointments` → **Schedule Appointment** button (header + empty state) shows 🔒 + "Reactivate to schedule"
- [ ] Any locked button click → toast: *"Your subscription has ended. Reactivate to keep building your data."* + redirect to `/pricing`

### Read paths still work
- [ ] Patient cards render with all data
- [ ] Vitals trends/charts display
- [ ] Recipe library browsable
- [ ] Inventory list visible with prices, quantities
- [ ] Shopping list visible (read-only)
- [ ] Order Receipt feed visible with past receipts (can tap to view)

---

## Phase 5 — Reactivation flow

Goal: verify the path back to active.

- [ ] On `/pricing` (terminated user state):
  - [ ] Card matching previous plan shows **Reactivate** button
  - [ ] Other tier cards show tier-aware copy ("Upgrade to..." / "Switch to...")
- [ ] Tap **Reactivate** on the previous plan card → fresh Stripe Checkout opens (NOT a Stripe sub-update)
  - [ ] Critical fix: this is the REACTIVATION path. Old code tried to UPDATE a canceled sub and Stripe rejected with *"A canceled subscription can only update its cancellation_details and metadata."* Should NOT see that error.
- [ ] Complete checkout with `4242 4242 4242 4242` test card
- [ ] Watch Stripe CLI: `checkout.session.completed`, `customer.subscription.created`, `invoice.payment_succeeded`, etc., all return 200 OK
- [ ] Watch dev-server log: `[Stripe Webhook] Subscription updated for user <uid> → plan=X interval=Y`
- [ ] Land on success URL (`/profile?tab=subscription&session_id=...`)
- [ ] Refresh `/profile` → Status flips back to **Active** in green, banner disappears, plan/usage panels return to full opacity
- [ ] Locks lift across the app (banner gone on every protected page, action buttons un-locked)

---

## Phase 6 — Cross-device sync

Goal: verify Firestore real-time listeners propagate.

- [ ] Sign in as same user on a SECOND device (or browser)
- [ ] On Device A: cancel subscription via Stripe Dashboard
- [ ] Within ~1s on Device B: `/profile` updates to Expired without manual refresh
- [ ] On Device A: reactivate → checkout
- [ ] Within ~1s on Device B: `/profile` returns to Active

---

## Phase 7 — Auth-router edge cases

Goal: verify the subscription_expired loop fix stays fixed.

- [ ] As terminated user, navigate to `/auth` directly → redirects to `/pricing` (only once, no loop)
- [ ] As terminated user, navigate to `/onboarding` → redirects to `/pricing` (only once, no loop)
- [ ] Sign out from a terminated state → land on `/auth` cleanly
- [ ] Sign back in → land on `/dashboard` with banner (no redirect ping-pong)

---

## Known gaps (NOT bugs — deferred per scope)

- **No `read_only` editor surfaces yet.** The TERMINATED_ACCESS_MAP encodes 'read_only' for edit_patient, edit_meal_log, etc., but no UI gates have been wired for those. The relevant forms still open and Save still works in component code. Layer 6 sweep deferred.
- **Recipe creation** is admin-only and not wired (separate access pattern).
- **Trial-end → limited-access transition** not yet wired in `lib/subscription-policies.ts`. The decision (14-day uniform, no card, data-forever) lives in conversation memory but not enforcement code. Manual webhook trigger still works for verification.
- **Practitioner Plan card** not on `/pricing` yet. Existing `/franchise/intake` infra works; just not surfaced.
- **A11y polish** (alt text, ARIA labels, focus traps, semantic HTML) deferred — see [project_public_pages_imagery_blog.md](../project_public_pages_imagery_blog.md) memory.

## What good looks like

- All Phase 1-7 boxes check
- No infinite loops, no white-page redirects, no console errors during state transitions
- Stripe CLI shows 200 OK on every event
- Dev server log shows successful webhook processing for every event
- Cross-device sync within ~1s

## What to escalate

- Any Stripe webhook returning 4xx/5xx during normal flows
- Any redirect loop (banner of "Limited-access mode" warnings spamming the dev server log = AuthRouter loop)
- Any terminated user able to take an action (data write) that should be locked
- Any locked button click that doesn't either toast OR redirect (silent no-op)
- "Failed to process receipt" with no underlying error message visible in toast
