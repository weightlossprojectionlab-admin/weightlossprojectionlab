/**
 * Patient-name → patient-record matcher for the import wizard.
 *
 * The user's spreadsheet has names ("Mike Doe", "Buddy"); the
 * commit endpoint needs Firestore patient IDs. This helper walks
 * the household's patient list and finds the best match for a
 * given name string.
 *
 * Matching strategy (in priority order):
 *   1. Exact (case- and whitespace-insensitive) match on `name`
 *   2. Exact match on `nickname`
 *   3. Substring match on `name` (handles "Mike" matching "Mike Doe")
 *
 * Ambiguous matches (e.g. two patients both named "Buddy")
 * return null so the importer surfaces an error rather than
 * silently picking one — better to make the user disambiguate
 * than to write to the wrong record.
 *
 * Future enhancement: phonetic / Levenshtein fuzzy matching for
 * typos. Out of scope for v1 — exact-or-substring covers the
 * happy path (users don't typo names they're typing themselves).
 */

interface MatchableCandidate {
  id: string
  name?: string
  nickname?: string
}

const normalize = (s: string | undefined): string =>
  (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

export interface MatchResult {
  /** Matched patient id, or null if no clear match. */
  patientId: string | null
  /** Why we landed here. Useful for surfacing in the row preview. */
  reason: 'exact' | 'nickname' | 'substring' | 'no-match' | 'ambiguous'
}

/**
 * Match a single name against a list of household patients.
 */
export function matchPatientByName(
  name: string,
  candidates: MatchableCandidate[],
): MatchResult {
  const target = normalize(name)
  if (!target) return { patientId: null, reason: 'no-match' }

  // 1. Exact name match
  const exactName = candidates.filter((c) => normalize(c.name) === target)
  if (exactName.length === 1) return { patientId: exactName[0].id, reason: 'exact' }
  if (exactName.length > 1) return { patientId: null, reason: 'ambiguous' }

  // 2. Exact nickname match
  const exactNickname = candidates.filter((c) => normalize(c.nickname) === target)
  if (exactNickname.length === 1) return { patientId: exactNickname[0].id, reason: 'nickname' }
  if (exactNickname.length > 1) return { patientId: null, reason: 'ambiguous' }

  // 3. Substring match on name (e.g. "Mike" → "Mike Doe")
  const substring = candidates.filter((c) => {
    const candName = normalize(c.name)
    if (!candName) return false
    return candName.includes(target) || target.includes(candName)
  })
  if (substring.length === 1) return { patientId: substring[0].id, reason: 'substring' }
  if (substring.length > 1) return { patientId: null, reason: 'ambiguous' }

  return { patientId: null, reason: 'no-match' }
}

/**
 * Build a name → matchResult map for a list of distinct names.
 * Useful for the preview surface that wants to show "Mike Doe →
 * matched Mike Doe (exact)" before the commit.
 */
export function matchPatientsForPreview(
  names: string[],
  candidates: MatchableCandidate[],
): Map<string, MatchResult> {
  const out = new Map<string, MatchResult>()
  for (const name of names) {
    if (out.has(name)) continue
    out.set(name, matchPatientByName(name, candidates))
  }
  return out
}
