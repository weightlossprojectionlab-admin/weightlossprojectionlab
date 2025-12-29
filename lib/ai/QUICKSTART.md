# Flagstaff AI Support - Quick Start Guide

## 🚀 5-Minute Integration

### Step 1: Configure Environment (1 minute)

Add to `.env.local`:
```bash
FLAGSTAFF_AI_API_KEY=your-flagstaff-api-key
# Optional: FLAGSTAFF_AI_API_URL=https://api.flagstaff.ai/v1/chat
```

### Step 2: Create React Hook (2 minutes)

Create `hooks/useFlagstaffSupport.ts`:

```typescript
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  createConversation,
  sendMessage,
  endConversation,
  type AIConversation,
  type FlagstaffResponse,
} from '@/lib/ai/flagstaff-support';

export function useFlagstaffSupport() {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (initialMessage?: string) => {
    setLoading(true);
    setError(null);
    try {
      const conv = await createConversation({
        userId: user?.uid || null,
        initialMessage,
      });
      setConversation(conv);
      return conv;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const send = useCallback(async (message: string) => {
    if (!conversation) throw new Error('No active conversation');
    setLoading(true);
    try {
      const response = await sendMessage(conversation.id, message, user?.uid || null);
      return response;
    } finally {
      setLoading(false);
    }
  }, [conversation, user]);

  const end = useCallback(async (rating: 1 | 2 | 3 | 4 | 5, text?: string) => {
    if (!conversation) throw new Error('No active conversation');
    await endConversation(conversation.id, user?.uid || null, { rating, text });
    setConversation(null);
  }, [conversation, user]);

  return { conversation, loading, error, start, send, end };
}
```

### Step 3: Build UI Component (2 minutes)

Create `components/AISupportChat.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useFlagstaffSupport } from '@/hooks/useFlagstaffSupport';

export function AISupportChat() {
  const { conversation, loading, start, send, end } = useFlagstaffSupport();
  const [input, setInput] = useState('');

  const handleStart = async () => {
    await start('Hello, I need help with...');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    await send(input);
    setInput('');
  };

  const handleEnd = async (rating: number) => {
    await end(rating as 1 | 2 | 3 | 4 | 5);
  };

  return (
    <div className="ai-support-chat">
      {!conversation ? (
        <button onClick={handleStart} disabled={loading}>
          Start AI Support Chat
        </button>
      ) : (
        <>
          {/* Messages */}
          <div className="messages">
            {conversation.messages.map((msg, i) => (
              <div key={i} className={msg.role}>
                <p>{msg.content}</p>
                {msg.documentLinks?.map((link) => (
                  <a key={link} href={link}>{link}</a>
                ))}
              </div>
            ))}
          </div>

          {/* Input */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
          />
          <button onClick={handleSend} disabled={loading}>Send</button>

          {/* Feedback */}
          <div className="feedback">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button key={rating} onClick={() => handleEnd(rating)}>
                {rating} ⭐
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

## ✅ Done!

You now have a fully functional AI support system.

## 📖 Common Use Cases

### Use Case 1: Simple Q&A

```typescript
import { createConversation, sendMessage } from '@/lib/ai/flagstaff-support';

// User asks question
const conversation = await createConversation({
  userId: user.uid,
  initialMessage: 'How do I track my weight?',
});

// AI responds with documentation links
console.log(conversation.messages[1]?.documentLinks);
// => ['/docs/weight-tracking', '/support/getting-started']
```

### Use Case 2: Anonymous User

```typescript
// Anonymous user (no login required)
const conversation = await createConversation({
  userId: null, // null = anonymous
  initialMessage: 'What features do you offer?',
});

// After 3 conversations, prompt to sign up
```

### Use Case 3: Bug Escalation

```typescript
import { escalateToBugReport } from '@/lib/ai/flagstaff-support';

// User encounters bug, AI can't help
const bugReport = await escalateToBugReport({
  conversationId: conversation.id,
  userId: user.uid,
  description: 'Unable to save weight entry - 500 error',
  severity: 'high',
  screenshot: 'data:image/png;base64,...',
});

console.log(`Bug report created: ${bugReport.id}`);
```

### Use Case 4: Conversation History

```typescript
import { getConversationHistory } from '@/lib/ai/flagstaff-support';

// Get user's last 10 conversations
const history = await getConversationHistory(user.uid, 10);

history.forEach((conv) => {
  console.log(`${conv.startedAt}: ${conv.topicTags.join(', ')}`);
  console.log(`Rating: ${conv.feedbackRating || 'N/A'}`);
});
```

### Use Case 5: Knowledge Base Search

```typescript
import { searchKnowledgeBase } from '@/lib/ai/flagstaff-support';

// Search documentation
const docs = await searchKnowledgeBase('HIPAA compliance');

docs.forEach((doc) => {
  console.log(`${doc.title} (${doc.path})`);
  console.log(`Relevance: ${doc.relevanceScore}`);
  console.log(`Snippet: ${doc.snippet}`);
});
```

## 🔒 HIPAA Compliance Example

```typescript
import { sanitizePHI } from '@/lib/ai/flagstaff-support';

// User message contains PHI
const userInput = 'I weigh 185 lbs and take metformin for my diabetes';

// Sanitize before logging or sending to analytics
const { sanitized, hadPHI, detectedTypes } = sanitizePHI(userInput);

console.log(sanitized);
// => "I weigh [WEIGHT_REDACTED] and take [MEDICATIONS_REDACTED] for my [MEDICALCONDITIONS_REDACTED]"

console.log(hadPHI); // => true
console.log(detectedTypes); // => ['weight', 'medications', 'medicalConditions']

// ✅ PHI automatically sanitized before sending to Flagstaff AI
```

## 🧪 Testing Your Integration

Run the test script:

```bash
# Test PHI sanitization
node scripts/test-phi-sanitization.js

# Expected output: ✅ All tests passed!
```

## 🎨 Styling Example (Tailwind CSS)

```tsx
<div className="ai-support-chat max-w-2xl mx-auto p-4">
  <div className="messages space-y-4 mb-4">
    {conversation?.messages.map((msg, i) => (
      <div
        key={i}
        className={`p-4 rounded-lg ${
          msg.role === 'user'
            ? 'bg-blue-100 ml-12'
            : 'bg-gray-100 mr-12'
        }`}
      >
        <p className="text-gray-900">{msg.content}</p>
        {msg.documentLinks && (
          <div className="mt-2 space-x-2">
            {msg.documentLinks.map((link) => (
              <a
                key={link}
                href={link}
                className="text-blue-600 hover:underline text-sm"
              >
                📄 {link}
              </a>
            ))}
          </div>
        )}
      </div>
    ))}
  </div>

  <div className="flex gap-2">
    <input
      className="flex-1 px-4 py-2 border rounded-lg"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Ask a question..."
      disabled={loading}
    />
    <button
      className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      onClick={handleSend}
      disabled={loading}
    >
      {loading ? 'Sending...' : 'Send'}
    </button>
  </div>

  <div className="mt-4 flex gap-2 justify-center">
    {[1, 2, 3, 4, 5].map((rating) => (
      <button
        key={rating}
        onClick={() => handleEnd(rating)}
        className="px-3 py-1 border rounded hover:bg-gray-100"
      >
        {rating} ⭐
      </button>
    ))}
  </div>
</div>
```

## 📊 Monitoring Your AI Support

```typescript
// Track conversation metrics
import { logEvent } from 'firebase/analytics';

// Conversation started
logEvent(analytics, 'ai_conversation_started', {
  user_type: userId ? 'authenticated' : 'anonymous',
});

// Conversation resolved
logEvent(analytics, 'ai_conversation_resolved', {
  rating: feedback.rating,
  message_count: conversation.messages.length,
});

// Bug escalated
logEvent(analytics, 'ai_bug_escalated', {
  severity: input.severity,
});
```

## 🚨 Error Handling

```typescript
import { useFlagstaffSupport } from '@/hooks/useFlagstaffSupport';

function MyComponent() {
  const { error, send } = useFlagstaffSupport();

  const handleSend = async (message: string) => {
    try {
      await send(message);
    } catch (err) {
      // Error is already set in hook
      console.error('Failed to send message:', err);

      // Show toast notification
      toast.error(error || 'Failed to send message');
    }
  };

  return (
    <div>
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
```

## 🔗 Additional Resources

- **Full Documentation**: `lib/ai/README-FLAGSTAFF-SUPPORT.md`
- **Implementation Details**: `lib/ai/flagstaff-support.ts`
- **Tests**: `lib/ai/__tests__/flagstaff-support.test.ts`
- **Summary**: `FLAGSTAFF_SUPPORT_IMPLEMENTATION_SUMMARY.md`

## ❓ Troubleshooting

**Q: "FLAGSTAFF_AI_API_KEY not configured" error**
- A: Add `FLAGSTAFF_AI_API_KEY=your-key` to `.env.local`
- Restart dev server: `npm run dev`

**Q: Conversations not being created**
- A: Check Firestore security rules are deployed
- Verify Firebase is initialized in `lib/firebase.ts`

**Q: AI responses taking too long**
- A: Check Flagstaff AI API status
- Consider implementing loading states
- Target: <3s response time (p95)

**Q: PHI showing in AI responses**
- A: Verify `sanitizePHI()` is working
- Run test: `node scripts/test-phi-sanitization.js`
- Check audit logs for PHI detection rate

## 📞 Support

Need help? Check:
1. Full documentation: `lib/ai/README-FLAGSTAFF-SUPPORT.md`
2. Implementation summary: `FLAGSTAFF_SUPPORT_IMPLEMENTATION_SUMMARY.md`
3. File an issue in the repository

---

**You're all set!** Start building amazing AI-powered support experiences. 🎉
