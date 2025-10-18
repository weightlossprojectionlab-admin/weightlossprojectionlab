// PII Redaction Utilities
// PRD Reference: ai_and_data_governance (PRD v1.3.7)
// TODO: Link to PRD v1.3.7 § ai_and_data_governance.data_sensitivity

import { PII_RedactionResult } from '@/types/ai';

/**
 * Regular expressions for common PII patterns
 */
const PII_PATTERNS = {
  email: {
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[REDACTED_EMAIL]',
  },
  phone: {
    regex: /\b(?:\+?1[-.]?)?(?:\([0-9]{3}\)|[0-9]{3})[-.]?[0-9]{3}[-.]?[0-9]{4}\b/g,
    replacement: '[REDACTED_PHONE]',
  },
  ssn: {
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
  },
  // Basic name pattern (capitalized words, 2-4 words)
  name: {
    regex: /\b([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})\b/g,
    replacement: '[REDACTED_NAME]',
  },
  // Credit card numbers
  creditCard: {
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '[REDACTED_CC]',
  },
  // IP addresses
  ipAddress: {
    regex: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    replacement: '[REDACTED_IP]',
  },
  // Street addresses (basic pattern)
  address: {
    regex: /\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi,
    replacement: '[REDACTED_ADDRESS]',
  },
} as const;

/**
 * Redact PII from text using regex patterns
 *
 * @param text - Text to redact
 * @param piiTypes - Specific PII types to redact (if not provided, redacts all)
 * @returns Redacted text and list of redactions made
 */
export function redactPII(
  text: string,
  piiTypes?: Array<keyof typeof PII_PATTERNS>
): PII_RedactionResult {
  let redactedText = text;
  const redactions: PII_RedactionResult['redactions'] = [];

  const typesToRedact = piiTypes || (Object.keys(PII_PATTERNS) as Array<keyof typeof PII_PATTERNS>);

  for (const type of typesToRedact) {
    const pattern = PII_PATTERNS[type];
    if (!pattern) continue;

    const matches = text.matchAll(pattern.regex);
    for (const match of matches) {
      if (match[0]) {
        redactions.push({
          type,
          original: match[0],
          replacement: pattern.replacement,
          position: match.index || 0,
        });
        redactedText = redactedText.replace(match[0], pattern.replacement);
      }
    }
  }

  return {
    redactedText,
    redactions,
  };
}

/**
 * Redact specific fields from an object
 *
 * @param data - Object containing data
 * @param fieldsToRedact - Array of field names to redact
 * @returns New object with redacted fields
 */
export function redactFields<T extends Record<string, any>>(
  data: T,
  fieldsToRedact: string[]
): T {
  const redacted = { ...data } as any;

  for (const field of fieldsToRedact) {
    if (field in redacted && typeof redacted[field] === 'string') {
      const result = redactPII(redacted[field]);
      redacted[field] = result.redactedText;
    }
  }

  return redacted as T;
}

/**
 * Check if text contains potential PII
 *
 * @param text - Text to check
 * @returns True if potential PII detected
 */
export function containsPII(text: string): boolean {
  for (const pattern of Object.values(PII_PATTERNS)) {
    if (pattern.regex.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Sanitize user-generated content before AI processing
 * Redacts PII and applies basic content filtering
 *
 * @param content - User content
 * @param strictMode - If true, applies more aggressive redaction
 * @returns Sanitized content
 */
export function sanitizeForAI(content: string, strictMode = false): string {
  let sanitized = content;

  // Redact all PII
  const result = redactPII(sanitized);
  sanitized = result.redactedText;

  // In strict mode, also remove potential identifiers
  if (strictMode) {
    // Remove @ mentions
    sanitized = sanitized.replace(/@\w+/g, '[MENTION]');

    // Remove URLs
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[URL]');

    // Remove hashtags
    sanitized = sanitized.replace(/#\w+/g, '[HASHTAG]');
  }

  return sanitized;
}

/**
 * Extract and redact email addresses, returning mapping
 * Useful for later re-identification if needed
 *
 * @param text - Text containing emails
 * @returns Redacted text and email mapping
 */
export function redactEmailsWithMapping(text: string): {
  redactedText: string;
  emailMap: Record<string, string>;  // token -> original email
} {
  const emailMap: Record<string, string> = {};
  let counter = 1;

  const redactedText = text.replace(
    PII_PATTERNS.email.regex,
    (match) => {
      const token = `[EMAIL_${counter}]`;
      emailMap[token] = match;
      counter++;
      return token;
    }
  );

  return { redactedText, emailMap };
}
