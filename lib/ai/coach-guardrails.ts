/**
 * AI coach guardrails — rule-based safety layer wrapped around
 * the text-output coach pipeline (/api/ai/chat).
 *
 * Why this exists separately from the system prompt:
 *   The COACH_SYSTEM_PROMPT in lib/ai-coach.ts tells Gemini what
 *   not to do (no diagnoses, no dose recommendations, defer to
 *   doctor). That's a soft instruction the model will mostly follow
 *   but occasionally violate under prompt-injection pressure or
 *   in long-running conversations. This module is a hard gate on
 *   both the input (block injection patterns) and the output
 *   (block diagnosis / dose / "stop your medication" responses)
 *   that fires AFTER Gemini's reply, with deterministic rules.
 *
 * Punch-list reference:
 *   T3.7 #8 in the launch-hardening list called out the AI coach
 *   as the one PHI pipeline that's text-output (so Zod doesn't
 *   apply) and tagged it "separate design." This module is that
 *   design. v1 is rule-based; a future v2 could swap in a small
 *   classifier trained on the audit-log corpus.
 *
 * Three concerns, three exports:
 *   - detectPromptInjection(message)  — pre-Gemini; fires on
 *     instruction-override patterns. Caller can refuse or sanitize.
 *   - checkOutputSafety(response)     — post-Gemini; fires on
 *     diagnosis / dose / "stop meds" patterns. Caller substitutes
 *     a safe fallback when triggered.
 *   - SAFE_FALLBACK_RESPONSE          — canonical replacement text.
 */

// ============================================================
// Input — prompt-injection detection
// ============================================================

interface InjectionDetection {
  detected: boolean
  /** Specific pattern that fired, for telemetry / audit. */
  pattern?:
    | 'instruction-override'
    | 'role-reset'
    | 'system-prompt-leak'
    | 'jailbreak-marker'
}

/**
 * Detect common prompt-injection patterns in a user message.
 *
 * Generous on false positives (better to flag a legit "ignore the
 * previous topic" question than to miss a real injection). The
 * caller decides whether to refuse vs sanitize vs flag-only.
 *
 * Not exhaustive — a determined attacker can word-around any
 * regex list. The audit log + output guardrail are the second
 * line of defense.
 */
export function detectPromptInjection(message: string): InjectionDetection {
  if (!message || typeof message !== 'string') {
    return { detected: false }
  }
  const lower = message.toLowerCase()

  // Order matters: more-specific patterns first so a generic phrase
  // like "you are now" doesn't shadow a specific jailbreak marker.

  // Common jailbreak markers seen in injection corpora — DAN, [INST],
  // <|system|>, etc. Check first because some carry "you are now"
  // alongside, and we want the jailbreak label to take precedence.
  const jailbreakMarkers = [
    'do anything now',
    'dan mode',
    'developer mode',
    'jailbreak',
    'sudo mode',
    '[inst]',
    '<|im_start|>',
    '<|system|>',
    '<|user|>',
  ]
  if (jailbreakMarkers.some((p) => lower.includes(p))) {
    return { detected: true, pattern: 'jailbreak-marker' }
  }

  // Classic instruction-override phrases — "ignore X and do Y" is
  // the canonical injection shape across providers.
  const instructionOverride = [
    'ignore previous',
    'ignore all previous',
    'ignore your previous',
    'ignore the above',
    'disregard previous',
    'disregard all',
    'forget all previous',
    'forget your instructions',
    'forget the system',
  ]
  if (instructionOverride.some((p) => lower.includes(p))) {
    return { detected: true, pattern: 'instruction-override' }
  }

  // System-prompt-leak attempts — "show me the system prompt",
  // "what are your instructions", "repeat your initial prompt".
  // Check before role-reset so "show me your system prompt" labels
  // correctly rather than tripping on a role phrase by accident.
  const systemPromptLeak = [
    'system prompt',
    'your system instructions',
    'your instructions verbatim',
    'repeat your prompt',
    'reveal your prompt',
    'reveal your initial prompt',
    'reveal your system',
    'print your instructions',
    'show me your initial',
    'what were you told',
    'initial prompt',
  ]
  if (systemPromptLeak.some((p) => lower.includes(p))) {
    return { detected: true, pattern: 'system-prompt-leak' }
  }

  // Role-reset attempts — "you are now X" / "act as X" / "pretend
  // to be X" where X is something other than the configured coach
  // identity.
  const roleReset = [
    'you are now',
    'you are no longer',
    'act as a doctor',
    'act as my doctor',
    'pretend to be a doctor',
    'pretend you are',
    'roleplay as',
    'simulate being',
    'from now on you are',
    'your new role',
    'new instructions:',
    'new system prompt',
  ]
  if (roleReset.some((p) => lower.includes(p))) {
    return { detected: true, pattern: 'role-reset' }
  }

  return { detected: false }
}

// ============================================================
// Output — unsafe-content detection
// ============================================================

interface OutputSafetyResult {
  safe: boolean
  /** Specific concern that fired, for telemetry / audit. */
  concern?:
    | 'diagnosis-language'
    | 'dose-recommendation'
    | 'medication-stop-advice'
    | 'emergency-redirect-missing'
}

/**
 * Check the model's reply for unsafe medical content.
 *
 * The system prompt tells Gemini not to diagnose, prescribe doses,
 * or recommend stopping medications — but soft instructions fail
 * under pressure. This is the hard gate that runs after Gemini.
 *
 * Conservative bias: prefer false positives (flag a benign
 * paraphrase like "your reading suggests low iron") over false
 * negatives ("you have iron-deficiency anemia, take 65mg ferrous
 * sulfate twice daily"). Caller substitutes SAFE_FALLBACK_RESPONSE
 * when triggered.
 */
export function checkOutputSafety(response: string): OutputSafetyResult {
  if (!response || typeof response !== 'string') {
    return { safe: true } // Empty output is its own problem; not a safety issue.
  }
  const lower = response.toLowerCase()

  // Direct diagnosis language — "you have <condition>", "you are
  // diagnosed with", "this is consistent with <condition>".
  // Note: "this looks like a great meal" wouldn't match because
  // the patterns require diagnostic verbs.
  const diagnosisPatterns: RegExp[] = [
    /\byou have (diabetes|cancer|hypertension|hypothyroid|depression|anxiety|adhd|ptsd|copd|asthma|anemia)\b/i,
    /\byou are diagnosed with\b/i,
    /\bi diagnose you\b/i,
    /\byour diagnosis is\b/i,
    /\bthis is .*(diabetes|cancer|hypertension)\b/i,
    /\byou suffer from\b/i,
  ]
  if (diagnosisPatterns.some((rx) => rx.test(response))) {
    return { safe: false, concern: 'diagnosis-language' }
  }

  // Specific dose recommendations — "take X mg of Y", "take Y twice
  // daily" with a quantitative dose. Generic "stay hydrated" stays
  // safe.
  const dosePatterns: RegExp[] = [
    /\btake \d+\s?(mg|mcg|g|ml|iu|units|tablets?|capsules?|pills?)\b/i,
    /\b\d+\s?(mg|mcg|g|ml|iu) (twice|once|three times|four times|every) (a |per )?(day|hour|night)/i,
    /\bi (recommend|suggest) you take \d+/i,
    /\bdosage of \d+/i,
    /\bincrease your (insulin|metformin|lisinopril|atorvastatin|levothyroxine) (to|by)/i,
  ]
  if (dosePatterns.some((rx) => rx.test(response))) {
    return { safe: false, concern: 'dose-recommendation' }
  }

  // Medication-stop advice — actively dangerous regardless of
  // wording. "Stop taking your X", "discontinue your X", "you don't
  // need your medication".
  const medicationStopPatterns: RegExp[] = [
    /\bstop (taking|using) your (medication|meds|insulin|metformin|lisinopril|atorvastatin|levothyroxine|antidepressant|inhaler|prescription)\b/i,
    /\bdiscontinue your (medication|meds|prescription)\b/i,
    /\byou (don'?t|do not) need your (medication|meds|prescription)\b/i,
    /\bskip your (insulin|medication|dose|meds)\b/i,
  ]
  if (medicationStopPatterns.some((rx) => rx.test(response))) {
    return { safe: false, concern: 'medication-stop-advice' }
  }

  // Crisis-context check — if the user message had crisis keywords
  // and the response doesn't include a redirect, that's a problem.
  // (This is checked at the route level with input + output context;
  // exposed here as a reusable helper if callers want it.)

  return { safe: true }
}

/**
 * Crisis keywords in user input that REQUIRE the response to redirect
 * to professional help / hotlines. Caller decides on detection.
 */
export const CRISIS_INPUT_KEYWORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'hurt myself',
  'self harm',
  'self-harm',
  'overdose',
  'i want to die',
]

/**
 * Phrases the response should contain when the input had crisis
 * keywords. If none are present, the model failed to redirect.
 */
export const CRISIS_REQUIRED_OUTPUT_TOKENS = [
  '988', // US suicide prevention lifeline
  'hotline',
  'crisis line',
  'emergency',
  'professional help',
  'mental health professional',
  '911',
]

export function checkCrisisRedirect(
  userMessage: string,
  response: string,
): { triggered: boolean; redirected: boolean } {
  const userLower = userMessage.toLowerCase()
  const triggered = CRISIS_INPUT_KEYWORDS.some((k) => userLower.includes(k))
  if (!triggered) return { triggered: false, redirected: true }

  const responseLower = response.toLowerCase()
  const redirected = CRISIS_REQUIRED_OUTPUT_TOKENS.some((t) =>
    responseLower.includes(t.toLowerCase()),
  )
  return { triggered, redirected }
}

// ============================================================
// Canonical fallback when output is unsafe
// ============================================================

/**
 * Replacement text used when checkOutputSafety flags the model's
 * reply. Defers to a healthcare provider — never tries to give
 * medical guidance after a safety trip.
 */
export const SAFE_FALLBACK_RESPONSE =
  "I want to be careful with that one — what you're asking touches medical territory I shouldn't navigate as a nutrition coach. " +
  "Please bring this question to your doctor, pharmacist, or another qualified healthcare provider. " +
  "If this feels urgent, call 911 (or 988 for mental-health crises in the US). " +
  "I'm happy to help with nutrition, meals, and general wellness whenever you'd like to redirect."
