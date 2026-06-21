'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { db } from '@/lib/firebase'
import {
  createSelfPatient,
  findSelfPatientId,
  updateSelfPatientName,
  deriveDisplayName,
} from '@/lib/self-patient'
import { logger } from '@/lib/logger'
import { medicalOperations } from '@/lib/medical-operations'
import { getTargetWeightSuggestion, getHealthRiskProfile } from '@/lib/health-calculations'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { FacePhotoCapture } from '@/components/family/FacePhotoCapture'
import {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingCompleted,
  identifyUser,
} from '@/lib/analytics-tracking'
import {
  UserMode,
  PrimaryRole,
  OnboardingAnswers,
  AutomationLevel,
} from '@/types'
import { capitalizeName } from '@/lib/utils'

// Import PRD config
import prdConfig from '@/docs/UNIFIED_PRD.json'

/**
 * Onboarding screen shape — narrow set of fields used by the slim
 * 3-screen flow (role / name / add_now). Identity, household, and
 * preference questions were removed in the 2026-05-24 semantic-intent
 * cut. See plans/dynamic-stirring-bunny.md for the rationale and the
 * Phase 2/3 rollout that observes-then-infers what onboarding used to
 * ask explicitly.
 */
interface OnboardingScreen {
  id: string
  question: string
  subtitle?: string
  options: string[]
  optionDescriptions?: Record<string, string>
  sets: string
  visibleIf?: string
  /** 'text' renders a single text input + Continue; 'number' is the same
   *  but with a numeric keypad (weight entry); 'height' renders paired feet +
   *  inches inputs (stored as total inches); 'goal' renders a healthy-weight
   *  suggestion (from height + current weight) above a pre-filled target
   *  input; 'options' (default) renders the option-button list with
   *  auto-advance on tap. */
  inputType?: 'options' | 'text' | 'number' | 'height' | 'goal' | 'date' | 'roster'
  /** When true, the step can be Continued with an empty value (e.g. the owner's
   *  last name — a legal-anchor nicety, not essential to start). */
  optional?: boolean
  placeholder?: string
  maxLength?: number
}

export default function OnboardingV2Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const { user } = useAuth()
  const { subscription } = useSubscription()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromInvitation = searchParams.get('from') === 'invitation'

  // Free-plan users can't add additional patients (the wizard at
  // /patients/new is gated behind the 'multiple-patients' feature),
  // so asking "Want to add someone now?" would dead-end them at an
  // upgrade wall. Skip Q3 entirely for those users; the in-context
  // "Add Family Member" CTA on /family/dashboard is the natural
  // upgrade moment instead.
  //
  // Source of truth: PLAN_FEATURES['multiple-patients'] in
  // lib/feature-gates.ts — currently family_basic / family_plus /
  // family_premium. Mirror that list here. If the gate widens later
  // (e.g. single_plus unlocks multi-patient), update both places.
  const plan = subscription?.plan
  const canAddPatients =
    plan === 'family_basic' ||
    plan === 'family_plus' ||
    plan === 'family_premium'

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPhotoCapture, setShowPhotoCapture] = useState(fromInvitation)
  // Roster draft (slice 3): the member currently being added on the roster step.
  const [rosterDraft, setRosterDraft] = useState<{ type: string; name: string; dob: string; species: string }>({
    type: '', name: '', dob: '', species: '',
  })
  const [pendingApproval, setPendingApproval] = useState(false)
  const [acceptedInvitation, setAcceptedInvitation] = useState<any>(null)
  const [onboardingStartTime, setOnboardingStartTime] = useState<number | null>(null)
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now())

  const screens = prdConfig.onboarding.screens as unknown as OnboardingScreen[]

  // Pre-fill name fields from Firebase Auth's displayName (set by
  // OAuth signups, sometimes by email/password signups). Auth gives
  // a single string ("Percy Rice") — first token seeds your_name,
  // last token seeds family_last_name when present. Only seeds the
  // fields that are currently empty; never overwrites typing.
  useEffect(() => {
    if (!user?.displayName) return
    const tokens = user.displayName.trim().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return
    setAnswers((prev) => {
      const next = { ...prev }
      if (!next.your_name && tokens[0]) next.your_name = tokens[0]
      if (!next.family_last_name && tokens.length >= 2) {
        next.family_last_name = tokens[tokens.length - 1]
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.displayName])

  // Track onboarding started on mount
  useEffect(() => {
    if (user && !onboardingStartTime && !fromInvitation) {
      setOnboardingStartTime(Date.now())
      identifyUser(user)
      trackOnboardingStarted({
        userId: user.uid,
        entryPoint: 'signup',
        currentPlan: 'free',
        hasExistingData: false,
      })
    }
  }, [user, onboardingStartTime, fromInvitation])

  // Roster (slice 3): per-subject capture. Each member carries a type, so its
  // fields + validation fork human vs pet (the "validation is a property of the
  // subject, not the step" rule). Captured into answers.roster; the write to
  // patients is the next, separately-verified step.
  function addRosterMember() {
    const d = rosterDraft
    if (!d.type || !d.name.trim()) return
    if (d.type === 'pet' && !d.species.trim()) return
    const existing: any[] = Array.isArray(answers.roster) ? answers.roster : []
    const member = {
      id: `${d.type}-${d.name.trim()}-${existing.length}`,
      type: d.type,
      name: capitalizeName(d.name.trim()),
      ...(d.type !== 'pet' && d.dob ? { dob: d.dob } : {}),
      ...(d.type === 'pet' && d.species.trim() ? { species: d.species.trim() } : {}),
    }
    setAnswers((prev) => ({
      ...prev,
      roster: [...(Array.isArray(prev.roster) ? prev.roster : []), member],
    }))
    setRosterDraft({ type: '', name: '', dob: '', species: '' })
  }

  function removeRosterMember(id: string) {
    setAnswers((prev) => ({
      ...prev,
      roster: (Array.isArray(prev.roster) ? prev.roster : []).filter((m: any) => m.id !== id),
    }))
  }

  // Visibility parser. Minimal — string-match against known forms.
  function isScreenVisible(screen: OnboardingScreen): boolean {
    // Archetype gating (slice 2): the self-health block runs only when the
    // owner is tracking their own health. Household screens are still handled
    // by the binary visibleIf strings below via the derived userMode.
    const role = answers.role_selection
    const tracksSelf = role === 'just_me' || role === 'household'
    const SELF_BLOCK = [
      'your_last_name', 'date_of_birth', 'biological_sex', 'your_height',
      'current_weight', 'goal_direction', 'goal_weight', 'weekly_pace',
    ]
    if (role && !tracksSelf && SELF_BLOCK.includes(screen.id)) {
      return false
    }

    if (!screen.visibleIf) return true
    if (screen.visibleIf === "userMode != 'myself'") {
      return answers.userMode !== 'single'
    }
    if (screen.visibleIf === "userMode === 'household'") {
      return answers.userMode === 'household'
    }
    // Goal-setup screens (current weight / goal / pace) — single path only.
    // These capture the activation inputs the day-1 projection needs.
    if (screen.visibleIf === "userMode === 'myself'") {
      return answers.userMode === 'single'
    }
    // Goal weight + pace are meaningless for a maintain goal (target =
    // current, pace = 0), so skip them when the user picked Maintain.
    // For lose/gain they show normally.
    if (screen.visibleIf === "goalDirection != 'maintain'") {
      return answers.goalDirection !== 'maintain'
    }
    // Family path AND user's plan unlocks multi-patient. Free-plan
    // users skip this screen and route straight to /dashboard so we
    // don't dead-end them at the wizard's upgrade wall.
    if (screen.visibleIf === "userMode != 'myself' && canAddPatients") {
      return answers.userMode !== 'single' && canAddPatients
    }
    return true
  }

  const visibleScreens = screens.filter(isScreenVisible)
  const currentScreen = visibleScreens[step]
  const totalSteps = visibleScreens.length

  // On the goal screen, suggest a healthy target from the height + current
  // weight already entered. Reuses the canonical getTargetWeightSuggestion
  // (the "earlier development" healthy-range logic). null off the goal screen
  // or before both inputs exist.
  const goalSuggestion =
    currentScreen?.inputType === 'goal'
      ? getTargetWeightSuggestion(
          parseFloat(String(answers.current_weight ?? '')),
          parseFloat(String(answers.your_height ?? '')),
        )
      : null

  // Pre-fill the goal input with the suggested healthy target the first time
  // the user lands on the goal screen — they can still edit it.
  useEffect(() => {
    if (goalSuggestion && !answers.goal_weight) {
      setAnswers((prev) => ({ ...prev, goal_weight: String(goalSuggestion.target) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen?.id])

  // ── Semantic input validation ──────────────────────────────────────────
  // Onboarding always describes the ACCOUNT HOLDER — a human adult — so enforce
  // human-plausible values: a legal-adult DOB, a real height (inches 0–11,
  // 3′–8′), and a real weight. Children + pets are added afterward via their
  // own flows, which carry their own ranges. `stepError` gates Continue and
  // renders inline, so nothing impossible can be committed.
  function ageInYears(dob: Date, now: Date): number {
    let age = now.getFullYear() - dob.getFullYear()
    const m = now.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
    return age
  }

  function getStepError(): string | null {
    if (!currentScreen) return null
    const id = currentScreen.id

    if (id === 'date_of_birth') {
      const v = String(answers.date_of_birth ?? '').trim()
      if (!v) return null
      const dob = new Date(v)
      if (Number.isNaN(dob.getTime())) return 'Enter a valid date.'
      const now = new Date()
      if (dob > now) return 'Date of birth can’t be in the future.'
      if (ageInYears(dob, now) < 18) {
        return 'You must be at least 18 to set up an account — you can add younger family members in a moment.'
      }
      return null
    }

    if (currentScreen.inputType === 'height') {
      const feetRaw = String(answers.height_feet ?? '').trim()
      const inchesRaw = String(answers.height_inches ?? '').trim()
      if (!feetRaw && !inchesRaw) return null
      const feet = parseInt(feetRaw || '0', 10)
      const inches = parseInt(inchesRaw || '0', 10)
      if (inches > 11) return 'Inches must be 0–11 (12 inches is 1 foot).'
      const total = feet * 12 + inches
      if (total > 0 && (total < 36 || total > 96)) return 'Enter a realistic height (3′0″ to 8′0″).'
      return null
    }

    if (id === 'current_weight') {
      const raw = String(answers.current_weight ?? '').trim()
      if (!raw) return null
      const w = parseFloat(raw)
      if (!(w > 0)) return 'Enter a valid weight.'
      if (w < 50 || w > 1000) return 'Enter a realistic weight (50–1000 lbs).'
      return null
    }

    return null
  }
  const stepError = getStepError()

  // DOB picker upper bound: 18 years ago today (legal-adult gate).
  const maxAdultDobIso = (() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().slice(0, 10)
  })()

  // ── Q8: restore the health warnings on the goal step ──
  // getHealthRiskProfile already encodes the BMI-band warnings (Class I/II/III
  // obesity, cardiovascular + diabetes risk). Surfacing them is an early, honest
  // health signal — shown before the user sets a goal, and later for every
  // family member. Sex (collected in the self-block) feeds the female-specific
  // risk flags; age is derived from the DOB step.
  const accountAge = (() => {
    const v = String(answers.date_of_birth ?? '').trim()
    if (!v) return 0
    const dob = new Date(v)
    return Number.isNaN(dob.getTime()) ? 0 : ageInYears(dob, new Date())
  })()
  const healthRisk =
    currentScreen?.inputType === 'goal' && goalSuggestion
      ? getHealthRiskProfile({
          bmi: goalSuggestion.bmi,
          gender: answers.biological_sex === 'female' ? 'female' : 'male',
          age: accountAge,
        })
      : null

  // ── Q9: recommend a weekly pace from the user's own numbers ──
  // Safe sustainable rate ≈ 1% of body weight/week, snapped to an offered option
  // and clamped 0.5–2 lb/week (the healthy max). Heavier bodies can safely lose
  // faster in absolute terms; lighter bodies get a gentler default.
  const recommendedPace = (() => {
    if (currentScreen?.id !== 'weekly_pace') return null
    const w = parseFloat(String(answers.current_weight ?? ''))
    if (!(w > 0)) return null
    // Derive the offered paces from the PRD options so the recommendation can
    // never drift from what's actually shown (DRY — not a hardcoded range).
    const paces = (currentScreen.options ?? []).map((o) => parseFloat(o)).filter((n) => n > 0)
    if (paces.length === 0) return null
    const lo = Math.min(...paces)
    const hi = Math.max(...paces)
    const target = Math.min(hi, Math.max(lo, w * 0.01))
    const nearest = paces.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a))
    return `${nearest} lb/week`
  })()

  function handleAnswer(value: string) {
    if (!currentScreen) return
    const questionId = currentScreen.id
    const updatedAnswers: Record<string, any> = { ...answers, [questionId]: value }

    if (questionId === 'role_selection') {
      // Self-vs-others is the ONLY axis that gates the flow. Whether an "other"
      // is family or a pet is a per-member fact captured in the roster — not an
      // account-level choice — so the archetype is mutually exclusive.
      //   just_me   → tracks self, no household
      //   household → tracks self AND others
      //   caregiver → tracks others, NOT self
      updatedAnswers.userMode =
        value === 'household' || value === 'caregiver' ? 'household' : 'single'
    }

    // Normalize the goal-direction option ("Lose weight" / "Maintain
    // weight" / "Gain weight") into a stable 'lose' | 'maintain' |
    // 'gain' token. Downstream visibility (skip goal-weight/pace for
    // maintain) and completeOnboarding both read answers.goalDirection.
    if (questionId === 'goal_direction') {
      const v = value.toLowerCase()
      updatedAnswers.goalDirection = v.includes('maintain')
        ? 'maintain'
        : v.includes('gain')
          ? 'gain'
          : 'lose'
    }

    setAnswers(updatedAnswers)

    if (user) {
      const timeSpent = Date.now() - stepStartTime
      trackOnboardingStepCompleted({
        userId: user.uid,
        step: questionId as any,
        stepNumber: step,
        totalSteps: visibleScreens.length,
        progressPercentage: Math.round(((step + 1) / visibleScreens.length) * 100),
        answer: value,
        timeSpent,
      })
      setStepStartTime(Date.now())
    }

    setTimeout(() => setStep(step + 1), 200)
  }

  function handleTextAnswer(value: string) {
    if (!currentScreen) return
    // Validation gate — an Enter keypress or a stale-enabled button can't
    // commit an impossible value.
    if (getStepError()) return
    const questionId = currentScreen.id
    // Normalize name fields on commit via capitalizeName (handles
    // McDonald / O'Brien / multi-word). Applies to both first name
    // and family last name. Other text inputs trim only.
    const trimmed = value.trim()
    const isNameField =
      questionId === 'your_name' ||
      questionId === 'family_last_name' ||
      questionId === 'your_last_name'
    const stored = isNameField ? capitalizeName(trimmed) : trimmed
    const updatedAnswers = { ...answers, [questionId]: stored }
    setAnswers(updatedAnswers)

    if (user) {
      const timeSpent = Date.now() - stepStartTime
      trackOnboardingStepCompleted({
        userId: user.uid,
        step: questionId as any,
        stepNumber: step,
        totalSteps: visibleScreens.length,
        progressPercentage: Math.round(((step + 1) / visibleScreens.length) * 100),
        answer: stored,
        timeSpent,
      })
      setStepStartTime(Date.now())
    }

    setStep(step + 1)
  }

  async function completeOnboarding() {
    if (!user) return
    setIsSubmitting(true)

    try {
      const userMode = answers.userMode as UserMode
      const primaryRole = answers.role_selection as PrimaryRole
      const firstName = (answers.your_name as string | undefined)?.trim() || undefined
      // Family surname — household mode only. It's the shared family
      // last name AND the default lastName for members added later.
      // Gated to household so single mode never persists an uncollected
      // surname (previously the OAuth displayName leaked e.g. "Production"
      // into a single user's record even though no last name was asked).
      const familyLastName =
        userMode === 'household'
          ? (answers.family_last_name as string | undefined)?.trim() || undefined
          : undefined
      // The account holder's OWN surname — its own field now, asked in both the
      // single AND household paths (gated on tracksSelf), so it's the SINGLE
      // source of truth for the self-Patient's legal surname. No longer
      // conflated with the household name in family mode (blended-family safe).
      const ownLastName = (answers.your_last_name as string | undefined)?.trim() || undefined

      // The ACCOUNT HOLDER's own goal-setup answers — captured in BOTH single
      // AND family modes (the organizer is a self-Patient too, not a stub).
      // These are the activation inputs the day-1 weight projection needs —
      // written onto the self-Patient below so /progress fires the projection
      // immediately instead of dead-ending at "complete your profile".
      // parseFloat tolerates the "1 lb/week" pace label (extracts the number).
      const currentWeightNum = parseFloat(String(answers.current_weight ?? ''))
      const goalWeightNum = parseFloat(String(answers.goal_weight ?? ''))
      const weeklyPaceNum = parseFloat(String(answers.weekly_pace ?? ''))
      // Goal direction drives the whole projection. Default 'lose' for
      // back-compat with any pre-existing partial answers, but the screen
      // is always shown so this is normally explicit. Maintain has no
      // goal-weight / pace screen (skipped via visibleIf): the target IS
      // the current weight and pace is 0.
      const goalDirection =
        (answers.goalDirection as 'lose' | 'maintain' | 'gain' | undefined) ?? 'lose'
      const isMaintainGoal = goalDirection === 'maintain'
      const effectiveTargetWeight = isMaintainGoal
        ? currentWeightNum
        : Number.isFinite(goalWeightNum) && goalWeightNum > 0
          ? goalWeightNum
          : undefined
      const effectiveWeeklyPace = isMaintainGoal
        ? 0
        : Number.isFinite(weeklyPaceNum) && weeklyPaceNum > 0
          ? weeklyPaceNum
          : 1
      // Height is stored as total inches by the 'height' input. Pairs with
      // weight for BMI / early health-risk signals (same as the family wizard).
      const heightInches = parseFloat(String(answers.your_height ?? ''))
      const hasHeight = Number.isFinite(heightInches) && heightInches > 0
      // Date of birth is the canonical field — captured directly (more precise
      // than age, and never needs updating). Age is derived from it for
      // BMR/calorie targets, health-risk profiling, and life-stage. The 'date'
      // input stores a YYYY-MM-DD string; guard against blank/future/absurd.
      const dobRaw = String(answers.date_of_birth ?? '').trim()
      let dateOfBirthIso: string | undefined
      if (dobRaw) {
        const dob = new Date(dobRaw)
        const now = new Date()
        const minBirthYear = now.getFullYear() - 120
        if (!Number.isNaN(dob.getTime()) && dob <= now && dob.getFullYear() >= minBirthYear) {
          dateOfBirthIso = dob.toISOString()
        }
      }
      const hasGoalData = Number.isFinite(currentWeightNum) && currentWeightNum > 0

      // memberCount drives plan recommendation. Maps to the
      // maxPatients caps in lib/feature-gates.ts (family_basic = 5,
      // family_plus = 10, family_premium = 20). Myself path skips
      // this question, so the recommendation stays undefined for
      // single-mode users.
      const memberCountBucket = answers.member_count as string | undefined
      const recommendedPlan =
        memberCountBucket === '2_to_5'
          ? 'family_basic'
          : memberCountBucket === '6_to_10'
            ? 'family_plus'
            : memberCountBucket === '11_or_more'
              ? 'family_premium'
              : undefined

      // Legacy OnboardingAnswers shape — preference fields land empty
      // because we no longer ask. Consumers (useUserPreferences etc.)
      // already default-handle missing values; the empty shape just
      // keeps the type satisfied so the existing reads don't break.
      const onboardingData: OnboardingAnswers = {
        userMode,
        primaryRole,
        featurePreferences: [],
        kitchenMode: '' as any,
        mealLoggingMode: '' as any,
        automationLevel: 'no' as AutomationLevel,
        addFamilyNow: false,
        completedAt: new Date(),
      }

      await setDoc(
        doc(db, 'users', user.uid),
        {
          preferences: {
            onboardingAnswers: onboardingData,
            userMode,
            notifications: false,
          },
          profile: {
            onboardingCompleted: true,
            onboardingCompletedAt: Timestamp.now(),
            ...(firstName ? { firstName } : {}),
            // familyLastName is the HOUSEHOLD surname — the default lastName
            // for any family member added via the wizard (the owner's own
            // surname now comes from your_last_name, not this).
            // Per-household scope today (one
            // user.profile); when multi-household lands, this moves
            // onto the household record itself. See deferred work
            // in project_household_composition_state_machine.
            ...(familyLastName ? { familyLastName } : {}),
            ...(ownLastName ? { lastName: ownLastName } : {}),
            // memberCount + recommendedPlan: the user's declared
            // household size and the plan tier that satisfies the
            // patient cap. Drives the upgrade CTA on /dashboard and
            // the explicit plan recommendation toast at completion.
            // Captured at onboarding so we don't have to re-ask.
            ...(memberCountBucket ? { memberCount: memberCountBucket } : {}),
            ...(recommendedPlan ? { recommendedPlan } : {}),
          },
        },
        { merge: true },
      )

      // Auth displayName writeback. Identity consolidation Phase A:
      // when onboarding captures a name (firstName, optionally + the
      // familyLastName surname), align Firebase Auth's displayName to
      // match so it doesn't continue leaking the original Google /
      // signup name through surfaces that read user.displayName (e.g.
      // the AccountSwitcher's legacy "My Profile" entry, password-
      // reset emails, security audit logs). Write-only sync — never
      // read FROM Auth for display in this codebase going forward;
      // the self-Patient is the canonical name source. Best-effort:
      // failure here is non-fatal (the Firestore writes already
      // landed and are the source of truth).
      const desiredDisplayName = [firstName, ownLastName]
        .filter(Boolean)
        .join(' ')
        .trim()
      if (desiredDisplayName && desiredDisplayName !== user.displayName) {
        try {
          await updateProfile(user, { displayName: desiredDisplayName })
        } catch (err) {
          logger.warn(
            '[Onboarding] Auth displayName writeback failed (non-fatal)',
            { error: (err as Error)?.message, desiredDisplayName },
          )
        }
      }

      // Grant the recommended Family-tier trial when the user picked
      // Family and the count put them in a Family plan bucket. DRY:
      // uses the existing /api/subscription/start-trial endpoint
      // (the canonical primitive for no-credit-card trials), so the
      // subscription doc + caps + userMode all land in one place.
      // Best-effort: failure logs but doesn't block onboarding.
      if (recommendedPlan) {
        try {
          const token = await user.getIdToken()
          const trialResponse = await fetch('/api/subscription/start-trial', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ plan: recommendedPlan }),
          })
          if (trialResponse.ok) {
            logger.info('[Onboarding] Family trial started', {
              userId: user.uid,
              plan: recommendedPlan,
            })
          } else {
            // Non-fatal — most likely cause is "user already has a
            // subscription/trial". The badge will still show whatever
            // they had before; not a blocker for finishing onboarding.
            const errorBody = await trialResponse.json().catch(() => ({}))
            logger.warn('[Onboarding] Trial grant skipped or failed', {
              userId: user.uid,
              plan: recommendedPlan,
              status: trialResponse.status,
              error: errorBody?.error,
            })
          }
        } catch (err) {
          logger.error('[Onboarding] Trial grant errored (non-fatal)', err as Error)
        }
      }

      // Self-Patient: create or update. The account holder is
      // themselves a patient in their own household — vitals/meals/
      // meds flow through the same patient infrastructure as family
      // members. DOB / weight / conditions stay deferred via the
      // `requiresProfileCompletion: true` flag; the patient detail
      // editor handles completion.
      //
      // Create-or-update: if a self-Patient already exists, update
      // its name fields so re-onboarding with different names keeps
      // the three identity sources (Auth.displayName, user.profile,
      // self-Patient) consistent. Without this, re-running onboarding
      // would update Auth + profile but leave the existing patient
      // record stale.
      try {
        const composedLegalName = [firstName, ownLastName]
          .filter(Boolean)
          .join(' ')
          .trim()
        const patientName =
          composedLegalName || firstName || deriveDisplayName(user.displayName, user.email)
        const existingSelfPatientId = await findSelfPatientId(user.uid, db)
        let selfPatientId: string
        if (existingSelfPatientId) {
          await updateSelfPatientName({
            userId: user.uid,
            patientId: existingSelfPatientId,
            displayName: patientName,
            ...(firstName ? { firstName } : {}),
            ...(ownLastName ? { lastName: ownLastName } : {}),
            db,
          })
          selfPatientId = existingSelfPatientId
          logger.info('[Onboarding] Self-Patient name updated', {
            userId: user.uid,
            patientId: existingSelfPatientId,
            patientName,
          })
        } else {
          const { patientId } = await createSelfPatient({
            userId: user.uid,
            displayName: patientName,
            ...(firstName ? { firstName } : {}),
            ...(ownLastName ? { lastName: ownLastName } : {}),
            db,
          })
          selfPatientId = patientId
          logger.info('[Onboarding] Self-Patient created', {
            userId: user.uid,
            patientId,
            patientName,
          })
        }

        // Write the goal/weight data captured on the single path so the
        // day-1 projection can fire immediately. We do NOT un-defer DOB /
        // gender / height — only the three activation inputs. Merge-style so
        // the name fields written above are preserved; nested `goals` merges.
        if (hasGoalData) {
          await setDoc(
            doc(db, 'users', user.uid, 'patients', selfPatientId),
            {
              currentWeight: currentWeightNum,
              weightUnit: 'lbs',
              // Height (total inches) — same convention as PatientHeightEditor
              // + the family wizard. Pairs with weight for BMI / health-risk.
              ...(hasHeight ? { height: heightInches, heightUnit: 'imperial' } : {}),
              // Date of birth as entered at onboarding (canonical; age derived).
              ...(dateOfBirthIso ? { dateOfBirth: dateOfBirthIso } : {}),
              // Biological sex — load-bearing for BMR / calorie targets +
              // sex-specific health-risk flags (the self-block collects it).
              ...(answers.biological_sex ? { gender: answers.biological_sex } : {}),
              goals: {
                startWeight: currentWeightNum,
                // Direction the user explicitly chose — lose / maintain /
                // gain. /progress reads this to frame the projection,
                // sign, and copy instead of assuming weight loss.
                goalDirection,
                ...(effectiveTargetWeight
                  ? { targetWeight: effectiveTargetWeight }
                  : {}),
                // Kept under the legacy 'weeklyWeightLossGoal' key (it's
                // the rate magnitude, direction-agnostic). 0 for maintain.
                weeklyWeightLossGoal: effectiveWeeklyPace,
              },
              lastModified: Timestamp.now(),
            },
            { merge: true },
          )

          // Seed the STARTING weigh-in so the chart + "Your Journey" show a
          // real starting point (not an empty "no weight data" state) and the
          // measured trend has an anchor to build from. Reuses the canonical
          // weight-log writer — same /patients/{id}/weight-logs path /progress
          // reads, and it computes BMI now that height is set. Non-fatal: the
          // projection still fires from the profile currentWeight if this fails.
          try {
            await medicalOperations.weightLogs.logWeight(selfPatientId, {
              weight: currentWeightNum,
              unit: 'lbs',
              loggedAt: new Date().toISOString(),
              source: 'manual',
              tags: ['starting-weight'],
            })
          } catch (weighInErr) {
            logger.warn('[Onboarding] Starting weigh-in log failed (non-fatal)', {
              error: (weighInErr as Error)?.message,
            })
          }
        }
      } catch (err) {
        logger.error('[Onboarding] Self-Patient create-or-update failed (non-fatal)', err as Error)
      }

      // Slice 3b: persist the household roster as patient records. Best-effort +
      // non-fatal — a roster-write failure must NEVER break account creation.
      // Gated on canAddPatients: multi-patient is a paid feature, so free
      // accounts keep the roster in their onboarding answers and convert it at
      // the in-context upgrade moment (slice 4). Mirrors the self-Patient's
      // minimal-doc shape (requiresProfileCompletion → the Info-tab editor
      // prompts for the rest); human-vs-pet is the per-member row type.
      const roster: Array<{ type?: string; name?: string; dob?: string; species?: string }> =
        Array.isArray(answers.roster) ? answers.roster : []
      if (canAddPatients && roster.length > 0) {
        const rosterNow = Timestamp.now()
        await Promise.all(
          roster.map(async (m) => {
            try {
              if (!m?.name) return
              const isPet = m.type === 'pet'
              const ref = doc(collection(db, 'users', user.uid, 'patients'))
              const data: Record<string, unknown> = {
                userId: user.uid,
                name: m.name,
                type: isPet ? 'pet' : 'human',
                relationship: isPet ? 'pet' : m.type === 'child' ? 'child' : 'family',
                requiresProfileCompletion: true,
                createdAt: rosterNow,
                lastModified: rosterNow,
              }
              if (!isPet && m.dob) data.dateOfBirth = new Date(m.dob).toISOString()
              if (isPet && m.species) data.species = m.species
              await setDoc(ref, data)
            } catch (memberErr) {
              logger.warn('[Onboarding] Roster member create failed (non-fatal)', {
                name: m?.name,
                error: (memberErr as Error)?.message,
              })
            }
          }),
        )
        logger.info('[Onboarding] Roster persisted', { userId: user.uid, count: roster.length })
      }

      // Analytics
      if (onboardingStartTime) {
        const totalTimeSpent = Date.now() - onboardingStartTime
        trackOnboardingCompleted({
          userId: user.uid,
          userMode,
          selectedGoals: [],
          finalPlan: 'free',
          totalTimeSpent,
          stepsCompleted: visibleScreens.length,
          sawUpgradePrompt: false,
          upgradedDuringOnboarding: false,
        })
      }

      toast.success(firstName ? `Welcome, ${firstName}!` : 'Welcome aboard!')

      // Routing — household members + pets are captured inline on the roster
      // step now, so there's no separate add-member detour. Onboarding ends here.
      if (hasGoalData) {
        // Land single users on /progress — the projection chip fires from the
        // weight + goal they just entered. This IS the "here's your plan"
        // first-session payoff that hooks the trial.
        router.push('/progress')
      } else {
        const tabs = prdConfig.onboarding.userModes[userMode].tabs
        const firstTab = tabs[0]
        const tabRoutes: Record<string, string> = {
          home: '/dashboard',
          log: '/log-meal',
          kitchen: '/inventory',
          profile: '/profile',
          care_circle: '/patients',
        }
        router.push(tabRoutes[firstTab] || '/dashboard')
      }
    } catch (error) {
      console.error('Error saving onboarding:', error)
      toast.error('Failed to save settings. Please try again.')
      setIsSubmitting(false)
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1)
  }

  // If we're past the last screen, complete onboarding
  useEffect(() => {
    if (step >= totalSteps && totalSteps > 0 && !isSubmitting) {
      completeOnboarding()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, totalSteps, isSubmitting])

  // Invitation/photo-capture flow — independent of the onboarding
  // questionnaire. Triggered when the user arrives via ?from=invitation.
  const handlePhotoCapture = async (data: any) => {
    setShowPhotoCapture(false)

    try {
      const userData: any = {
        email: user!.email,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: `${data.firstName} ${data.lastName}`,
        name: `${data.firstName} ${data.lastName}`,
        onboardingComplete: false,
        pendingApproval: true,
        approvalStatus: 'pending',
        invitationOnboarding: true,
        verificationPhotos: {
          front: data.frontPhoto,
          left: data.leftPhoto,
          right: data.rightPhoto,
          capturedAt: Timestamp.now(),
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }
      if (user!.photoURL) userData.photoURL = user!.photoURL
      if (data.dateOfBirth) userData.dateOfBirth = data.dateOfBirth
      if (data.gender) userData.gender = data.gender

      await setDoc(doc(db, 'users', user!.uid), userData, { merge: true })

      const pendingCode = localStorage.getItem('pendingInvitationCode')
      if (pendingCode) {
        try {
          const verifyResponse = await fetch(`/api/invitations/verify?code=${encodeURIComponent(pendingCode)}`)
          if (verifyResponse.ok) {
            const invitation = await verifyResponse.json()
            const acceptResponse = await fetch(`/api/invitations/${invitation.id}/accept`, { method: 'POST' })
            if (acceptResponse.ok) {
              localStorage.removeItem('pendingInvitationCode')
              setAcceptedInvitation(invitation)
              toast.success('Invitation accepted! Photos uploaded.')
            }
          }
        } catch (inviteError) {
          console.error('Error accepting invitation:', inviteError)
          toast.success('Photos uploaded! Please accept invitation manually.')
        }
      } else {
        toast.success('Photos uploaded! Waiting for admin approval.')
      }

      setPendingApproval(true)
    } catch (error) {
      console.error('Error saving photo data:', error)
      toast.error('Failed to upload photos. Please try again.')
    }
  }

  if (pendingApproval) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-lg w-full bg-card rounded-lg border-2 border-border p-8 text-center">
            <div className="w-20 h-20 bg-warning-light rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-warning-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">Pending Admin Approval</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for submitting your verification photos. An administrator will review and approve your access shortly.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              You'll receive an email notification once your account has been approved.
            </p>
            <button
              onClick={() => {
                if (acceptedInvitation?.patientsShared && acceptedInvitation.patientsShared.length > 0) {
                  const firstPatientId = acceptedInvitation.patientsShared[0]
                  router.push(`/patients/${firstPatientId}`)
                } else {
                  router.push('/patients')
                }
              }}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              {acceptedInvitation ? 'View Patient Records' : 'Go to Dashboard'}
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (showPhotoCapture && fromInvitation) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <FacePhotoCapture
            isOpen={true}
            onComplete={handlePhotoCapture}
            onClose={() => {
              setShowPhotoCapture(false)
              router.push('/dashboard')
            }}
          />
        </div>
      </AuthGuard>
    )
  }

  if (!currentScreen && !isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl mb-4">Setting up your experience...</div>
      </div>
    )
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg">Finalizing your setup...</p>
        </div>
      </div>
    )
  }

  if (!currentScreen) return null

  // Mode-aware copy for the your_name screen. Default copy reads as
  // single-user voice ("What's your first name?"), which feels off
  // for someone who just declared they're setting up a household.
  // Family-mode framing acknowledges the user as the account holder
  // with family members to follow. When familyLastName is captured,
  // the subtitle name-checks the family explicitly. Falls back to
  // the PRD copy for any other screen.
  const familyLastName = (answers.family_last_name as string | undefined)?.trim()
  const renderedQuestion =
    currentScreen.id === 'your_name' && answers.userMode === 'household'
      ? "What should we call you?"
      : currentScreen.question
  const renderedSubtitle =
    currentScreen.id === 'your_name' && answers.userMode === 'household'
      ? familyLastName
        ? `Welcome to the ${familyLastName} family — start with your first name. You can add others in a moment.`
        : "You're the account holder — we'll greet you here. You can add family members in a moment."
      : currentScreen.subtitle

  return (
    <AuthGuard>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent p-4">
        <div className="max-w-xl w-full space-y-8">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {step + 1} of {totalSteps}</span>
              <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {renderedQuestion}
              </h2>
              {renderedSubtitle && (
                <p className="text-sm text-muted-foreground mt-2">{renderedSubtitle}</p>
              )}
            </div>

            {/* Principal Owner framing — the person setting up the account is
                the household's Principal Owner (the account_owner role). Shown
                on the name step; gold to match the owner badge. */}
            {currentScreen.id === 'your_name' && (
              <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-left dark:bg-amber-900/15">
                <p className="text-sm text-foreground">
                  <span aria-hidden="true">👑</span> You’re the{' '}
                  <span className="font-semibold">Principal Owner</span>
                  {answers.family_last_name
                    ? <> of the {capitalizeName(String(answers.family_last_name))} household</>
                    : ' of this account'}
                  {' '}— full control, and you can add others in a moment.
                </p>
              </div>
            )}

            {currentScreen.inputType === 'roster' ? (
              <div className="space-y-4">
                {/* Members added so far */}
                {Array.isArray(answers.roster) && answers.roster.length > 0 && (
                  <div className="space-y-2">
                    {(answers.roster as any[]).map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-xl bg-accent px-4 py-3">
                        <span className="text-sm font-medium text-foreground">
                          {m.name}{' '}
                          <span className="text-muted-foreground">· {m.type === 'pet' ? (m.species || 'pet') : m.type}</span>
                        </span>
                        <button onClick={() => removeRosterMember(m.id)} className="text-xs font-semibold text-error">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add-member sub-form: type picks the fields + validation */}
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex gap-2">
                    {['adult', 'child', 'pet'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setRosterDraft({ ...rosterDraft, type: t })}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                          rosterDraft.type === t ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground hover:bg-accent/80'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {rosterDraft.type && (
                    <>
                      <input
                        type="text"
                        value={rosterDraft.name}
                        onChange={(e) => setRosterDraft({ ...rosterDraft, name: e.target.value })}
                        placeholder={rosterDraft.type === 'pet' ? "Pet's name" : 'First name'}
                        className="w-full rounded-lg border-2 border-transparent bg-accent p-3 text-foreground focus:border-primary focus:outline-none"
                      />
                      {rosterDraft.type === 'pet' ? (
                        <input
                          type="text"
                          value={rosterDraft.species}
                          onChange={(e) => setRosterDraft({ ...rosterDraft, species: e.target.value })}
                          placeholder="Species (dog, cat, …)"
                          className="w-full rounded-lg border-2 border-transparent bg-accent p-3 text-foreground focus:border-primary focus:outline-none"
                        />
                      ) : (
                        <input
                          type="date"
                          max={new Date().toISOString().slice(0, 10)}
                          value={rosterDraft.dob}
                          onChange={(e) => setRosterDraft({ ...rosterDraft, dob: e.target.value })}
                          className="w-full rounded-lg border-2 border-transparent bg-accent p-3 text-foreground focus:border-primary focus:outline-none"
                        />
                      )}
                      <button
                        onClick={addRosterMember}
                        disabled={!rosterDraft.name.trim() || (rosterDraft.type === 'pet' && !rosterDraft.species.trim())}
                        className="w-full rounded-lg bg-primary/10 p-3 font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                      >
                        + Add {rosterDraft.type}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => {
                    // Auto-commit a filled-but-unadded draft so a typed member is
                    // never silently dropped when the user taps Continue instead
                    // of "+ Add". addRosterMember() no-ops on an invalid draft.
                    const d = rosterDraft
                    const draftReady = !!d.type && !!d.name.trim() && !(d.type === 'pet' && !d.species.trim())
                    if (draftReady) addRosterMember()
                    setStep(step + 1)
                  }}
                  className="w-full rounded-xl bg-primary p-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Continue
                  {Array.isArray(answers.roster) && answers.roster.length > 0 ? ` (${answers.roster.length} added)` : ''}
                </button>
              </div>
            ) : currentScreen.inputType === 'text' || currentScreen.inputType === 'number' ? (
              <div className="space-y-4">
                <input
                  type={currentScreen.inputType === 'number' ? 'number' : 'text'}
                  inputMode={currentScreen.inputType === 'number' ? 'decimal' : undefined}
                  min={currentScreen.inputType === 'number' ? 0 : undefined}
                  value={(answers[currentScreen.id] as string) || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentScreen.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = (answers[currentScreen.id] as string) || ''
                      if (value.trim().length > 0) handleTextAnswer(value)
                    }
                  }}
                  placeholder={currentScreen.placeholder ?? ''}
                  maxLength={currentScreen.maxLength ?? 100}
                  autoFocus
                  className="w-full p-5 rounded-xl bg-accent text-foreground border-2 border-transparent focus:border-primary focus:outline-none text-lg font-medium transition-colors"
                />
                {stepError && <p className="text-sm font-medium text-error">{stepError}</p>}
                <button
                  onClick={() => handleTextAnswer((answers[currentScreen.id] as string) || '')}
                  disabled={(!((answers[currentScreen.id] as string) || '').trim() && !currentScreen.optional) || !!stepError}
                  className="w-full p-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            ) : currentScreen.inputType === 'goal' ? (
              <div className="space-y-4">
                {/* Healthy-weight guidance from height + current weight, then
                    a target input pre-filled with the suggestion (editable). */}
                {goalSuggestion && (
                  <div className="rounded-xl bg-accent/60 border border-border p-4 text-left">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      💡 A healthy weight for your height is {goalSuggestion.minHealthyWeight}&ndash;
                      {goalSuggestion.maxHealthyWeight} lbs.
                    </p>
                    <p className="text-xs text-muted-foreground">{goalSuggestion.reason}</p>
                  </div>
                )}
                {/* Health warnings (Q8) — early, honest BMI-band signal. Shows
                    here for the account holder, and the same logic surfaces for
                    every family member you add. */}
                {healthRisk && healthRisk.warnings.length > 0 && (
                  <div
                    className={`rounded-xl border p-4 text-left ${
                      healthRisk.riskLevel === 'severe' || healthRisk.riskLevel === 'high'
                        ? 'bg-error-light border-error/40'
                        : 'bg-warning-light border-warning/40'
                    }`}
                  >
                    <p className="mb-1 flex items-center gap-1 text-sm font-semibold text-foreground">
                      <span aria-hidden="true">⚠️</span> {healthRisk.bmiCategory}
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                      {healthRisk.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Early awareness is the point — we’ll help you (and everyone you add) track this over time. Not medical advice.
                    </p>
                  </div>
                )}
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={(answers.goal_weight as string) || ''}
                  onChange={(e) => setAnswers({ ...answers, goal_weight: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = (answers.goal_weight as string) || ''
                      if (value.trim().length > 0) handleTextAnswer(value)
                    }
                  }}
                  placeholder={currentScreen.placeholder ?? 'Goal weight (lbs)'}
                  maxLength={currentScreen.maxLength ?? 6}
                  autoFocus
                  className="w-full p-5 rounded-xl bg-accent text-foreground border-2 border-transparent focus:border-primary focus:outline-none text-lg font-medium text-center transition-colors"
                />
                <button
                  onClick={() => handleTextAnswer((answers.goal_weight as string) || '')}
                  disabled={!((answers.goal_weight as string) || '').trim()}
                  className="w-full p-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            ) : currentScreen.inputType === 'height' ? (
              <div className="space-y-4">
                {/* Paired feet + inches. Stored as total inches via
                    handleTextAnswer — same ft×12+in convention as
                    PatientHeightEditor and the family wizard. */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={9}
                      value={(answers.height_feet as string) || ''}
                      onChange={(e) => setAnswers({ ...answers, height_feet: e.target.value })}
                      placeholder="5"
                      autoFocus
                      className="w-full p-5 rounded-xl bg-accent text-foreground border-2 border-transparent focus:border-primary focus:outline-none text-lg font-medium text-center transition-colors"
                    />
                    <p className="text-center text-xs text-muted-foreground mt-1">feet</p>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={11}
                      value={(answers.height_inches as string) || ''}
                      onChange={(e) => setAnswers({ ...answers, height_inches: e.target.value })}
                      placeholder="10"
                      className="w-full p-5 rounded-xl bg-accent text-foreground border-2 border-transparent focus:border-primary focus:outline-none text-lg font-medium text-center transition-colors"
                    />
                    <p className="text-center text-xs text-muted-foreground mt-1">inches</p>
                  </div>
                </div>
                {stepError && <p className="text-sm font-medium text-error">{stepError}</p>}
                <button
                  onClick={() => {
                    const feet = parseInt(String(answers.height_feet ?? ''), 10) || 0
                    const inches = parseInt(String(answers.height_inches ?? ''), 10) || 0
                    const total = feet * 12 + inches
                    if (total > 0) handleTextAnswer(String(total))
                  }}
                  disabled={!(parseInt(String(answers.height_feet ?? ''), 10) > 0) || !!stepError}
                  className="w-full p-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            ) : currentScreen.inputType === 'date' ? (
              <div className="space-y-4">
                {/* Native date picker. Stores YYYY-MM-DD; completeOnboarding
                    converts to an ISO dateOfBirth (canonical; age derived).
                    Bounded to a plausible human range so a future/absurd date
                    can't be picked. */}
                <input
                  type="date"
                  max={maxAdultDobIso}
                  min={`${new Date().getFullYear() - 120}-01-01`}
                  value={(answers[currentScreen.id] as string) || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentScreen.id]: e.target.value })}
                  autoFocus
                  className="w-full p-5 rounded-xl bg-accent text-foreground border-2 border-transparent focus:border-primary focus:outline-none text-lg font-medium text-center transition-colors"
                />
                {stepError && <p className="text-sm font-medium text-error">{stepError}</p>}
                <button
                  onClick={() => handleTextAnswer((answers[currentScreen.id] as string) || '')}
                  disabled={(!((answers[currentScreen.id] as string) || '').trim() && !currentScreen.optional) || !!stepError}
                  className="w-full p-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {currentScreen.options.map((option) => {
                  const isSelected = answers[currentScreen.id] === option
                  const description = currentScreen.optionDescriptions?.[option]
                  const label = option.replace(/_/g, ' ')
                  // Q9: personalized pace pick from the user's own weight.
                  const isRecommended =
                    currentScreen.id === 'weekly_pace' && !!recommendedPace && option === recommendedPace

                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      className={`
                        w-full p-5 rounded-xl text-left font-medium transition-all duration-200
                        ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-2 border-primary shadow-lg scale-[1.02]'
                            : isRecommended
                              ? 'bg-accent border-2 border-primary hover:bg-accent/80 hover:scale-[1.01]'
                              : 'bg-accent hover:bg-accent/80 border-2 border-transparent hover:border-primary/30 hover:scale-[1.01]'
                        }
                      `}
                    >
                      <div className="capitalize text-lg font-semibold mb-0.5 flex items-center gap-2">
                        {label}
                        {isRecommended && (
                          <span className="normal-case text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                            ✨ Recommended for you
                          </span>
                        )}
                      </div>
                      {description && (
                        <div className="text-sm leading-relaxed text-white/80">{description}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Back button — single DRY navigation control shared across
              every screen type. Bordered chip with min-h-11 (44px) for
              mobile-tap accessibility. */}
          {step > 0 && (
            <button
              onClick={handleBack}
              className="w-full flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border-2 border-border bg-card hover:bg-muted active:bg-muted/80 text-foreground font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
