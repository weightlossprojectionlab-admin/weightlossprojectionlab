// AI Orchestration Tests
// PRD Reference: Phase 3 - AI Orchestration Layer

import { describe, test, expect, beforeAll } from '@jest/globals';
import { getTemplate, renderTemplate, validateVariables } from '@/lib/ai/promptTemplates';
import { selectModel } from '@/lib/ai/modelRouter';
import { redactPII, containsPII } from '@/lib/ai/piiRedaction';
import { AIContext } from '@/types/ai';

describe('Prompt Templates', () => {
  test('should load coach_weekly_plan template', () => {
    const template = getTemplate('coach_weekly_plan');
    expect(template).not.toBeNull();
    expect(template?.id).toBe('coach_weekly_plan');
    expect(template?.category).toBe('coaching');
  });

  test('should render template with variables', () => {
    const rendered = renderTemplate('nudge_motivation', {
      recentAction: 'logged weight',
      daysSinceLastLog: '1',
      currentGoal: 'lose 10kg',
      tone: 'supportive',
    });
    expect(rendered).toContain('logged weight');
    expect(rendered).toContain('lose 10kg');
  });

  test('should validate missing variables', () => {
    const validation = validateVariables('coach_weekly_plan', {
      currentWeight: '80',
      // Missing other required variables
    });
    expect(validation.valid).toBe(false);
    expect(validation.missing.length).toBeGreaterThan(0);
  });
});

describe('Model Router', () => {
  test('should select fast model for Public data', () => {
    const context: AIContext = {
      userId: 'test-user',
      templateId: 'test',
      variables: {},
      dataSensitivity: 'Public',
    };
    const model = selectModel(context);
    expect(model.tier).toBe('fast');
  });

  test('should upgrade to balanced for PHI data', () => {
    const context: AIContext = {
      userId: 'test-user',
      templateId: 'test',
      variables: {},
      dataSensitivity: 'PHI',
    };
    const model = selectModel(context);
    expect(model.tier).not.toBe('fast');
  });

  test('should use accurate model for Financial data', () => {
    const context: AIContext = {
      userId: 'test-user',
      templateId: 'test',
      variables: {},
      dataSensitivity: 'Financial',
      requiresHighAccuracy: true,
    };
    const model = selectModel(context);
    expect(model.tier).toBe('accurate');
  });
});

describe('PII Redaction', () => {
  test('should redact email addresses', () => {
    const text = 'Contact me at john.doe@example.com';
    const result = redactPII(text, ['email']);
    expect(result.redactedText).toContain('[REDACTED_EMAIL]');
    expect(result.redactedText).not.toContain('john.doe@example.com');
    expect(result.redactions.length).toBe(1);
  });

  test('should redact phone numbers', () => {
    const text = 'Call me at 555-123-4567';
    const result = redactPII(text, ['phone']);
    expect(result.redactedText).toContain('[REDACTED_PHONE]');
  });

  test('should detect PII presence', () => {
    expect(containsPII('john.doe@example.com')).toBe(true);
    expect(containsPII('This is clean text')).toBe(false);
  });

  test('should redact multiple PII types', () => {
    const text = 'John Doe (john@example.com) - 555-1234';
    const result = redactPII(text);
    expect(result.redactions.length).toBeGreaterThan(0);
    expect(result.redactedText).not.toContain('john@example.com');
  });
});

// TODO: Add integration tests for full orchestration flow
// TODO: Add tests for decisionLogger
// TODO: Add mock OpenAI responses for e2e testing
