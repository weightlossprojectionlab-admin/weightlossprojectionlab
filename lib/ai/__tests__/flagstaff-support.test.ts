/**
 * Unit tests for Flagstaff AI Support Service
 *
 * Tests cover:
 * - PHI sanitization (HIPAA compliance)
 * - Knowledge base search
 * - Error handling
 * - Conversation flow
 */

import { sanitizePHI, searchKnowledgeBase } from '../flagstaff-support';

describe('Flagstaff Support Service', () => {
  describe('sanitizePHI', () => {
    it('should redact weight information', () => {
      const result = sanitizePHI('I weigh 185 lbs and want to lose weight');
      expect(result.sanitized).toBe('I weigh [WEIGHT_REDACTED] and want to lose weight');
      expect(result.hadPHI).toBe(true);
      expect(result.detectedTypes).toContain('weight');
    });

    it('should redact multiple weight formats', () => {
      const cases = [
        { input: 'I weigh 185 pounds', expected: 'I weigh [WEIGHT_REDACTED]' },
        { input: 'Current weight: 75 kg', expected: 'Current weight: [WEIGHT_REDACTED]' },
        { input: '200lbs is my goal', expected: '[WEIGHT_REDACTED] is my goal' },
      ];

      cases.forEach(({ input, expected }) => {
        const result = sanitizePHI(input);
        expect(result.sanitized).toBe(expected);
        expect(result.hadPHI).toBe(true);
      });
    });

    it('should redact medications', () => {
      const result = sanitizePHI('Taking metformin 500mg daily');
      expect(result.sanitized).toContain('[MEDICATIONS_REDACTED]');
      expect(result.hadPHI).toBe(true);
      expect(result.detectedTypes).toContain('medications');
    });

    it('should redact multiple medications', () => {
      const result = sanitizePHI('On metformin, insulin, and ozempic');
      expect(result.hadPHI).toBe(true);
      expect(result.detectedTypes).toContain('medications');
    });

    it('should redact medical conditions', () => {
      const result = sanitizePHI('I have diabetes type 2');
      expect(result.sanitized).toContain('[MEDICALCONDITIONS_REDACTED]');
      expect(result.hadPHI).toBe(true);
      expect(result.detectedTypes).toContain('medicalConditions');
    });

    it('should redact vital signs', () => {
      const result = sanitizePHI('My BP: 120/80 this morning');
      expect(result.sanitized).toContain('[VITALNUMBERS_REDACTED]');
      expect(result.hadPHI).toBe(true);
      expect(result.detectedTypes).toContain('vitalNumbers');
    });

    it('should redact dates', () => {
      const result = sanitizePHI('Last checkup was on 12/15/2024');
      expect(result.sanitized).toContain('[DATES_REDACTED]');
      expect(result.hadPHI).toBe(true);
      expect(result.detectedTypes).toContain('dates');
    });

    it('should handle text without PHI', () => {
      const result = sanitizePHI('How do I log my meals?');
      expect(result.sanitized).toBe('How do I log my meals?');
      expect(result.hadPHI).toBe(false);
      expect(result.detectedTypes).toHaveLength(0);
    });

    it('should handle multiple PHI types in one message', () => {
      const result = sanitizePHI('I weigh 185 lbs, take metformin, and have diabetes');
      expect(result.hadPHI).toBe(true);
      expect(result.detectedTypes.length).toBeGreaterThan(1);
      expect(result.sanitized).toContain('[WEIGHT_REDACTED]');
      expect(result.sanitized).toContain('[MEDICATIONS_REDACTED]');
      expect(result.sanitized).toContain('[MEDICALCONDITIONS_REDACTED]');
    });

    it('should handle empty strings', () => {
      const result = sanitizePHI('');
      expect(result.sanitized).toBe('');
      expect(result.hadPHI).toBe(false);
    });

    it('should be case-insensitive', () => {
      const result = sanitizePHI('Taking METFORMIN and have DIABETES');
      expect(result.hadPHI).toBe(true);
    });
  });

  describe('searchKnowledgeBase', () => {
    it('should return array of documentation references', async () => {
      const results = await searchKnowledgeBase('subscription pricing');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return results with required fields', async () => {
      const results = await searchKnowledgeBase('weight tracking');

      if (results.length > 0) {
        const result = results[0]!;
        expect(result).toHaveProperty('path');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('snippet');
        expect(result).toHaveProperty('relevanceScore');
        expect(result).toHaveProperty('type');
      }
    });

    it('should return max 5 results', async () => {
      const results = await searchKnowledgeBase('how to use platform');
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should rank results by relevance', async () => {
      const results = await searchKnowledgeBase('HIPAA compliance privacy');

      if (results.length > 1) {
        // Verify descending relevance scores
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i]!.relevanceScore).toBeGreaterThanOrEqual(
            results[i + 1]!.relevanceScore
          );
        }
      }
    });

    it('should handle empty queries', async () => {
      const results = await searchKnowledgeBase('');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle special characters', async () => {
      const results = await searchKnowledgeBase('$%^&*()');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle sanitizePHI with undefined input', () => {
      // @ts-expect-error Testing runtime error handling
      expect(() => sanitizePHI(undefined)).not.toThrow();
    });

    it('should handle sanitizePHI with null input', () => {
      // @ts-expect-error Testing runtime error handling
      expect(() => sanitizePHI(null)).not.toThrow();
    });
  });
});

/**
 * Integration tests
 *
 * NOTE: These require Firebase connection and mocked Flagstaff AI API
 * Uncomment when integration testing environment is set up
 */
/*
import {
  createConversation,
  sendMessage,
  endConversation,
  escalateToBugReport,
  getConversationHistory,
} from '../flagstaff-support';

describe('Conversation Flow (Integration)', () => {
  const testUserId = 'test-user-123';

  it('should create conversation', async () => {
    const conversation = await createConversation({
      userId: testUserId,
    });

    expect(conversation.id).toBeDefined();
    expect(conversation.userId).toBe(testUserId);
    expect(conversation.status).toBe('active');
    expect(conversation.messages).toHaveLength(0);
  });

  it('should create conversation with initial message', async () => {
    const conversation = await createConversation({
      userId: testUserId,
      initialMessage: 'How do I track my weight?',
    });

    expect(conversation.messages.length).toBeGreaterThan(0);
    expect(conversation.messages[0]!.role).toBe('user');
  });

  it('should send message and get AI response', async () => {
    const conversation = await createConversation({
      userId: testUserId,
    });

    const response = await sendMessage(
      conversation.id,
      'What are the pricing plans?',
      testUserId
    );

    expect(response.content).toBeDefined();
    expect(response.documentationLinks).toBeDefined();
    expect(Array.isArray(response.documentationLinks)).toBe(true);
    expect(response.topicTags).toBeDefined();
    expect(typeof response.confidence).toBe('number');
  });

  it('should end conversation with feedback', async () => {
    const conversation = await createConversation({
      userId: testUserId,
    });

    await expect(
      endConversation(conversation.id, testUserId, {
        rating: 5,
        text: 'Very helpful!',
      })
    ).resolves.not.toThrow();
  });

  it('should escalate to bug report', async () => {
    const conversation = await createConversation({
      userId: testUserId,
      initialMessage: 'I cannot save my weight entry',
    });

    const bugReport = await escalateToBugReport({
      conversationId: conversation.id,
      userId: testUserId,
      description: 'Save button not working, returns 500 error',
      severity: 'high',
    });

    expect(bugReport.id).toBeDefined();
    expect(bugReport.conversationId).toBe(conversation.id);
    expect(bugReport.severity).toBe('high');
    expect(bugReport.status).toBe('new');
  });

  it('should prevent duplicate bug reports', async () => {
    const conversation = await createConversation({
      userId: testUserId,
    });

    const bugReport1 = await escalateToBugReport({
      conversationId: conversation.id,
      userId: testUserId,
      description: 'Bug description',
      severity: 'medium',
    });

    const bugReport2 = await escalateToBugReport({
      conversationId: conversation.id,
      userId: testUserId,
      description: 'Same bug, different description',
      severity: 'high',
    });

    expect(bugReport1.id).toBe(bugReport2.id); // Should return existing
  });

  it('should retrieve conversation history', async () => {
    const history = await getConversationHistory(testUserId, 10);
    expect(Array.isArray(history)).toBe(true);
  });

  it('should enforce access control', async () => {
    const conversation = await createConversation({
      userId: testUserId,
    });

    // Different user tries to access
    await expect(
      sendMessage(conversation.id, 'Test message', 'different-user-456')
    ).rejects.toThrow();
  });

  it('should handle anonymous users', async () => {
    const conversation = await createConversation({
      userId: null,
    });

    expect(conversation.userId).toBeNull();

    const response = await sendMessage(
      conversation.id,
      'Anonymous question',
      null
    );

    expect(response).toBeDefined();

    // Anonymous users should not have history
    const history = await getConversationHistory(null);
    expect(history).toHaveLength(0);
  });
});
*/
