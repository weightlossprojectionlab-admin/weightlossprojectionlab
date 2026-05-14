/**
 * Handoff notes — running ledger of "what the next person needs to know"
 * for a household.
 *
 * Semantic intent: a caregiver finishing a shift leaves notes for the
 * next person coming on — observations, decisions made, things to watch.
 * A family admin reads these to stay current without micromanaging.
 *
 * Storage: users/{ownerId}/handoffNotes/{noteId}. Scoped to the household
 * (owner-rooted) so every member sees the same ledger; per-patient notes
 * are expressed by tagging the relevant patientIds on the note rather
 * than splitting into separate subcollections.
 *
 * Authoring is open to the household owner and any accepted familyMember;
 * audit fields capture who wrote what.
 */

export interface HandoffNote {
  /** Doc id, mirrored into the type so consumers can pass items around freely. */
  id: string

  /** Household this note belongs to (the user doc id at the root of the path). */
  ownerId: string

  /** Author UID (owner or a familyMember). */
  authorId: string

  /** Author display name at write time. Denormalized for read speed; we don't
   * try to keep this perfectly in sync if the author renames later. */
  authorName: string

  /** The note body. Free text, max 2000 chars enforced at the API. */
  body: string

  /** Optional patientIds the note pertains to. Empty / undefined means
   * "household-wide" (e.g. "out of milk", "appointment moved"). */
  patientIds?: string[]

  /** Caregiver-pings-owner signal: when true, the owner sees this surfaced
   * more prominently (banner / count badge) instead of buried in the feed. */
  flaggedForOwner?: boolean

  /** ISO 8601 timestamps written by the server. */
  createdAt: string
  updatedAt: string
}

/** POST body for creating a handoff note. Server fills in id/author/timestamps. */
export interface CreateHandoffNoteInput {
  body: string
  patientIds?: string[]
  flaggedForOwner?: boolean
}
