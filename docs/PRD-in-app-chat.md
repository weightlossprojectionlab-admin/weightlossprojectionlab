# PRD — In-App Chat

## Status
Draft. Pulled out of the in-store shopping plan (Stage 2c was originally scoped to bundle chat alongside shopping; that coupling was wrong — chat is its own subsystem used from many surfaces). Three phases sequenced; Phase 1 is the foundation, Phase 3 has significant infrastructure cost.

## Background

Several product flows need ad-hoc communication between the active user and a caregiver / account admin / family member:

- **In-store shopping** (Stage 2c hook) — shopper can't find an item, asks the caregiver: "Skip it? Substitute? Try another store?"
- **Recipe selection** — child wants to make something, parent reviews and approves.
- **Meal logging** — caregiver sees an unusual meal and asks for context.
- **Doctor visits / care coordination** — share a photo of a label, a wound, a med.

Today none of these have a chat path. The notification bell exists but only emits one-way notifications. Users currently work around with text messages outside the app, breaking the audit trail and decoupling the conversation from its context (the recipe, item, meal log it's about).

This PRD defines a chat subsystem that lives separately from any single feature and can be invoked from many places with a context payload.

## Design principles

1. **Always context-bound** — every chat thread is anchored to *something*: a shopping session, a recipe, a meal log, a generic "general" thread. Context is opaque metadata on the thread, surfaced in the chat UI ("About: Heinz Ketchup on Today's Trip").
2. **Audit-trail capable** — message metadata (sender, recipient, timestamp, read receipts, message type) is retained per app retention policy. **Content retention follows policy** (HIPAA where applicable). Live video is not recorded.
3. **Multi-modal, phased** — text first; images second; live video last. Each phase is independently shippable.
4. **Real-time delivery** — Firestore subscription on the thread doc surfaces new messages without polling.
5. **Notification-aware** — a new message fires the recipient's notification bell. Cross-device delivery via FCM (or equivalent push provider). Already-open thread auto-marks read.
6. **Privacy first** — no chat content leaves the app's storage layer. Live video uses peer-to-peer where possible (TURN fallback only when needed).

## Schema

### `ChatThread` (Firestore collection: `chat_threads`)
```ts
interface ChatThread {
  id: string
  participants: string[]        // userIds
  context: ChatContext
  createdAt: Date
  lastMessageAt: Date
  lastMessagePreview?: string   // for thread-list UI
  lastReadAt: Record<string, Date>  // per-participant
}

type ChatContext =
  | { kind: 'shopping-session', sessionId: string, itemId?: string }
  | { kind: 'recipe', recipeId: string }
  | { kind: 'meal-log', mealLogId: string }
  | { kind: 'cooking-session', cookingSessionId: string, stepIndex?: number }
  | { kind: 'general' }
```

### `ChatMessage` (subcollection: `chat_threads/{threadId}/messages`)
```ts
interface ChatMessage {
  id: string
  threadId: string
  fromUserId: string
  type: 'text' | 'image' | 'video-invite' | 'video-end' | 'system'
  body?: string                 // text content (text + system)
  imageUrl?: string             // type=image (Firebase Storage)
  videoSessionId?: string       // type=video-invite | video-end (Phase 3)
  sentAt: Date
  readBy: string[]              // userIds who've seen it
  // System-generated messages (e.g., "Mom joined the call") have type='system' + body
}
```

### Notification routing
- Existing notification infrastructure delivers a "new message" notification to recipients not currently viewing the thread.
- Bell badge counts unread messages across all threads.
- FCM payload includes `threadId` so tapping the notification deep-links to the thread.

## Phase 1 — Text-only chat (Chat-A)

### Scope
- Create thread with context (one of the `ChatContext` shapes).
- Send / receive text messages. Real-time via Firestore subscription.
- Thread list UI (under the notification bell, or a dedicated `/chat` route — TBD).
- Per-thread chat UI: messages, send box, "About: <context>" header.
- Read receipts (passive — no UI explicitly required, but `readBy` is set).
- Notification bell badge for unread count.

### Surfaces invoking it
- In-store shopping (Stage 2c hook): "Ask caregiver" button on the item card → creates or finds a thread with context `{ kind: 'shopping-session', sessionId, itemId }` → opens it.
- Future: any surface that wants to ask "Hey, about this thing..." can pass its context.

### Critical files (Phase 1)
- `types/chat.ts` — NEW. Thread + message types.
- `lib/chat-operations.ts` — NEW. createThread, getOrCreateThreadForContext, sendMessage, subscribeToThread, markRead.
- `app/chat/page.tsx` — NEW. Thread list view.
- `app/chat/[threadId]/page.tsx` — NEW. Per-thread message UI.
- `components/chat/ChatTrigger.tsx` — NEW. Reusable "Open chat for this context" button.
- Notification bell component — extend to show unread chat count.
- Firestore security rules — `chat_threads` and subcollection messages: read/write only if `request.auth.uid in participants`.

### Verification
1. Open a thread from any context → message UI loads.
2. Send a text message → recipient receives in real-time.
3. Recipient's notification bell badge increments.
4. Tapping notification deep-links to the thread.
5. Returning to the thread auto-marks read; sender sees read receipt.
6. Security rules block non-participants from reading.

## Phase 2 — Image attachments (Chat-B)

### Scope
- Attach a photo to a message (camera capture or file picker).
- Image stored in Firebase Storage at `chat_threads/{threadId}/{messageId}.jpg`.
- Storage rules: read/write only if `request.auth.uid in chat_threads/{threadId}.participants`.
- Image retention follows app's retention policy (configurable; HIPAA-compliant where applicable).
- Display: inline thumbnail in chat, tap to fullscreen.

### Use cases unlocked
- Shopper sends a photo: "This is what they have — okay?" Caregiver responds.
- Send a photo of a nutrition label, a med, a wound, a plate.

### Critical files (Phase 2)
- `lib/chat-image-upload.ts` — NEW. Compress, upload, generate Storage URL.
- `components/chat/ChatImageMessage.tsx` — render image messages.
- Storage rules update.

### Verification
1. Attach a photo → uploads to Storage → message renders.
2. Recipient sees thumbnail, taps to fullscreen.
3. Storage rules block non-participants.
4. Retention policy is honored (verify via admin script).

## Phase 3 — Live video view (Chat-C, no recording)

### Scope
- One-way video stream: shopper streams to caregiver. Caregiver sees the live feed, can speak via existing audio.
- Two-way (optional): both participants stream.
- **Never recorded.** No frames, audio, or content saved server-side.
- Audit log captures session-start / participants-joined / session-end timestamps only.
- Clear "you are being viewed" indicator on shopper's side throughout.
- Browser permissions flow handled gracefully.

### Infrastructure
- WebRTC peer connection (browser-native, no third-party SDK required for basic case).
- Signaling server: small Cloud Function or Firestore-based signaling exchange (offer/answer/ICE candidates pass through Firestore docs).
- TURN/STUN: Google's public STUN servers cover NAT traversal for most cases. TURN fallback for restrictive networks (~5-10% of users) requires hosted TURN — Twilio NAT Traversal or self-hosted Coturn.
- Audio: WebRTC includes audio by default; muted by user-controllable mic toggle.
- Bandwidth warning to shopper before connecting (data plan awareness).
- Auto-disconnect on context change (shopper leaves /shopping → call ends).

### Use cases unlocked
- Shopper walks down an aisle, caregiver sees live, says "the one on the right."
- Caregiver checks plate before user logs a meal.
- General "show me what you're seeing" coordination.

### Privacy / consent
- **Consent required from both parties** before connection. No silent connection.
- Active call indicator visible on both sides at all times.
- Either party can end the call instantly.
- Camera access permission requested fresh each call.
- HIPAA: if patients are involved, the live feed cannot be recorded or persisted; this is enforced by the no-storage architecture (no media server, peer-to-peer).

### Critical files (Phase 3)
- `lib/chat-video-signaling.ts` — NEW. WebRTC offer/answer exchange via Firestore.
- `components/chat/VideoCallButton.tsx` — initiate a video session.
- `components/chat/ActiveVideoCall.tsx` — full-screen video UI with end-call control.
- TURN credentials / hosted TURN provider integration (deferred until shipped).
- Audit message types: `'video-invite'`, `'video-accept'`, `'video-decline'`, `'video-end'` — system messages only, no video content.

### Verification
1. Initiate video → recipient gets invite → accepts → both streams connect.
2. End call from either side → both sides drop cleanly.
3. Audit log shows session-start, participants, session-end timestamps; no media references.
4. Bandwidth warning fires for shopper before connection.
5. Active-call indicator visible on both sides throughout.

## Phasing rationale

- **Phase 1 alone is high value** — text chat with context is 80% of the user need. Ship it, get feedback, decide if Phase 2/3 are worth the cost.
- **Phase 2 doubles utility for ~20% effort** — image upload reuses existing patterns (medication-image-upload pattern from medication feature).
- **Phase 3 is heavy** — WebRTC + signaling + TURN is a real lift, especially for HIPAA-aware deployment. Defer until Phase 1 + 2 demonstrate the chat surface is loved.

## What this PRD does NOT cover

- AI-assisted chat suggestions / canned replies (future).
- Chatbot integration (e.g., "ask the dietitian AI").
- Group chats (>2 participants) — schema supports it (`participants[]`) but UI ships 1:1 first.
- Voice messages (audio attachments).
- Voice-only calls (could be a Phase 3.5 — easier than video, same WebRTC core).
- Cross-tenant chat (different households talking to each other).
- Chat with non-app users (SMS bridge).

## Open questions

1. **Where does chat live in the IA?** Options: (a) under the notification bell, (b) a dedicated `/chat` tab in primary nav, (c) embedded modals only (no standalone view). Recommendation: (b) for discoverability, with (c) entry points from each context.
2. **Retention policy** — how long do text messages and images persist? HIPAA may require specific retention/destruction rules; needs legal/compliance review before Phase 2 ships.
3. **Notification provider** — already FCM? Verify before Phase 1 implementation.
4. **TURN provider for Phase 3** — Twilio is the safe default. Cost: ~$0.40/GB. Defer until Phase 3 is approved.

## Estimate

- Phase 1 (text chat): ~600-800 lines (types + ops lib + 2 routes + components + security rules + notification wiring).
- Phase 2 (image attachments): ~200 lines (reuse medication-image-upload patterns).
- Phase 3 (live video): ~800-1200 lines + infrastructure + privacy/consent flow + TURN provisioning.

Total: ~1600-2200 lines across 3 ships, plus infrastructure for Phase 3.
