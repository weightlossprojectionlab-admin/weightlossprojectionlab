# Flagstaff AI Support Service - Implementation Guide

## Overview

The Flagstaff AI Support Service provides a **100% self-service AI-powered support system** for the WPL platform. This implementation follows enterprise-grade architectural patterns with complete separation of concerns, HIPAA compliance, and production-ready error handling.

## Architecture

### Service Layer + Repository Pattern

```
flagstaff-support.ts
├── Service Layer (Business Logic)
│   ├── FlagstaffSupportService
│   │   ├── createConversation()
│   │   ├── sendMessage()
│   │   ├── endConversation()
│   │   ├── getConversationHistory()
│   │   └── escalateToBugReport()
│   │
│   ├── Knowledge Base Service
│   │   └── searchKnowledgeBase()
│   │
│   └── Flagstaff AI Client
│       └── callFlagstaffAI()
│
├── Repository Layer (Data Access)
│   └── ConversationRepository
│       ├── create()
│       ├── getById()
│       ├── appendMessage()
│       ├── update()
│       └── getUserConversations()
│
└── Utility Functions
    ├── sanitizePHI() - HIPAA compliance
    ├── logAuditEntry() - Audit logging
    ├── trackAnalytics() - Analytics tracking
    └── formatErrorMessage() - Error handling
```

## Key Features

### 1. HIPAA Compliance

**PHI Sanitization:**
- Automatically detects and redacts Protected Health Information (PHI)
- Patterns include: weight, medications, medical conditions, vital signs, dates
- **Never sends unsanitized PHI to Flagstaff AI**

```typescript
const { sanitized, hadPHI, detectedTypes } = sanitizePHI(userMessage);
// "I weigh 185 lbs" → "I weigh [WEIGHT_REDACTED]"
// "Taking metformin 500mg" → "Taking [MEDICATIONS_REDACTED] 500mg"
```

**Audit Logging:**
- All AI interactions logged for compliance
- Tracks: timestamp, user, action, conversation, PHI detection
- 7-year retention for HIPAA requirements

### 2. Race Condition Prevention

**Firestore Transactions:**
- Message appends use `runTransaction()` to prevent concurrent write conflicts
- Analytics updates use transactions for atomic operations
- Idempotent bug report creation (prevents duplicates)

```typescript
// Multiple simultaneous messages to same conversation
await runTransaction(db, async (transaction) => {
  const docSnap = await transaction.get(docRef);
  const currentMessages = docSnap.data().messages || [];
  transaction.update(docRef, {
    messages: [...currentMessages, newMessage], // Atomic append
  });
});
```

### 3. Knowledge Base Search

**Multi-Source Documentation Search:**
- Searches across: /support, /docs, /hipaa, /privacy, /security, /blog, etc.
- Weighted relevance scoring (support docs prioritized)
- Returns top 5 most relevant documents with snippets

**Production Implementation Notes:**
- Current: Simple keyword matching (mock implementation)
- Production: Integrate vector database (Pinecone, Weaviate) or full-text search (Algolia)

### 4. Analytics & Monitoring

**Conversation Analytics:**
- Daily aggregated metrics (totalConversations, resolutionRate, avgRating, etc.)
- Topic-based success tracking
- Documentation gap identification
- Non-blocking async tracking (doesn't slow down user experience)

**Documentation Gap Detection:**
- Tracks unsuccessful resolutions by topic
- Aggregates common questions without good answers
- Helps prioritize documentation improvements

### 5. Anonymous Support

**Access Control:**
- Authenticated users: Full conversation history, persistent data
- Anonymous users: Session-based conversations, no persistent history
- Firestore security rules enforce user-based access

### 6. Error Handling

**User-Friendly Error Messages:**
- Internal errors sanitized before showing to users
- API failures result in graceful fallback responses
- Audit log failures don't block user operations
- Analytics failures don't block user operations

## Usage Examples

### Creating a New Conversation

```typescript
import { createConversation } from '@/lib/ai/flagstaff-support';

// Authenticated user
const conversation = await createConversation({
  userId: 'user123',
  initialMessage: 'How do I log my weight?',
});

// Anonymous user
const anonConversation = await createConversation({
  userId: null,
  initialMessage: 'What features are available?',
});
```

### Sending Messages

```typescript
import { sendMessage } from '@/lib/ai/flagstaff-support';

const aiResponse = await sendMessage(
  conversationId,
  'Can you explain the pricing plans?',
  userId // or null for anonymous
);

console.log(aiResponse.content); // AI's response
console.log(aiResponse.documentationLinks); // Relevant doc links
console.log(aiResponse.confidence); // AI confidence (0-1)
console.log(aiResponse.shouldEscalateToBugReport); // Bug detection
```

### Ending with Feedback

```typescript
import { endConversation } from '@/lib/ai/flagstaff-support';

await endConversation(conversationId, userId, {
  rating: 5, // 1-5 stars
  text: 'Very helpful, thanks!', // Optional
});
```

### Escalating to Bug Report

```typescript
import { escalateToBugReport } from '@/lib/ai/flagstaff-support';

const bugReport = await escalateToBugReport({
  conversationId,
  userId,
  description: 'Unable to save weight entry - getting 500 error',
  severity: 'high',
  screenshot: 'data:image/png;base64,...', // Optional
});
```

### Retrieving Conversation History

```typescript
import { getConversationHistory } from '@/lib/ai/flagstaff-support';

// Authenticated users only (returns [] for anonymous)
const history = await getConversationHistory(userId, 10); // Last 10 conversations
```

### Searching Knowledge Base

```typescript
import { searchKnowledgeBase } from '@/lib/ai/flagstaff-support';

const docs = await searchKnowledgeBase('How do I cancel my subscription?');
// Returns: [{ path, title, snippet, relevanceScore, type }, ...]
```

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Required
FLAGSTAFF_AI_API_KEY=your-flagstaff-api-key

# Optional (defaults to https://api.flagstaff.ai/v1/chat)
FLAGSTAFF_AI_API_URL=https://api.flagstaff.ai/v1/chat
```

### AI Configuration

Adjust constants in `flagstaff-support.ts`:

```typescript
const AI_CONFIG = {
  MAX_MESSAGES_BEFORE_ESCALATION: 10, // Auto-suggest escalation after N messages
  MIN_CONFIDENCE_THRESHOLD: 0.3, // Low confidence threshold
  LOW_RATING_THRESHOLD: 2, // Ratings ≤ 2 considered unsuccessful
  MAX_TOPIC_TAGS: 5, // Maximum topic tags per conversation
  CONVERSATION_TIMEOUT_MINUTES: 30, // Idle timeout
  RATE_LIMIT_REQUESTS_PER_MINUTE: 10, // Rate limiting
};
```

## Integration with UI

### React Hook Example

```typescript
// hooks/useFlagstaffSupport.ts
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

  const startConversation = useCallback(async (initialMessage?: string) => {
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
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const send = useCallback(async (message: string) => {
    if (!conversation) throw new Error('No active conversation');

    setLoading(true);
    setError(null);
    try {
      const response = await sendMessage(
        conversation.id,
        message,
        user?.uid || null
      );
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversation, user]);

  const end = useCallback(async (rating: 1 | 2 | 3 | 4 | 5, text?: string) => {
    if (!conversation) throw new Error('No active conversation');

    setLoading(true);
    setError(null);
    try {
      await endConversation(conversation.id, user?.uid || null, { rating, text });
      setConversation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversation, user]);

  return {
    conversation,
    loading,
    error,
    startConversation,
    send,
    end,
  };
}
```

### Component Example

```tsx
// components/AISupportChat.tsx
'use client';

import { useState } from 'react';
import { useFlagstaffSupport } from '@/hooks/useFlagstaffSupport';

export function AISupportChat() {
  const { conversation, loading, send, end } = useFlagstaffSupport();
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!message.trim()) return;

    const response = await send(message);
    setMessage('');

    // Show AI response in UI
    console.log(response.content);
    console.log(response.documentationLinks);
  };

  const handleEnd = async (rating: number) => {
    await end(rating as 1 | 2 | 3 | 4 | 5);
  };

  return (
    <div className="ai-support-chat">
      {/* Conversation messages */}
      {conversation?.messages.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          <p>{msg.content}</p>
          {msg.documentLinks && (
            <div className="doc-links">
              {msg.documentLinks.map((link) => (
                <a key={link} href={link}>{link}</a>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Input */}
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask a question..."
        disabled={loading}
      />
      <button onClick={handleSend} disabled={loading}>
        Send
      </button>

      {/* End conversation */}
      <div className="feedback">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button key={rating} onClick={() => handleEnd(rating)}>
            {rating} ⭐
          </button>
        ))}
      </div>
    </div>
  );
}
```

## Security Considerations

### 1. API Key Security
- **Never expose** `FLAGSTAFF_AI_API_KEY` to client-side code
- Use server-side API routes or Firebase Functions for AI calls
- Rotate API keys regularly

### 2. PHI Protection
- All user messages are sanitized before sending to Flagstaff AI
- Audit logs track PHI detection for compliance
- Firestore security rules enforce user-based access

### 3. Rate Limiting
- Implement rate limiting to prevent API abuse
- Default: 10 requests/minute per user
- Use Upstash Redis for distributed rate limiting

### 4. Access Control
- Firestore rules ensure users can only access their own conversations
- Anonymous users limited to session-based conversations
- Admin access requires explicit authorization

## Performance Optimization

### 1. Caching
```typescript
// Cache knowledge base search results (24-hour TTL)
const cache = new Map<string, DocumentationReference[]>();

export async function searchKnowledgeBase(query: string) {
  const cacheKey = query.toLowerCase().trim();

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const results = await performSearch(query);
  cache.set(cacheKey, results);

  setTimeout(() => cache.delete(cacheKey), 24 * 60 * 60 * 1000); // 24h TTL

  return results;
}
```

### 2. Async Analytics
- Analytics tracking is non-blocking
- Failures don't interrupt user flow
- Batched writes reduce Firestore operations

### 3. Transaction Optimization
- Only use transactions where necessary (message appends)
- Analytics can use eventual consistency
- Read conversation once per operation

## Testing

### Unit Tests

```typescript
// __tests__/lib/ai/flagstaff-support.test.ts
import { sanitizePHI, searchKnowledgeBase } from '@/lib/ai/flagstaff-support';

describe('sanitizePHI', () => {
  it('should redact weight information', () => {
    const result = sanitizePHI('I weigh 185 lbs');
    expect(result.sanitized).toBe('I weigh [WEIGHT_REDACTED]');
    expect(result.hadPHI).toBe(true);
    expect(result.detectedTypes).toContain('weight');
  });

  it('should redact medications', () => {
    const result = sanitizePHI('Taking metformin 500mg daily');
    expect(result.sanitized).toContain('[MEDICATIONS_REDACTED]');
    expect(result.hadPHI).toBe(true);
  });

  it('should handle text without PHI', () => {
    const result = sanitizePHI('How do I log my meals?');
    expect(result.sanitized).toBe('How do I log my meals?');
    expect(result.hadPHI).toBe(false);
  });
});

describe('searchKnowledgeBase', () => {
  it('should return relevant documentation', async () => {
    const results = await searchKnowledgeBase('subscription pricing');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('path');
    expect(results[0]).toHaveProperty('relevanceScore');
  });
});
```

### Integration Tests

```typescript
import { createConversation, sendMessage, endConversation } from '@/lib/ai/flagstaff-support';

describe('Conversation Flow', () => {
  it('should create, send, and end conversation', async () => {
    // Create
    const conversation = await createConversation({
      userId: 'test-user',
      initialMessage: 'Test question',
    });
    expect(conversation.id).toBeDefined();
    expect(conversation.messages.length).toBeGreaterThan(0);

    // Send
    const response = await sendMessage(
      conversation.id,
      'Follow-up question',
      'test-user'
    );
    expect(response.content).toBeDefined();
    expect(response.documentationLinks.length).toBeGreaterThan(0);

    // End
    await endConversation(conversation.id, 'test-user', {
      rating: 5,
      text: 'Great support!',
    });
  });
});
```

## Monitoring & Alerts

### Key Metrics to Track

1. **Resolution Rate**: % conversations resolved with rating ≥ 4
2. **Average Confidence**: AI confidence scores across all responses
3. **Escalation Rate**: % conversations escalated to bug reports (target <5%)
4. **PHI Detection Rate**: Track for potential data leakage issues
5. **API Error Rate**: Flagstaff AI API failures (alert if >5%)
6. **Average Response Time**: AI response latency (target <3s p95)

### Firebase Analytics Integration

```typescript
import { logEvent } from 'firebase/analytics';

// Track conversation started
logEvent(analytics, 'ai_conversation_started', {
  user_type: userId ? 'authenticated' : 'anonymous',
});

// Track resolution
logEvent(analytics, 'ai_conversation_resolved', {
  rating: feedback.rating,
  message_count: conversation.messages.length,
  duration_seconds: durationSeconds,
});

// Track escalation
logEvent(analytics, 'ai_bug_escalated', {
  severity: input.severity,
  topic: conversation.topicTags[0],
});
```

## Production Checklist

- [ ] `FLAGSTAFF_AI_API_KEY` configured in production environment
- [ ] Firestore security rules deployed (from Phase 1)
- [ ] Firestore indexes created (from Phase 1)
- [ ] Rate limiting configured (Upstash Redis recommended)
- [ ] Error tracking enabled (Sentry integration)
- [ ] Analytics dashboard set up (admin panel)
- [ ] Knowledge base content populated
- [ ] PHI sanitization patterns reviewed by compliance team
- [ ] Audit log retention policy configured (7 years HIPAA)
- [ ] Monitoring alerts configured for key metrics
- [ ] Load testing completed (target: 100 concurrent conversations)
- [ ] Fallback messaging tested (API failures, timeouts)

## Future Enhancements

### Phase 2 Improvements

1. **Vector Search Integration**
   - Replace keyword matching with semantic search
   - Use embeddings for documentation (OpenAI, Cohere, etc.)
   - Improve relevance ranking significantly

2. **Conversation Context Window**
   - Increase from 5 to 20+ previous messages
   - Implement conversation summarization for long threads
   - Better multi-turn conversation handling

3. **Proactive Support**
   - Detect user struggles (analytics-based)
   - Offer help before user asks
   - Personalized documentation recommendations

4. **Multi-Modal Support**
   - Screenshot analysis (vision models)
   - Voice input/output
   - Video tutorials integration

5. **A/B Testing Framework**
   - Test different AI response strategies
   - Measure documentation link click-through
   - Optimize feedback prompting timing

## Support & Troubleshooting

### Common Issues

**Issue: "FLAGSTAFF_AI_API_KEY not configured" error**
- Ensure `.env.local` has `FLAGSTAFF_AI_API_KEY=your-key`
- Restart development server after adding env var
- Verify env var is loaded: `console.log(process.env.FLAGSTAFF_AI_API_KEY)`

**Issue: Conversations not being created**
- Check Firestore security rules are deployed
- Verify Firebase initialization in `lib/firebase.ts`
- Check browser console for Firestore permission errors

**Issue: PHI showing in AI responses**
- Verify `sanitizePHI()` is called before `callFlagstaffAI()`
- Add additional patterns to `PHI_PATTERNS` if needed
- Review audit logs for PHI detection rate

**Issue: Poor documentation search results**
- Implement vector search (production recommendation)
- Add more documentation sources
- Improve keyword extraction algorithm

## License

This implementation is part of the WPL platform and follows the same license terms.

---

**Questions or Issues?**
Contact the development team or file an issue in the repository.
