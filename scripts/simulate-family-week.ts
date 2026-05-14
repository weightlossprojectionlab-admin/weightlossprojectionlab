/**
 * scripts/simulate-family-week.ts
 *
 * Logs-only family lifecycle simulation. Runs a stateful, real-time,
 * cause-and-effect simulation of how a real family uses the platform —
 * across meals, vitals, shopping, inventory, medications, appointments,
 * household duties, caregiver invites, and member lifecycle.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ STRICT NO-WRITE CONTRACT                                         │
 * │                                                                  │
 * │ This script NEVER writes to Firestore. NEVER fires notifications.│
 * │ NEVER calls Gemini / OFF / USDA. Reads only.                     │
 * │                                                                  │
 * │ All "events" are mutations of an in-memory FamilyState that get  │
 * │ appended to a JSONL log. The log is the deliverable.             │
 * │                                                                  │
 * │ DO NOT add imports from:                                         │
 * │   - lib/notification-service.ts                                  │
 * │   - lib/email-service.ts                                         │
 * │   - lib/notifications/*                                          │
 * │   - lib/shopping-operations.ts                                   │
 * │   - any app/api/* route handler                                  │
 * │                                                                  │
 * │ DO NOT call any of:                                              │
 * │   - setDoc, updateDoc, addDoc, deleteDoc                         │
 * │   - any Gemini / USDA / OpenFoodFacts fetch                      │
 * │                                                                  │
 * │ If you need to add writes, the contract has been broken — stop.  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   npx tsx scripts/simulate-family-week.ts \
 *     --household=<id> \
 *     --days=14 \
 *     --speed=5 \
 *     --scenarios=baseline,new-baby,caregiver-invite,medication-regimen \
 *     --output=./logs/sim.jsonl
 *
 * Defaults: --days=7, --speed=5, --scenarios=baseline.
 *
 * See plan: C:\Users\percy\.claude\plans\what-do-you-mean-clever-candle.md
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

import { getEaterEligibility } from '../lib/eater-eligibility'

// ============================================================================
// FIREBASE INIT (read-only by convention)
// ============================================================================

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db: Firestore = getFirestore()

// ============================================================================
// TYPES
// ============================================================================

type ScenarioId =
  | 'baseline'
  | 'new-baby'
  | 'caregiver-invite'
  | 'add-member'
  | 'remove-member'
  | 'medication-regimen'
  | 'appointment-cycle'
  | 'pet-care'
  | 'household-duties-cycle'

type EventType =
  | 'meal_log'
  | 'vital_reading'
  | 'consume'
  | 'low_stock'
  | 'shopping_trip'
  | 'purchase'
  | 'inventory_adjustment'
  | 'pet_feeding'
  | 'patient_added'
  | 'patient_removed'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_expired'
  | 'caregiver_added'
  | 'medication_prescribed'
  | 'medication_dose_taken'
  | 'medication_dose_missed'
  | 'medication_refill_due'
  | 'medication_refilled'
  | 'appointment_scheduled'
  | 'appointment_attended'
  | 'appointment_missed'
  | 'appointment_cancelled'
  | 'duty_assigned'
  | 'duty_completed'

interface SimEvent {
  id: string
  causedBy: string | null
  ts: string // ISO
  type: EventType
  actor: { id: string; name: string; role: 'self' | 'caregiver' | 'system' }
  subject: { patientId?: string; itemId?: string; name?: string }
  cause: string
  payload: Record<string, unknown>
}

interface PatientView {
  id: string
  name: string
  type: 'human' | 'pet'
  dateOfBirth?: string
  species?: string
  status: 'active' | 'deleted'
  lifeStage?: string
}

interface InventoryView {
  id: string
  productName: string
  brand?: string
  qty: number
  unit?: string
  category?: string
  packTier?: 'U' | 'P' | 'C'
  packQuantity?: number
  lastConsumedAt?: string
}

interface RecipeView {
  id: string
  name: string
  mealType?: string
  ingredients: Array<{ itemId?: string; name: string }>
}

interface FamilyState {
  householdId: string
  householdName: string
  primaryCaregiverId: string
  members: Map<string, PatientView>
  inventory: Map<string, InventoryView>
  shoppingList: Map<string, { needed: boolean; lastFlaggedAt: string }>
  vitalsHistory: Map<string, Array<{ ts: string; type: string; value: number }>>
  appointments: Array<{ id: string; patientId: string; providerType: string; dateTime: string; status: string }>
  duties: Map<string, { id: string; name: string; category: string; frequency: string; assignedTo: string[]; lastCompletedAt?: string; nextDueAt: string }>
  medications: Map<string, { id: string; patientId: string; name: string; quantityRemaining: number; lastTaken?: string; doseSchedule: 'daily' | 'twice-daily' }>
  invitations: Array<{ id: string; recipientEmail: string; role: string; status: 'pending' | 'accepted' | 'expired'; expiresAt: string; sentAt: string }>
  caregivers: Set<string>
  recipes: Array<RecipeView>
  clock: Date
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs(): {
  household?: string
  days: number
  speed: number
  scenarios: ScenarioId[]
  output: string
  seed?: string
} {
  const argv = process.argv.slice(2)
  const get = (k: string) => {
    const m = argv.find((a) => a.startsWith(`--${k}=`))
    return m ? m.slice(k.length + 3) : undefined
  }
  const days = parseInt(get('days') ?? '7', 10)
  const speed = parseFloat(get('speed') ?? '5')
  const scenarios = (get('scenarios') ?? 'baseline').split(',').map((s) => s.trim()) as ScenarioId[]
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const output = get('output') ?? `./logs/simulate-family-week-${ts}.jsonl`
  return {
    household: get('household'),
    days: Math.max(1, Math.min(60, days)),
    speed: Math.max(0.1, Math.min(100, speed)),
    scenarios,
    output,
    seed: get('seed'),
  }
}

// ============================================================================
// DETERMINISTIC RANDOMNESS (seeded)
// ============================================================================

function makeRng(seed: string): () => number {
  // Mulberry32 — small, deterministic, plenty good for sim variance
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i)
    h |= 0
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pickOne = <T>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)]
const between = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo)

// ============================================================================
// READ PHASE — Firestore (read-only)
// ============================================================================

async function readSubstrate(householdId: string | undefined): Promise<{
  household: any
  patients: PatientView[]
  inventory: InventoryView[]
  recipes: RecipeView[]
  duties: FamilyState['duties']
  medications: FamilyState['medications']
}> {
  // Resolve household
  let household: any
  if (householdId) {
    const snap = await db.collection('households').doc(householdId).get()
    if (!snap.exists) throw new Error(`Household ${householdId} not found`)
    household = { id: snap.id, ...snap.data() }
  } else {
    const snap = await db.collection('households').limit(1).get()
    if (snap.empty) throw new Error('No households found in Firestore.')
    household = { id: snap.docs[0].id, ...snap.docs[0].data() }
  }

  // Membership is derived from Patient.householdId (single source of
  // truth). Patients live in the primary caregiver's nested collection.
  const ownerForPatients = household.primaryCaregiverId ?? household.createdBy
  const patients: PatientView[] = []
  const memberSnap = await db
    .collection('users').doc(ownerForPatients)
    .collection('patients')
    .where('householdId', '==', household.id)
    .get()
  for (const d of memberSnap.docs) {
    const data = d.data()
    patients.push({
      id: d.id,
      name: data.name ?? 'Unknown',
      type: data.type ?? 'human',
      dateOfBirth: data.dateOfBirth,
      species: data.species,
      status: 'active',
      lifeStage: data.lifeStage,
    })
  }

  // Inventory — owned by household primary caregiver (legacy: userId field)
  const ownerId = household.primaryCaregiverId ?? household.createdBy
  const inventorySnap = await db
    .collection('shopping_items')
    .where('userId', '==', ownerId)
    .limit(500)
    .get()
  const inventory: InventoryView[] = inventorySnap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        productName: data.productName ?? 'Unknown',
        brand: data.brand,
        qty: data.quantity ?? 0,
        unit: data.unit,
        category: data.category,
        packTier: data.packTier,
        packQuantity: data.packQuantity,
      }
    })
    .filter((i) => i.qty >= 0)

  // Recipes — same owner
  const recipes: RecipeView[] = []
  try {
    const recipesSnap = await db
      .collection('recipes')
      .where('userId', '==', ownerId)
      .limit(200)
      .get()
    for (const d of recipesSnap.docs) {
      const data = d.data()
      const ingredientList: any[] = data.ingredients ?? []
      recipes.push({
        id: d.id,
        name: data.name ?? 'Recipe',
        mealType: data.mealType,
        ingredients: ingredientList.map((ing: any) =>
          typeof ing === 'string' ? { name: ing } : { name: ing.name ?? 'ingredient', itemId: ing.itemId },
        ),
      })
    }
  } catch {
    // Recipes are optional — if the collection structure differs, fall back to empty
  }

  // Household duties
  const duties: FamilyState['duties'] = new Map()
  try {
    const dutiesSnap = await db
      .collection('household_duties')
      .where('householdId', '==', household.id)
      .where('isActive', '==', true)
      .limit(100)
      .get()
    for (const d of dutiesSnap.docs) {
      const data = d.data()
      duties.set(d.id, {
        id: d.id,
        name: data.name ?? 'Duty',
        category: data.category ?? 'custom',
        frequency: data.frequency ?? 'weekly',
        assignedTo: data.assignedTo ?? [],
        nextDueAt: data.nextDueDate ?? new Date().toISOString(),
      })
    }
  } catch {
    // Optional
  }

  // Medications — read per patient subcollection from owner's tree
  const medications: FamilyState['medications'] = new Map()
  for (const p of patients) {
    try {
      const medSnap = await db
        .collection('users')
        .doc(ownerId)
        .collection('patients')
        .doc(p.id)
        .collection('medications')
        .limit(50)
        .get()
      for (const d of medSnap.docs) {
        const data = d.data()
        medications.set(d.id, {
          id: d.id,
          patientId: p.id,
          name: data.name ?? 'Medication',
          quantityRemaining: data.quantityRemaining ?? data.quantity ?? 30,
          doseSchedule: (data.frequency ?? '').toLowerCase().includes('twice') ? 'twice-daily' : 'daily',
        })
      }
    } catch {
      // Subcollection might not exist for this patient
    }
  }

  return { household, patients, inventory, recipes, duties, medications }
}

// ============================================================================
// BOOTSTRAP STATE
// ============================================================================

function bootstrap(
  read: Awaited<ReturnType<typeof readSubstrate>>,
  startClock: Date,
): FamilyState {
  const state: FamilyState = {
    householdId: read.household.id,
    householdName: read.household.name ?? 'Household',
    primaryCaregiverId: read.household.primaryCaregiverId ?? read.household.createdBy,
    members: new Map(),
    inventory: new Map(),
    shoppingList: new Map(),
    vitalsHistory: new Map(),
    appointments: [],
    duties: read.duties,
    medications: read.medications,
    invitations: [],
    caregivers: new Set(read.household.additionalCaregiverIds ?? []),
    recipes: read.recipes,
    clock: startClock,
  }
  if (state.primaryCaregiverId) state.caregivers.add(state.primaryCaregiverId)
  for (const p of read.patients) state.members.set(p.id, p)
  for (const inv of read.inventory) state.inventory.set(inv.id, inv)
  return state
}

// ============================================================================
// EVENT BUILDER
// ============================================================================

function makeEvent(
  state: FamilyState,
  type: EventType,
  causedBy: string | null,
  ts: Date,
  actor: SimEvent['actor'],
  subject: SimEvent['subject'],
  cause: string,
  payload: Record<string, unknown> = {},
): SimEvent {
  return {
    id: `evt_${randomUUID().slice(0, 8)}`,
    causedBy,
    ts: ts.toISOString(),
    type,
    actor,
    subject,
    cause,
    payload,
  }
}

// Resolve actor for a given subject (patient). Adults self-act, children
// + pets get a caregiver. Falls back to primary caregiver.
function resolveActor(
  state: FamilyState,
  subjectPatientId: string,
): SimEvent['actor'] {
  const p = state.members.get(subjectPatientId)
  if (!p) return { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' }
  const elig = getEaterEligibility({ type: p.type, dateOfBirth: p.dateOfBirth })
  if (elig.canBeActor) {
    return { id: p.id, name: p.name, role: 'self' }
  }
  // Caregiver acts — pick primary caregiver (we could pick from caregivers Set)
  return { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' }
}

// ============================================================================
// EVENT QUEUE (priority by ts)
// ============================================================================

class EventQueue {
  private items: SimEvent[] = []
  push(e: SimEvent) {
    this.items.push(e)
    // Maintain sorted order (small N, simple insertion)
    this.items.sort((a, b) => a.ts.localeCompare(b.ts))
  }
  pop(): SimEvent | undefined {
    return this.items.shift()
  }
  size() {
    return this.items.length
  }
}

// ============================================================================
// EVENT APPLICATION (cause-and-effect engine)
// ============================================================================

const LOW_STOCK_THRESHOLD = 1

function applyEvent(state: FamilyState, evt: SimEvent, rng: () => number): SimEvent[] {
  const caused: SimEvent[] = []

  switch (evt.type) {
    case 'meal_log': {
      const patientId = evt.subject.patientId!
      const recipe = (evt.payload.recipe as RecipeView | undefined) ?? null
      const ingredients = recipe?.ingredients ?? []
      // Generate consume events for ~2-4 ingredients
      const useIngredients = ingredients.slice(0, Math.min(4, ingredients.length))
      for (const ing of useIngredients) {
        // Try to find the inventory item by ingredient name (loose match)
        const inv = matchInventoryToIngredient(state, ing.name)
        if (!inv) continue
        const consumeQty = 1
        const consumeAt = new Date(new Date(evt.ts).getTime() + 1000 * 60) // 1 min later
        caused.push(
          makeEvent(
            state,
            'consume',
            evt.id,
            consumeAt,
            evt.actor,
            { patientId, itemId: inv.id, name: inv.productName },
            `${recipe?.name ?? 'meal'} → consumed ${consumeQty} ${inv.productName}`,
            { itemId: inv.id, delta: -consumeQty, beforeQty: inv.qty },
          ),
        )
      }
      // Also flag this in vitals trend? No, vitals are independent.
      return caused
    }

    case 'consume': {
      const itemId = evt.payload.itemId as string
      const delta = evt.payload.delta as number
      const inv = state.inventory.get(itemId)
      if (!inv) return caused
      inv.qty = Math.max(0, inv.qty + delta) // clamp at 0; negative is a gap signal
      inv.lastConsumedAt = evt.ts
      // Record post-state on the event so the gap detector can verify
      ;(evt.payload as any).afterQty = inv.qty
      // If we hit threshold, emit a low_stock event
      if (inv.qty <= LOW_STOCK_THRESHOLD && !state.shoppingList.has(itemId)) {
        const lowAt = new Date(new Date(evt.ts).getTime() + 1000 * 60)
        caused.push(
          makeEvent(
            state,
            'low_stock',
            evt.id,
            lowAt,
            { id: 'system', name: 'system', role: 'system' },
            { itemId, name: inv.productName },
            `consume dropped ${inv.productName} to ${inv.qty} → flagged low-stock`,
            { itemId, qtyAfter: inv.qty },
          ),
        )
      }
      return caused
    }

    case 'low_stock': {
      const itemId = evt.payload.itemId as string
      state.shoppingList.set(itemId, { needed: true, lastFlaggedAt: evt.ts })
      return caused
    }

    case 'shopping_trip': {
      // For each item on the shopping list, emit a purchase event a few minutes later
      let offset = 0
      for (const [itemId] of state.shoppingList) {
        offset += 2
        const at = new Date(new Date(evt.ts).getTime() + offset * 60 * 1000)
        const inv = state.inventory.get(itemId)
        if (!inv) continue
        caused.push(
          makeEvent(
            state,
            'purchase',
            evt.id,
            at,
            evt.actor,
            { itemId, name: inv.productName },
            `shopping trip → bought ${inv.productName}`,
            {
              itemId,
              qty: 1,
              priceCents: Math.round(between(rng, 100, 1500)),
              store: pickOne(rng, ['Costco', 'Trader Joes', 'Sprouts', 'Walmart']),
            },
          ),
        )
      }
      // Clear the list after emitting purchase events
      state.shoppingList.clear()
      return caused
    }

    case 'purchase': {
      const itemId = evt.payload.itemId as string
      const qty = evt.payload.qty as number
      const inv = state.inventory.get(itemId)
      if (!inv) return caused
      inv.qty += qty
      ;(evt.payload as any).afterQty = inv.qty
      return caused
    }

    case 'inventory_adjustment': {
      const itemId = evt.payload.itemId as string
      const delta = evt.payload.delta as number
      const inv = state.inventory.get(itemId)
      if (!inv) return caused
      inv.qty = Math.max(0, inv.qty + delta)
      ;(evt.payload as any).afterQty = inv.qty
      return caused
    }

    case 'vital_reading': {
      const patientId = evt.subject.patientId!
      const arr = state.vitalsHistory.get(patientId) ?? []
      arr.push({
        ts: evt.ts,
        type: evt.payload.vitalType as string,
        value: evt.payload.value as number,
      })
      state.vitalsHistory.set(patientId, arr)
      return caused
    }

    case 'pet_feeding': {
      // Treat like a consume of pet food
      const itemId = evt.payload.itemId as string | undefined
      if (!itemId) return caused
      const inv = state.inventory.get(itemId)
      if (!inv) return caused
      inv.qty = Math.max(0, inv.qty - 1)
      ;(evt.payload as any).afterQty = inv.qty
      if (inv.qty <= LOW_STOCK_THRESHOLD && !state.shoppingList.has(itemId)) {
        caused.push(
          makeEvent(
            state,
            'low_stock',
            evt.id,
            new Date(new Date(evt.ts).getTime() + 60_000),
            { id: 'system', name: 'system', role: 'system' },
            { itemId, name: inv.productName },
            `pet feeding dropped ${inv.productName} to ${inv.qty}`,
            { itemId, qtyAfter: inv.qty },
          ),
        )
      }
      return caused
    }

    case 'patient_added': {
      const newPatient = evt.payload.patient as PatientView
      state.members.set(newPatient.id, newPatient)
      return caused
    }

    case 'patient_removed': {
      const patientId = evt.subject.patientId!
      const p = state.members.get(patientId)
      if (p) p.status = 'deleted'
      return caused
    }

    case 'invitation_sent': {
      const id = evt.payload.invitationId as string
      state.invitations.push({
        id,
        recipientEmail: evt.payload.recipientEmail as string,
        role: evt.payload.role as string,
        status: 'pending',
        expiresAt: evt.payload.expiresAt as string,
        sentAt: evt.ts,
      })
      return caused
    }

    case 'invitation_accepted': {
      const id = evt.payload.invitationId as string
      const inv = state.invitations.find((x) => x.id === id)
      if (inv) inv.status = 'accepted'
      return caused
    }

    case 'invitation_expired': {
      const id = evt.payload.invitationId as string
      const inv = state.invitations.find((x) => x.id === id)
      if (inv) inv.status = 'expired'
      return caused
    }

    case 'caregiver_added': {
      state.caregivers.add(evt.payload.userId as string)
      return caused
    }

    case 'medication_prescribed': {
      const med = evt.payload.medication as FamilyState['medications'] extends Map<string, infer V> ? V : never
      state.medications.set(med.id, med)
      return caused
    }

    case 'medication_dose_taken': {
      const medId = evt.payload.medicationId as string
      const med = state.medications.get(medId)
      if (!med) return caused
      med.quantityRemaining = Math.max(0, med.quantityRemaining - 1)
      med.lastTaken = evt.ts
      ;(evt.payload as any).afterQty = med.quantityRemaining
      if (med.quantityRemaining <= 5) {
        const at = new Date(new Date(evt.ts).getTime() + 60 * 60 * 1000)
        caused.push(
          makeEvent(
            state,
            'medication_refill_due',
            evt.id,
            at,
            { id: 'system', name: 'system', role: 'system' },
            { patientId: med.patientId, name: med.name },
            `quantity dropped to ${med.quantityRemaining} → refill due`,
            { medicationId: medId, qtyRemaining: med.quantityRemaining },
          ),
        )
      }
      return caused
    }

    case 'medication_refill_due':
    case 'medication_dose_missed':
      return caused

    case 'medication_refilled': {
      const medId = evt.payload.medicationId as string
      const refillQty = (evt.payload.refillQty as number) ?? 30
      const med = state.medications.get(medId)
      if (!med) return caused
      med.quantityRemaining += refillQty
      ;(evt.payload as any).afterQty = med.quantityRemaining
      return caused
    }

    case 'appointment_scheduled': {
      state.appointments.push({
        id: evt.payload.appointmentId as string,
        patientId: evt.subject.patientId!,
        providerType: evt.payload.providerType as string,
        dateTime: evt.payload.dateTime as string,
        status: 'scheduled',
      })
      return caused
    }

    case 'appointment_attended':
    case 'appointment_missed':
    case 'appointment_cancelled': {
      const id = evt.payload.appointmentId as string
      const appt = state.appointments.find((a) => a.id === id)
      if (appt) {
        appt.status =
          evt.type === 'appointment_attended'
            ? 'completed'
            : evt.type === 'appointment_missed'
              ? 'no-show'
              : 'cancelled'
      }
      return caused
    }

    case 'duty_assigned': {
      const dutyId = evt.payload.dutyId as string
      const existing = state.duties.get(dutyId)
      if (existing) {
        existing.assignedTo = (evt.payload.assignedTo as string[]) ?? existing.assignedTo
      }
      return caused
    }

    case 'duty_completed': {
      const dutyId = evt.payload.dutyId as string
      const duty = state.duties.get(dutyId)
      if (duty) duty.lastCompletedAt = evt.ts
      return caused
    }
  }

  return caused
}

// Loose ingredient → inventory match. Real platform has an ingredient-to-product
// resolver; for sim purposes a substring match is fine.
function matchInventoryToIngredient(state: FamilyState, ingredientName: string): InventoryView | null {
  const needle = ingredientName.toLowerCase().trim()
  if (!needle) return null
  // Direct match by id (if recipe stored itemId)
  for (const inv of state.inventory.values()) {
    const name = inv.productName.toLowerCase()
    if (name.includes(needle) || needle.includes(name)) return inv
  }
  return null
}

// ============================================================================
// SCENARIO LIBRARY (event seeders)
// ============================================================================

interface ScenarioContext {
  state: FamilyState
  rng: () => number
  startClock: Date
  endClock: Date
  queue: EventQueue
}

const scenarios: Record<ScenarioId, (ctx: ScenarioContext) => void> = {
  baseline: (ctx) => {
    const { state, queue, startClock, endClock, rng } = ctx
    const eligibleEaters = Array.from(state.members.values()).filter((m) => m.type === 'human' && m.status === 'active')
    const pets = Array.from(state.members.values()).filter((m) => m.type === 'pet' && m.status === 'active')

    // Walk each day
    for (let d = new Date(startClock); d < endClock; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
      // 3 meals per day per eater
      for (const eater of eligibleEaters) {
        for (const slot of [
          { name: 'breakfast', hour: 7 + rng() * 2 },
          { name: 'lunch', hour: 12 + rng() },
          { name: 'dinner', hour: 18 + rng() * 2 },
        ]) {
          const ts = new Date(d)
          ts.setHours(Math.floor(slot.hour), Math.floor((slot.hour % 1) * 60), 0, 0)
          if (ts < startClock || ts > endClock) continue
          const recipe = state.recipes.length > 0 ? pickOne(rng, state.recipes) : null
          const actor = resolveActor(state, eater.id)
          queue.push(
            makeEvent(
              state,
              'meal_log',
              null,
              ts,
              actor,
              { patientId: eater.id, name: eater.name },
              `${slot.name}: ${recipe?.name ?? 'home meal'}`,
              { mealType: slot.name, recipe, recipeId: recipe?.id },
            ),
          )
        }
      }

      // Pet feedings — twice daily, caregiver-acted
      for (const pet of pets) {
        for (const slot of [{ name: 'morning', hour: 7 }, { name: 'evening', hour: 18 }]) {
          const ts = new Date(d)
          ts.setHours(slot.hour, 0, 0, 0)
          const petFood = Array.from(state.inventory.values()).find((i) =>
            (i.category ?? '').includes('pet') || (i.productName ?? '').toLowerCase().includes('pet'),
          )
          queue.push(
            makeEvent(
              state,
              'pet_feeding',
              null,
              ts,
              { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
              { patientId: pet.id, name: pet.name, itemId: petFood?.id },
              `${slot.name} pet feeding for ${pet.name}`,
              { itemId: petFood?.id },
            ),
          )
        }
      }

      // Daily weight reading for first eligible adult
      const primary = eligibleEaters[0]
      if (primary) {
        const ts = new Date(d)
        ts.setHours(7, 30, 0, 0)
        queue.push(
          makeEvent(
            state,
            'vital_reading',
            null,
            ts,
            resolveActor(state, primary.id),
            { patientId: primary.id, name: primary.name },
            'morning weight',
            { vitalType: 'weight', value: Math.round(between(rng, 150, 175) * 10) / 10, unit: 'lb' },
          ),
        )
      }

      // Weekly shopping trip (Saturday)
      if (d.getUTCDay() === 6) {
        const ts = new Date(d)
        ts.setHours(10, 0, 0, 0)
        queue.push(
          makeEvent(
            state,
            'shopping_trip',
            null,
            ts,
            { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
            {},
            `weekly shopping run`,
            {},
          ),
        )
      }

      // Occasional inventory adjustment (1-in-3 days)
      if (rng() < 0.33) {
        const target = pickOne(rng, Array.from(state.inventory.values()))
        if (target && target.qty > 0) {
          const ts = new Date(d)
          ts.setHours(20, 0, 0, 0)
          const reason = pickOne(rng, ['expired', 'count', 'discarded'])
          queue.push(
            makeEvent(
              state,
              'inventory_adjustment',
              null,
              ts,
              { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
              { itemId: target.id, name: target.productName },
              `${reason}: ${target.productName}`,
              { itemId: target.id, delta: -1, reason },
            ),
          )
        }
      }
    }

    // Daily duty completions — for each active duty, complete it on its day cadence
    for (const duty of state.duties.values()) {
      let stride: number
      switch (duty.frequency) {
        case 'daily': stride = 1; break
        case 'weekly': stride = 7; break
        case 'biweekly': stride = 14; break
        default: stride = 7
      }
      for (let d = new Date(startClock); d < endClock; d = new Date(d.getTime() + stride * 24 * 60 * 60 * 1000)) {
        const ts = new Date(d)
        ts.setHours(11 + Math.floor(rng() * 8), 0, 0, 0)
        const assignee = duty.assignedTo[0] ?? state.primaryCaregiverId
        queue.push(
          makeEvent(
            state,
            'duty_completed',
            null,
            ts,
            { id: assignee, name: 'Caregiver', role: 'caregiver' },
            {},
            `${duty.name} done`,
            { dutyId: duty.id, dutyName: duty.name, category: duty.category },
          ),
        )
      }
    }
  },

  'new-baby': (ctx) => {
    const { state, queue, startClock, rng } = ctx
    // Add a newborn on day 2
    const arrivalTs = new Date(startClock.getTime() + 2 * 24 * 60 * 60 * 1000)
    arrivalTs.setHours(9, 0, 0, 0)
    const newbornId = `sim_newborn_${randomUUID().slice(0, 6)}`
    const newborn: PatientView = {
      id: newbornId,
      name: 'Baby',
      type: 'human',
      dateOfBirth: arrivalTs.toISOString(),
      lifeStage: 'newborn',
      status: 'active',
    }
    queue.push(
      makeEvent(
        state,
        'patient_added',
        null,
        arrivalTs,
        { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
        { patientId: newbornId, name: 'Baby' },
        'new baby added to household',
        { patient: newborn },
      ),
    )
    // First pediatric appointment scheduled 1 hour later
    const apptScheduledAt = new Date(arrivalTs.getTime() + 60 * 60 * 1000)
    const apptDateTime = new Date(arrivalTs.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days out
    const apptId = `sim_appt_${randomUUID().slice(0, 6)}`
    queue.push(
      makeEvent(
        state,
        'appointment_scheduled',
        null,
        apptScheduledAt,
        { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
        { patientId: newbornId, name: 'Baby' },
        'pediatric well-baby visit scheduled',
        {
          appointmentId: apptId,
          providerType: 'pediatrician',
          providerName: 'Dr. Pediatric',
          dateTime: apptDateTime.toISOString(),
        },
      ),
    )
    // Appointment attended (or missed 10% of the time)
    const attendedTs = apptDateTime
    const attended = rng() > 0.1
    queue.push(
      makeEvent(
        state,
        attended ? 'appointment_attended' : 'appointment_missed',
        null,
        attendedTs,
        { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
        { patientId: newbornId, name: 'Baby' },
        attended ? 'pediatric appointment attended' : 'pediatric appointment missed',
        { appointmentId: apptId },
      ),
    )
  },

  'caregiver-invite': (ctx) => {
    const { state, queue, startClock, rng } = ctx
    const sentTs = new Date(startClock.getTime() + 1 * 24 * 60 * 60 * 1000)
    sentTs.setHours(11, 0, 0, 0)
    const invitationId = `sim_inv_${randomUUID().slice(0, 6)}`
    const expiresAt = new Date(sentTs.getTime() + 7 * 24 * 60 * 60 * 1000)
    queue.push(
      makeEvent(
        state,
        'invitation_sent',
        null,
        sentTs,
        { id: state.primaryCaregiverId, name: 'Owner', role: 'caregiver' },
        {},
        'invited new caregiver',
        {
          invitationId,
          recipientEmail: 'caregiver@example.com',
          role: 'caregiver',
          expiresAt: expiresAt.toISOString(),
        },
      ),
    )
    // Accept 1-3 days later (or expire 10% of the time)
    const willAccept = rng() > 0.1
    if (willAccept) {
      const acceptTs = new Date(sentTs.getTime() + (1 + rng() * 2) * 24 * 60 * 60 * 1000)
      const newCgId = `sim_cg_${randomUUID().slice(0, 6)}`
      queue.push(
        makeEvent(
          state,
          'invitation_accepted',
          null,
          acceptTs,
          { id: newCgId, name: 'New Caregiver', role: 'caregiver' },
          {},
          'caregiver accepted invitation',
          { invitationId },
        ),
      )
      // Caregiver added to household
      queue.push(
        makeEvent(
          state,
          'caregiver_added',
          null,
          new Date(acceptTs.getTime() + 60_000),
          { id: 'system', name: 'system', role: 'system' },
          {},
          'caregiver permissions granted',
          { userId: newCgId, invitationId },
        ),
      )
    } else {
      queue.push(
        makeEvent(
          state,
          'invitation_expired',
          null,
          expiresAt,
          { id: 'system', name: 'system', role: 'system' },
          {},
          'invitation expired without acceptance',
          { invitationId },
        ),
      )
    }
  },

  'add-member': (ctx) => {
    const { state, queue, startClock } = ctx
    const ts = new Date(startClock.getTime() + 3 * 24 * 60 * 60 * 1000)
    const newPatientId = `sim_member_${randomUUID().slice(0, 6)}`
    const dob = new Date(startClock.getFullYear() - 25, startClock.getMonth(), startClock.getDate()).toISOString()
    const newMember: PatientView = {
      id: newPatientId,
      name: 'New Adult',
      type: 'human',
      dateOfBirth: dob,
      lifeStage: 'adult',
      status: 'active',
    }
    queue.push(
      makeEvent(
        state,
        'patient_added',
        null,
        ts,
        { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
        { patientId: newPatientId, name: 'New Adult' },
        'adult member added to household',
        { patient: newMember },
      ),
    )
  },

  'remove-member': (ctx) => {
    const { state, queue, endClock } = ctx
    const eligible = Array.from(state.members.values()).filter((m) => m.type === 'human' && m.id !== state.primaryCaregiverId)
    if (eligible.length === 0) return
    const target = eligible[eligible.length - 1]
    const ts = new Date(endClock.getTime() - 24 * 60 * 60 * 1000)
    ts.setHours(15, 0, 0, 0)
    ctx.queue.push(
      makeEvent(
        state,
        'patient_removed',
        null,
        ts,
        { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
        { patientId: target.id, name: target.name },
        `${target.name} removed from household (soft-delete)`,
        { patientId: target.id },
      ),
    )
  },

  'medication-regimen': (ctx) => {
    const { state, queue, startClock, endClock, rng } = ctx
    const adult = Array.from(state.members.values()).find(
      (m) => m.type === 'human' && getEaterEligibility({ type: m.type, dateOfBirth: m.dateOfBirth }).canBeActor,
    )
    if (!adult) return
    const medId = `sim_med_${randomUUID().slice(0, 6)}`
    const startTs = new Date(startClock.getTime() + 60 * 60 * 1000)
    const med = {
      id: medId,
      patientId: adult.id,
      name: 'Lisinopril 10mg',
      quantityRemaining: 30,
      doseSchedule: 'daily' as const,
    }
    queue.push(
      makeEvent(
        state,
        'medication_prescribed',
        null,
        startTs,
        { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
        { patientId: adult.id, name: adult.name },
        `${med.name} prescribed`,
        { medication: med, medicationId: medId },
      ),
    )
    // Daily dose at 8am
    for (let d = new Date(startTs); d < endClock; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
      const ts = new Date(d)
      ts.setHours(8, 0, 0, 0)
      // 5% miss rate
      const missed = rng() < 0.05
      queue.push(
        makeEvent(
          state,
          missed ? 'medication_dose_missed' : 'medication_dose_taken',
          null,
          ts,
          resolveActor(state, adult.id),
          { patientId: adult.id, name: adult.name },
          missed ? `${med.name} dose MISSED` : `${med.name} taken`,
          { medicationId: medId },
        ),
      )
    }
    // Refill at day 25
    const refillTs = new Date(startTs.getTime() + 25 * 24 * 60 * 60 * 1000)
    if (refillTs < endClock) {
      queue.push(
        makeEvent(
          state,
          'medication_refilled',
          null,
          refillTs,
          { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
          { patientId: adult.id, name: adult.name },
          `${med.name} refilled`,
          { medicationId: medId, refillQty: 30 },
        ),
      )
    }
  },

  'appointment-cycle': (ctx) => {
    const { state, queue, startClock, endClock, rng } = ctx
    const providers: Array<[string, string]> = [
      ['physician', 'Dr. GP'],
      ['dentist', 'Dr. Dentist'],
      ['specialist', 'Dr. Cardiologist'],
      ['lab', 'LabCorp'],
    ]
    const adults = Array.from(state.members.values()).filter(
      (m) => m.type === 'human' && getEaterEligibility({ type: m.type, dateOfBirth: m.dateOfBirth }).canBeActor,
    )
    if (adults.length === 0) return
    // 1 appointment every ~5 days
    let day = 1
    while (day < (endClock.getTime() - startClock.getTime()) / (24 * 60 * 60 * 1000)) {
      const scheduledAt = new Date(startClock.getTime() + day * 24 * 60 * 60 * 1000)
      scheduledAt.setHours(10, 0, 0, 0)
      const apptDateTime = new Date(scheduledAt.getTime() + 3 * 24 * 60 * 60 * 1000)
      if (apptDateTime > endClock) break
      const apptId = `sim_appt_${randomUUID().slice(0, 6)}`
      const [provType, provName] = pickOne(rng, providers)
      const subject = pickOne(rng, adults)
      queue.push(
        makeEvent(
          state,
          'appointment_scheduled',
          null,
          scheduledAt,
          { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
          { patientId: subject.id, name: subject.name },
          `${provName} appointment scheduled`,
          {
            appointmentId: apptId,
            providerType: provType,
            providerName: provName,
            dateTime: apptDateTime.toISOString(),
          },
        ),
      )
      const attended = rng() > 0.15
      queue.push(
        makeEvent(
          state,
          attended ? 'appointment_attended' : 'appointment_missed',
          null,
          apptDateTime,
          { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
          { patientId: subject.id, name: subject.name },
          attended ? `${provName} attended` : `${provName} missed`,
          { appointmentId: apptId },
        ),
      )
      day += 5
    }
  },

  'pet-care': (ctx) => {
    // Pet feedings already covered in baseline. Add a vet visit.
    const { state, queue, startClock } = ctx
    const pet = Array.from(state.members.values()).find((m) => m.type === 'pet' && m.status === 'active')
    if (!pet) return
    const ts = new Date(startClock.getTime() + 4 * 24 * 60 * 60 * 1000)
    ts.setHours(14, 0, 0, 0)
    const apptId = `sim_appt_${randomUUID().slice(0, 6)}`
    queue.push(
      makeEvent(
        state,
        'appointment_scheduled',
        null,
        ts,
        { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
        { patientId: pet.id, name: pet.name },
        'vet visit scheduled',
        {
          appointmentId: apptId,
          providerType: 'veterinarian',
          providerName: 'City Animal Hospital',
          dateTime: new Date(ts.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ),
    )
  },

  'household-duties-cycle': (ctx) => {
    // Duty completions already in baseline. Add an "assigned" event for any
    // un-assigned active duties so the assignment flow is in the log.
    const { state, queue, startClock } = ctx
    const ts = new Date(startClock.getTime() + 60 * 60 * 1000)
    let n = 0
    for (const duty of state.duties.values()) {
      if (duty.assignedTo.length === 0) {
        queue.push(
          makeEvent(
            state,
            'duty_assigned',
            null,
            new Date(ts.getTime() + n * 60_000),
            { id: state.primaryCaregiverId, name: 'Caregiver', role: 'caregiver' },
            {},
            `${duty.name} assigned`,
            { dutyId: duty.id, dutyName: duty.name, assignedTo: [state.primaryCaregiverId] },
          ),
        )
        n++
      }
    }
  },
}

// ============================================================================
// MAIN LOOP
// ============================================================================

const MAX_SLEEP_MS = 5_000

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, Math.max(0, ms)))
}

async function runSimulation(args: ReturnType<typeof parseArgs>): Promise<void> {
  console.log(`[sim] reading household ${args.household ?? '(auto)'}…`)
  const read = await readSubstrate(args.household)
  console.log(
    `[sim] household="${read.household.name ?? read.household.id}" patients=${read.patients.length} inventory=${read.inventory.length} recipes=${read.recipes.length} duties=${read.duties.size} meds=${read.medications.size}`,
  )

  const startClock = new Date()
  const endClock = new Date(startClock.getTime() + args.days * 24 * 60 * 60 * 1000)
  const state = bootstrap(read, startClock)
  const seed = args.seed ?? `${state.householdId}-${args.days}-${args.scenarios.join(',')}`
  const rng = makeRng(seed)
  const queue = new EventQueue()

  console.log(`[sim] scenarios=${args.scenarios.join(',')} days=${args.days} speed=${args.speed}x`)
  for (const id of args.scenarios) {
    const seeder = scenarios[id]
    if (!seeder) {
      console.warn(`[sim] unknown scenario "${id}" — skipped`)
      continue
    }
    seeder({ state, rng, startClock, endClock, queue })
  }
  console.log(`[sim] queued ${queue.size()} initial events`)

  // Output prep
  fs.mkdirSync(path.dirname(args.output), { recursive: true })
  const logStream = fs.createWriteStream(args.output, { flags: 'w' })
  const allEvents: SimEvent[] = []

  let lastTs: Date = startClock
  while (queue.size() > 0) {
    const evt = queue.pop()!
    const eventTs = new Date(evt.ts)
    if (eventTs > endClock) break
    const gapSimMs = eventTs.getTime() - lastTs.getTime()
    if (gapSimMs > 0) {
      const realDelay = Math.min(MAX_SLEEP_MS, gapSimMs / args.speed)
      await sleep(realDelay)
    }
    state.clock = eventTs
    lastTs = eventTs

    const caused = applyEvent(state, evt, rng)
    logStream.write(JSON.stringify(evt) + '\n')
    allEvents.push(evt)
    for (const c of caused) queue.push(c)
  }
  logStream.end()
  console.log(`[sim] wrote ${allEvents.length} events to ${args.output}`)

  // Summary + gaps
  writeSummary(args.output, state, allEvents, startClock, endClock)
  writeGaps(args.output, state, allEvents)
  console.log(`[sim] summary: ${args.output}.summary.md`)
  console.log(`[sim] gaps:    ${args.output}.gaps.md`)
}

// ============================================================================
// SUMMARY WRITER
// ============================================================================

function writeSummary(
  outputPath: string,
  state: FamilyState,
  events: SimEvent[],
  startClock: Date,
  endClock: Date,
) {
  const lines: string[] = []
  lines.push(`# Family simulation summary`)
  lines.push('')
  lines.push(`Household: **${state.householdName}**  `)
  lines.push(`Window: ${startClock.toISOString()} → ${endClock.toISOString()}  `)
  lines.push(`Total events: **${events.length}**`)
  lines.push('')

  // Totals by type
  const byType = new Map<string, number>()
  for (const e of events) byType.set(e.type, (byType.get(e.type) ?? 0) + 1)
  lines.push('## Events by type')
  lines.push('')
  lines.push('| Type | Count |')
  lines.push('|---|---:|')
  const sorted = [...byType.entries()].sort((a, b) => b[1] - a[1])
  for (const [t, n] of sorted) lines.push(`| \`${t}\` | ${n} |`)
  lines.push('')

  // Day-by-day
  lines.push('## Day-by-day')
  lines.push('')
  const days = new Map<string, SimEvent[]>()
  for (const e of events) {
    const day = e.ts.slice(0, 10)
    if (!days.has(day)) days.set(day, [])
    days.get(day)!.push(e)
  }
  for (const [day, dayEvents] of [...days.entries()].sort()) {
    lines.push(`### ${day}`)
    const dayCounts = new Map<string, number>()
    for (const e of dayEvents) dayCounts.set(e.type, (dayCounts.get(e.type) ?? 0) + 1)
    const summary = [...dayCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t}=${n}`)
      .join(' · ')
    lines.push(`${summary}`)
    lines.push('')
  }

  // Final inventory snapshot
  lines.push('## Final inventory snapshot')
  lines.push('')
  lines.push('| Item | Qty | Unit |')
  lines.push('|---|---:|---|')
  const invSorted = [...state.inventory.values()].sort((a, b) => a.qty - b.qty)
  for (const inv of invSorted.slice(0, 30)) {
    lines.push(`| ${inv.productName} | ${inv.qty} | ${inv.unit ?? ''} |`)
  }
  lines.push('')

  fs.writeFileSync(`${outputPath}.summary.md`, lines.join('\n'))
}

// ============================================================================
// GAP DETECTORS
// ============================================================================

function writeGaps(outputPath: string, state: FamilyState, events: SimEvent[]) {
  const lines: string[] = []
  lines.push('# Simulation gap report')
  lines.push('')
  lines.push('Each finding is one of: a real platform bug, a simulation refinement, or a data quality issue. Triage accordingly.')
  lines.push('')

  const byId = new Map(events.map((e) => [e.id, e]))

  // 1. Stuck low_stock — fired but never followed by a purchase for that item
  const lowStockByItem = new Map<string, SimEvent>()
  for (const e of events) if (e.type === 'low_stock') lowStockByItem.set(e.payload.itemId as string, e)
  const purchasesByItem = new Set<string>()
  for (const e of events) if (e.type === 'purchase') purchasesByItem.add(e.payload.itemId as string)
  const stuckLow: SimEvent[] = []
  for (const [itemId, ev] of lowStockByItem) if (!purchasesByItem.has(itemId)) stuckLow.push(ev)

  // 2. Negative inventory — any event with afterQty < 0 (we clamp at 0 in apply,
  //    so this catches the consume that *would* have gone negative).
  const wouldBeNegative: SimEvent[] = []
  for (const e of events) {
    if (e.type !== 'consume') continue
    const before = (e.payload.beforeQty as number) ?? 0
    const delta = (e.payload.delta as number) ?? 0
    if (before + delta < 0) wouldBeNegative.push(e)
  }

  // 3. Eligibility violation — meal_log for a pet or under-16 has actor.role==='self'
  const eligibilityViolations: SimEvent[] = []
  for (const e of events) {
    if (e.type !== 'meal_log' && e.type !== 'pet_feeding') continue
    const subject = state.members.get(e.subject.patientId ?? '')
    if (!subject) continue
    const elig = getEaterEligibility({ type: subject.type, dateOfBirth: subject.dateOfBirth })
    if (!elig.canBeActor && e.actor.role === 'self') eligibilityViolations.push(e)
  }

  // 4. Pet acted as self
  const petActedAsSelf: SimEvent[] = []
  for (const e of events) {
    const subject = state.members.get(e.subject.patientId ?? '')
    if (subject?.type === 'pet' && e.actor.id === subject.id) petActedAsSelf.push(e)
  }

  // 5. Stuck invitation
  const stuckInvitations: SimEvent[] = []
  const invitationStatus = new Map<string, 'pending' | 'accepted' | 'expired'>()
  for (const e of events) {
    if (e.type === 'invitation_sent') invitationStatus.set(e.payload.invitationId as string, 'pending')
    if (e.type === 'invitation_accepted') invitationStatus.set(e.payload.invitationId as string, 'accepted')
    if (e.type === 'invitation_expired') invitationStatus.set(e.payload.invitationId as string, 'expired')
  }
  for (const [id, status] of invitationStatus) {
    if (status === 'pending') {
      const sentEvt = events.find((e) => e.type === 'invitation_sent' && e.payload.invitationId === id)
      if (sentEvt) stuckInvitations.push(sentEvt)
    }
  }

  // 6. Orphan appointment
  const apptStatus = new Map<string, 'scheduled' | 'completed' | 'no-show' | 'cancelled'>()
  for (const e of events) {
    if (e.type === 'appointment_scheduled') apptStatus.set(e.payload.appointmentId as string, 'scheduled')
    if (e.type === 'appointment_attended') apptStatus.set(e.payload.appointmentId as string, 'completed')
    if (e.type === 'appointment_missed') apptStatus.set(e.payload.appointmentId as string, 'no-show')
    if (e.type === 'appointment_cancelled') apptStatus.set(e.payload.appointmentId as string, 'cancelled')
  }
  const orphanAppts: SimEvent[] = []
  for (const [id, status] of apptStatus) {
    if (status === 'scheduled') {
      const evt = events.find((e) => e.type === 'appointment_scheduled' && e.payload.appointmentId === id)
      if (evt) orphanAppts.push(evt)
    }
  }

  // 7. Missing dose adherence — adherence rate <70%
  const medDoses = new Map<string, { taken: number; missed: number }>()
  for (const e of events) {
    if (e.type === 'medication_dose_taken') {
      const m = e.payload.medicationId as string
      const v = medDoses.get(m) ?? { taken: 0, missed: 0 }
      v.taken++
      medDoses.set(m, v)
    }
    if (e.type === 'medication_dose_missed') {
      const m = e.payload.medicationId as string
      const v = medDoses.get(m) ?? { taken: 0, missed: 0 }
      v.missed++
      medDoses.set(m, v)
    }
  }
  const lowAdherence: Array<{ medicationId: string; rate: number }> = []
  for (const [m, v] of medDoses) {
    const total = v.taken + v.missed
    const rate = total === 0 ? 0 : v.taken / total
    if (total >= 5 && rate < 0.7) lowAdherence.push({ medicationId: m, rate })
  }

  // 8. Orphan member — added but no further events
  const addedPatients = new Set<string>()
  for (const e of events) if (e.type === 'patient_added') addedPatients.add((e.payload.patient as PatientView).id)
  const eventedPatients = new Set<string>()
  for (const e of events) if (e.subject.patientId) eventedPatients.add(e.subject.patientId)
  const orphanMembers: string[] = []
  for (const id of addedPatients) {
    const evtCount = events.filter((e) => e.subject.patientId === id).length
    // 1 = the patient_added itself; anything ≤1 is orphan
    if (evtCount <= 1) orphanMembers.push(id)
  }

  // 9. Caregiver-acted but not in caregivers set
  const ghostCaregivers: SimEvent[] = []
  for (const e of events) {
    if (e.actor.role === 'caregiver' && e.actor.id !== 'system' && !state.caregivers.has(e.actor.id)) {
      ghostCaregivers.push(e)
    }
  }

  // === Render ===
  const section = (title: string, hits: any[], renderRow: (h: any) => string) => {
    lines.push(`## ${title} — ${hits.length}`)
    lines.push('')
    if (hits.length === 0) {
      lines.push('_clean_')
      lines.push('')
      return
    }
    for (const h of hits.slice(0, 10)) lines.push(`- ${renderRow(h)}`)
    if (hits.length > 10) lines.push(`- _… and ${hits.length - 10} more_`)
    lines.push('')
  }

  section('Stuck low-stock (flagged but never purchased)', stuckLow, (e) =>
    `\`${e.payload.itemId}\` ${e.subject.name ?? ''} — flagged at ${e.ts} (event \`${e.id}\`)`,
  )
  section('Would-go-negative inventory (consume math)', wouldBeNegative, (e) =>
    `\`${e.payload.itemId}\` before=${e.payload.beforeQty} delta=${e.payload.delta} (event \`${e.id}\`)`,
  )
  section('Eligibility violations', eligibilityViolations, (e) =>
    `${e.subject.name} acted as self on ${e.type} (event \`${e.id}\`)`,
  )
  section('Pet acted as self', petActedAsSelf, (e) =>
    `${e.subject.name} (pet) was the actor on ${e.type} (event \`${e.id}\`)`,
  )
  section('Stuck invitations (pending past expiry)', stuckInvitations, (e) =>
    `invitation \`${e.payload.invitationId}\` to ${e.payload.recipientEmail} sent at ${e.ts}`,
  )
  section('Orphan appointments (still scheduled at end of run)', orphanAppts, (e) =>
    `\`${e.payload.appointmentId}\` ${e.payload.providerName} for ${e.subject.name} at ${e.payload.dateTime}`,
  )
  section('Low medication adherence (<70%)', lowAdherence, (h) =>
    `medication \`${h.medicationId}\` adherence ${(h.rate * 100).toFixed(0)}%`,
  )
  section('Orphan members (added but no follow-up events)', orphanMembers, (id) => `patient \`${id}\``)
  section('Ghost caregivers (acting without a permission grant)', ghostCaregivers, (e) =>
    `actor \`${e.actor.id}\` on ${e.type} at ${e.ts} (event \`${e.id}\`)`,
  )

  lines.push('---')
  lines.push('')
  lines.push('Each finding cites its event id(s). Trace back through the JSONL log:')
  lines.push('')
  lines.push('```sh')
  lines.push(`grep '"id":"<event-id>"' ${path.basename(outputPath)}`)
  lines.push('```')

  fs.writeFileSync(`${outputPath}.gaps.md`, lines.join('\n'))
}

// ============================================================================
// ENTRY POINT
// ============================================================================

;(async () => {
  try {
    const args = parseArgs()
    await runSimulation(args)
    process.exit(0)
  } catch (e) {
    console.error('[sim] FATAL', e)
    process.exit(1)
  }
})()
