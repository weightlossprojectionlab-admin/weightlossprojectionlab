# Platform Capabilities — What This Actually Is

> **Mission:** Proactive, multi-generational health & wellness care. Not a weight-loss app with care
> bolted on — a **per-patient wellness lifecycle** (baseline → vitals → nutrition → outcomes) run for
> every person in a household (self, family across generations, pets), coordinated with caregivers and
> agencies, with a closed **decide → execute → measure** loop most care software never closes.

Built from a four-domain deep code review of `main` (2026-08-30). Status labels throughout:
**SHIPPED** = wired end-to-end · **PARTIAL** = real but scoped/phase-gated/inert-pending-data ·
**STUB/IDEA** = scaffold, deferred, or dead.

The repo/name (`weightlossprojectlab` / "Wellness **Projection** Lab") is a legacy skin. The
"projection" is the point: forecasting a health trajectory to act *before* a crisis.

---

## 1. The Closed Loop (the actual moat)

The differentiator is not any single feature — it's that an intervention is **decided, executed, and
measured**, per patient, and the whole thing feeds the caregiver/agency view. Verified wiring:

```
 RecipeView (member-recipe-engine: ranks by medical-safety + on-hand inventory + expiry urgency)
   ├─ "add missing ingredients" ─▶ SHOPPING LIST ─▶ active in-store / delivery-PIN order ─▶ purchase
   │        ├─ confirm-purchases ─▶ INVENTORY (inStock, expiresAt, purchaseHistory)
   │        │        └─ completeDuty(dutyId) ─▶ DUTY DONE + action-items closed + notify
   │        └─ receipt OCR ─▶ receipt-matcher ─▶ apply-receipt-prices ─▶ waste-$ / price learning
   └─ "Cook Now" ─▶ guided Cooking session ─▶ consumeItem (amount-based) ─▶ INVENTORY depletes
            └─ ─▶ /log-meal (exact recipe macros, multi-eater fan-out) ─▶ MEAL LOG
 INVENTORY (attention model: runs-out clock × spoilage clock × health-demand) ─▶ due-to-buy ─▶ SHOPPING
 MEAL LOG + VITALS ─▶ nutrition↔vitals correlation ─▶ outcome signal ─▶ (proactive projection)
```

Consumer apps *recommend* and stop; agency/EVV software does *visits + billing* and never touches the
kitchen. This platform provisions and executes the therapeutic intervention, then reads the outcome
back. That loop is the thesis.

---

## 2. Capability Catalog

### 2A. Clinical / Health — *a genuine records platform*
Single-source CRUD hub: `lib/medical-operations.ts`. Domain spine: `types/medical.ts` (1,524 lines).

| Capability | Status | Value / notes | Key files |
|---|---|---|---|
| Unified Patient profile (self + family + pets) | SHIPPED | One record for "what they eat/weigh" AND "what a paramedic needs in 10s"; self is a first-class Patient | `types/medical.ts`, `lib/self-patient.ts`, `lib/life-stage-utils.ts` |
| 3-slot name model (auth/legal/nickname) | SHIPPED | No identity collapse; formal surfaces use legal name | `lib/life-stage-utils.ts` |
| Emergency cluster: bloodType, **codeStatus (DNR/DNI)**, advance-directive ref, drugAllergies, emergency contacts, **PIN unlock** | SHIPPED | Genuinely clinical, audit-logged, caregiver alerts | `components/patients/Emergency*.tsx`, `lib/emergency-*.ts` |
| Vitals: `(type, recordedAt)`, polymorphic (BP, SpO2, **newborn/infant**, pet/fish/reptile) | SHIPPED | AI-supervised wizard coaches untrained caregivers | `types/medical.ts`, `components/wizards/SupervisedVitalsWizard.tsx`, `lib/services/vital-service.ts` |
| Glucometer OCR; minute-keyed multi/day dedup | SHIPPED | Photo a meter → structured, plausibility-checked | `lib/ocr-glucometer.ts`, `lib/glucometer-parse.ts` |
| Scheduled vitals + **compliance reporting** | SHIPPED | Multi-time schedules, quiet hours, streaks, per-channel | `types/vital-schedules.ts`, `lib/vital-schedule-service.ts` |
| Trend detection + threshold alerting; `predictFutureVitals` (regression + R²) | SHIPPED | Cron health-trend alerts | `lib/health-trend-detection.ts`, `lib/vital-thresholds.ts`, `lib/health-analytics.ts` |
| Vital approval flow + backdating audit | SHIPPED | Approved weight syncs to profile | `.../vitals/[vitalId]/approve`, `lib/vital-date-validator.ts` |
| Medications: structured dosage (sig/dose/frequencyCode/route) | SHIPPED | One frequency vocabulary shared human↔pet | `types/medical.ts`, `lib/medication-dosage.ts` |
| Med OCR (Tesseract+Gemini) + **RxNorm** lookup + AI condition inference | SHIPPED | Scan a bottle; app infers the condition | `lib/ocr-medication.ts`, `lib/medication-lookup.ts`, `lib/medication-classifier.ts` |
| Honest adherence math (null, not false-100%); field-level audit trail | SHIPPED | Avoids dangerous false reassurance | `lib/medication-dosage.ts`, `MedicationAuditLog` |
| **Drug-interaction checking** | STUB/IDEA | No code — placeholder only | — |
| Medical documents: OCR ─▶ **structured labs w/ reference ranges + critical flags** | SHIPPED | Photo a lab printout → flagged out-of-range values; offline exam-room cache | `lib/document-ocr-pipeline.ts`, `lib/document-data-extractor.ts`, `lib/offline-medical-cache.ts` |
| Providers + appointments (`careContext`: member-medical vs caregiver-visit) | SHIPPED | One calendar for "drive Grandma" + "nurse visits Tues"; conflict-aware slot picker; auto follow-up | `types/medical.ts`, `components/wizards/AppointmentWizard.tsx`, `components/appointments/TimeSlotGrid.tsx` |
| Conditions, food+drug allergens, immunizations, genetic family history, **DME (maintenance reminders)** | SHIPPED | Makes it a *records* platform, not a fitness app | `types/medical.ts`, `components/patients/{Immunization,FamilyHistory,MedicalEquipment}Form.tsx` |
| **Health Episodes** (injury/illness: symptoms, PT, milestones, **progress photos**, **abuse-concern legal export**) | SHIPPED | Full recovery-arc + forensic path (APS/CPS/police) | `types/health-episodes.ts`, `components/health/*Episode*.tsx` |
| Health reports (AI, provider-shareable); **nutrition↔vitals correlation (Pearson r, p, Cohen's d)** | SHIPPED | The *seed* of the proactive cross-signal engine | `lib/health-summary-generator.ts`, `lib/nutrition-vitals-correlation.ts` |
| Health-device sync (Apple/Google/Fitbit); pet clinical mirror | SHIPPED | — | `lib/health-sync-utils.ts`, `types/pet-health.ts` |

### 2B. Nutrition & Kitchen — *the execution engine*
| Capability | Status | Value / notes | Key files |
|---|---|---|---|
| Meal log: AI photo (Gemini) + **USDA FDC verification** | SHIPPED | Clinically-defensible macros; no fake-data fallback (502→manual) | `app/api/ai/analyze-meal`, `lib/usda-nutrition.ts` |
| Meal-safety condition check (sodium/K/sugar vs conditions) → admin review queue | SHIPPED | Food log becomes a renal/cardiac/diabetic guardrail | `app/api/ai/meal-safety`, `lib/gemini.ts` |
| Meal templates; per-patient scoping (TDEE % of daily needs) | SHIPPED | — | `app/log-meal/page.tsx` |
| Recipe generation (4 engines: AI / market-basket ML / inventory / member) | SHIPPED* | Cold-start + community-pattern + use-what-you-have | `lib/*-recipe-generator.ts`, `lib/member-recipe-engine.ts` |
| **Medical recipe engine** (CKD/diabetes/cardiac/cancer nutrient guardrails + safety badges) | PARTIAL | Ceiling is high but **`conditions=[]` TODO** → condition switch is inert; fires only from meds/goals | `lib/medical-recipe-engine.ts` |
| Multi-eater "who's this for" (roster + **allergen hard-block**, servings auto-sync) | SHIPPED | — | `components/ui/RecipeModal.tsx` |
| Guided cooking session → **amount-based inventory deduction** → meal-log handoff | SHIPPED | Mechanical heart of the loop | `app/cooking/[sessionId]`, `lib/unit-conversion.ts` |
| Shopping: per-item store, attribution, active in-store mode + session ML instrumentation | SHIPPED | Caregiver accountability; scan-sequence logged for future ML | `lib/shopping-operations.ts`, `lib/shopping-session-manager.ts` |
| Orders + **delivery-PIN** + inspection (Stripe hold) | SHIPPED | Home-bound patients get PIN-verified grocery handoff | `lib/shop-deliver-orders.ts` (under-typed) |
| Barcode + OFF product lookup (cache-first) | SHIPPED | — | `lib/barcode-variants.ts`, `lib/cached-product-lookup.ts` |
| Receipt OCR + reconciliation + **price learning / waste-$** | SHIPPED | Real prices flow back into the model | `lib/ocr-receipt.ts`, `lib/receipt-matcher.ts`, `lib/apply-receipt-prices.ts` |
| Inventory: pack/unit levels, **expiration scanning** | SHIPPED | "1.5 bottles" precision for accurate deduction | `components/inventory/ExpirationScanner.tsx`, `lib/expiration-tracker.ts` |
| **Inventory attention model** `A = D·max(runs-out, spoilage)` + waste-report + health-demand | SHIPPED (Phase 0) | One ranked "what needs attention" list; the modeling crown jewel | `lib/inventory-attention.ts`, `lib/restocking-report.ts`, `lib/health-demand.ts` |
| Allergen safety: OFF ingestion, per-ingredient AI classification, hard-block gating | SHIPPED | Safety-critical | `lib/allergen-parser.ts`, `lib/ingredient-allergen-classifier.ts`, `lib/allergen-cross-check.ts` |
| `ai-expiration-predictor.ts` (Gemini shelf-life) | **DEAD** | 444 lines, zero imports — wire or retire | `lib/ai-expiration-predictor.ts` |

### 2C. Care Coordination & Family
| Capability | Status | Value / notes | Key files |
|---|---|---|---|
| Household duties / **ADL checklists**, claim-a-shift (transactional), completion + analytics | SHIPPED | Audit-grade completion (rating/photos/issues) | `types/household-duties.ts`, `app/api/household-duties/[dutyId]/claim` |
| Duty `subtaskDeps` / blocked-reasons / recipe-med resource links | STUB/IDEA | Don't exist (shopping link is routing-only) | — |
| **Handoff notes** (+ flag-for-owner, bell fan-out, not billing-gated) | SHIPPED | Shift-to-shift spine | `types/handoff.ts`, `hooks/useHandoffNotes.ts` |
| Cross-household **caregiver worklist / shift view** | SHIPPED (flagged) | One stream across all families; *duty+check_in only* — vitals/meds/appt sources stubbed | `hooks/useCaregiverWorklist.ts` |
| **Caregiver burnout journal** (mood/stress/energy/sleep + burnoutRisk) | SHIPPED | Tracks the *carer*, rare in care software | `types/journal.ts`, `app/api/journal/stats` |
| Voice journal / stress-keyword NLP | STUB/IDEA | Burnout = numeric heuristic only | — |
| **Two-axis RBAC** (4 roles × 16 granular permissions) + `checkPatientAccess` | SHIPPED | Enterprise-grade; sensitive PII separately gated | `lib/family-roles.ts`, `lib/family-permissions.ts`, `lib/rbac-middleware.ts` |
| Invitations + idempotent accept + **HIPAA-ack audit** + thin-invitee | SHIPPED | HIPAA ack logged (optional, not hard-blocked) | `app/api/invitations/[invitationId]/accept`, `lib/caregiver-relationship.ts` |
| Notifications: push/inApp/email + vital-reminder cron & scheduled fn | SHIPPED | Operational heartbeat; voice/SMS channels are stubs | `lib/notifications/dispatch.ts`, `functions/health/vital-reminders.ts` |
| Households (derived membership); joint-custody cross-household | SHIPPED / DEFERRED | Single-`householdId` invariant precludes custody today | `types/household.ts` |

### 2D. Agency / White-label / Platform
| Capability | Status | Value / notes | Key files |
|---|---|---|---|
| Subdomain→tenant resolution + server-side branding (no unbranded flash) | SHIPPED | `theirbrand.wellnessprojectionlab.com`, zero per-tenant deploys | `proxy.ts`, `app/tenant-shell/layout.tsx` |
| Franchise plans (single source: tiers/setup-fee/seats/limits) | SHIPPED | Marketing + apply + seat-caps read one file | `lib/franchise-plans.ts` |
| Lifecycle: apply→approve→**createTenant**→Stripe setup-fee→activate (+owner provisioning) | SHIPPED | Clean state machine; `createTenant` single source | `lib/tenant-create.ts`, `app/api/webhooks/stripe/route.ts` |
| Staff/seats (transactional caps) + managed-families (2-way, **consent gate**) | SHIPPED | `managedBy` single-tenant; attach ≠ consent (PHI story) | `.../invitations`, `.../managed-families`, `ManagedByBanner.tsx` |
| Agency dashboard (coverage-gap alert, health snapshots, staff-grouped schedule) | SHIPPED | Genuinely operational | `app/tenant-shell/dashboard/page.tsx` |
| **EVV** (true Electronic Visit Verification: GPS, Medicaid export, state aggregator) | PARTIAL/main | `main` = caregiver-visit scheduling + structured `VisitSummarySheet`; real EVV/HHAeXchange is feature-branch | `components/appointments/VisitSummarySheet.tsx`, `types/compliance.ts` (branch) |
| Consumer Stripe (checkout/webhook/trials/portal) + `PLAN_CAPS` feature-gates | SHIPPED | Caps supersede stale docs | `lib/feature-gates.ts` |
| Recurring franchise billing (MRR) | PARTIAL | Setup fee live; per-seat MRR modeled, **not charged** | `types/tenant.ts` |
| Progress/projection engine | SHIPPED | **Weight-centric** linear-fit (calorie/step are copies) — extend to whole-health = the opportunity | `app/progress/page.tsx`, `lib/weight-projection-agent.ts` |
| Gemini AI (OCR/meal/recipes/reports) + coach guardrails + no-PHI telemetry | SHIPPED | One client, cost observability | `lib/ai/gemini-client.ts`, `lib/ai/coach-guardrails.ts`, `lib/gemini-invocations.ts` |
| Analytics (GA/Mixpanel `track` + Vercel web-vitals); triage/reorder heuristics; careers ML | SHIPPED | `ml/models` dir empty (no trained clinical models) | `lib/analytics-tracking.ts`, `lib/appointment-recommendations.ts` |
| Admin console (tenants, franchise-requests, ai-decisions, api-usage…) + audit log | SHIPPED | Every tenant mutation audit-logged | `app/(dashboard)/admin/*`, `lib/admin/audit.ts` |
| **Gamification** (XP/levels/badges/streaks), missions, perks, referrals, gallery, discover | SHIPPED | Split verdict: the **social containers** (groups, family-feed, referrals-to-care-circle) are latent **SDOH / social-architecture** — re-anchor to care (peer support, caregiver-burnout antidote, agency-hosted classes). The **hollow points economy** (`gamification.ts` XP/levels/badges, no clinical read path) is the real legacy to prune or subordinate. | `lib/gamification.ts`, `lib/missions.ts` |
| "E-E-A-T system" | ASPIRATIONAL | SEO blog (18 posts) w/o author/reviewer schema | `app/blog/*`, `lib/seo.ts` |

---

## 3. DOSI Priorities (this is the point of the doc)

**Single-source wins — preserve, they're load-bearing:** `lib/medical-operations.ts`,
`lib/franchise-plans.ts`, `lib/tenant-create.ts`, `feature-gates.PLAN_CAPS`, `lib/tenant-auth.ts`,
`gemini-client`, `track()`, OFF→allergenTags (`allergen-parser`), barcode `resolveProductDoc`,
honest-null `medication-dosage`, the `(type,recordedAt)` vital dedup.

**Highest-value consolidation / dedup targets:**
1. **Three allergen vocabularies** (recipe `AllergyTag` vs product `CanonicalAllergen` vs
   shopping-suggestions' own map) — *safety-critical*; **sesame is unrepresentable recipe-side.**
2. **Triple weight store** (VitalSign 'weight' / `WeightLog` / `PatientProfile.currentWeight`).
3. **Two provider models** (`Provider` dead vs `HealthcareProvider` live).
4. **Two medication stores** (`PatientMedication` live vs `PatientProfile.medicationList` dead).
5. Vital thresholds duplicated (`vital-thresholds` ↔ `illness-detection-engine`, in-code TODO);
   two vital-reminder engines; recipe-generation sprawl (4 generators + catalog + templates).

**Built-but-inert (wire the data, unlock big value):**
- **`medical-recipe-engine` runs on `conditions=[]`** — the flagship condition-safety logic is dormant.
- **`inventory-attention` health-demand** stays `D=1` pending an item-enrichment pipeline.
- **`nutrition↔vitals correlation`** exists but isn't productized into proactive flags.
- `ai-expiration-predictor` (444 lines) and OpenAI vision path — dead; `trackAICorrection` never persists.

**Naming drift / "weight-loss framing that's really clinical" (recontextualize, don't delete):**
`progress-analytics`/`weight-projection-agent` (clinical trend signal), `AppointmentRecommendation.triggerMetrics`
(weight-loss triggers on a medical recommender), `/documents` route is marketing copy not the manager,
repo/name vs actual scope.

**Genuine deletion candidates (the *real* legacy):** the **hollow points economy** — `lib/gamification.ts`
XP/levels/badges/leaderboards + the perks/missions mechanic that has no clinical read path (keep the social
*containers* — groups/family-feed/referrals — and re-anchor them to care, don't delete them),
`ADDON_FEATURES`, empty `ml/models/`, `ADMIN_EMAILS` (self-deprecated), `.bak`/duplicate `fix-start-weight` routes.

**Two-regime compliance boundary (the seam is the line):** family-side PHI sharing across households is
**consumer data at the family's discretion via consent** — HIPAA/BAA governs the *provider*, not the family;
the app's obligations there are consent + consumer-health-privacy law (FTC Health Breach Rule, state laws
e.g. WA My Health My Data, minors/COPPA), a *lighter and different* bar. Data only enters the **agency's**
HIPAA/BAA regime when it crosses the `managedBy` seam into tenant/clinical use. Design consequence: the
social/SDOH layer ships **consumer-side, consent-gated** (low friction), and the seam stays the one hard
HIPAA boundary. (Not legal advice — `counselVerified`-gate this.)

---

## 4. Competitive Teardown — falsifying "nothing compares"

I tried to break the claim slice by slice. Result: **it fails per-slice, holds for the integrated whole.**

| Slice | Serious competitors | Verdict |
|---|---|---|
| Family health record / PHR | Apple Health Records, CommonHealth, PicnicHealth, ex-CareZone | **Beaten on records aggregation** — they don't do nutrition execution or care coordination |
| Food-as-medicine / therapeutic nutrition | Season Health, Foodsmart, Nourish, Culina | **Beaten on nutrition depth + payer contracts** — none do multi-gen family clinical records or agency |
| Home-care agency software (EVV/billing) | HHAeXchange, WellSky, AxisCare, AlayaCare, Sandata | **Beaten badly on EVV/billing/compliance certs** — thin family portal, zero consumer nutrition/vitals |
| Caregiver coordination / concierge | Wellthy, Cariloop, Papa, Honor, ianacare | **Comparable on coordination** — but no clinical records + no nutrition-execution loop |
| Consumer health/nutrition tracking | MyFitnessPal, Cronometer, Apple Health | **Beaten on self-tracking polish** — single-user, no family/care/agency |

**Honest verdict:**
- **The claim is FALSE at the capability level.** Every individual slice has a stronger, better-funded
  specialist. HHAeXchange is a *certified state EVV aggregator*; Foodsmart has *payer contracts*; Apple
  owns *device sync*. WPL is not best-in-class at any single thing, and several differentiators are
  **PARTIAL or inert** (medical constraints on empty data, EVV not real on main, MRR not charging,
  cross-signal correlation seeded-not-productized).
- **The claim HOLDS at the integrated level.** I could not find one product that unifies
  **(a)** multi-generational family clinical records (self+family+pets, code-status, labs, immunizations,
  DME, episodes), **(b)** a *closed* therapeutic-nutrition execution loop (condition→recipe→shop→cook→
  log→vitals), **(c)** caregiver coordination (duties/handoff/worklist/burnout), and **(d)** a white-label
  agency layer over one consented data seam. The nearest conceptual rival is an imaginary
  Season Health + Wellthy + HHAeXchange mashup — which does not exist as a product.

**So the moat is the *integration and the closed loop*, not any feature — and it is exactly as strong as
its weakest *wired* link.** Today the loop is architecturally complete but clinically shallow in spots
(inert conditions, no real EVV, weight-only projection). The strategic imperative is therefore not "add
features" but **wire the links that turn an impressive demo into a clinically-trusted, proactive system**:
load conditions into the recipe/safety engines, productize the nutrition↔vitals correlation into
early-warning flags, extend the projection engine beyond weight, and land real EVV + recurring billing to
make the agency side credible. Do that, and "nothing compares" becomes defensible in *practice*, not just
in *architecture*.

---

## 5. Roadmap Implications (DOSI-framed)

1. **Recontextualize, don't delete, the lifecycle** — weight-loss *framing* → clinical (target weight =
   care-plan goal; projection = health-outcome forecast). The engine is the moat.
2. **Prune only the true gamification shell** (§3 deletion candidates).
3. **Wire the inert clinical links** (the flagship build): conditions → `medical-recipe-engine`/`meal-safety`;
   item-enrichment → `health-demand`; `nutrition↔vitals` → proactive early-warning flags.
4. **Consolidate the safety-critical single-source violations** first (allergen vocabularies).
5. **Make it per-patient everywhere** (meal-safety currently self-scoped, not `?patientId`).
6. **Land the agency-grade credibility** (real EVV/HHAeXchange, recurring billing, compliance-guarded seam)
   — the B2B2C moat depth.
