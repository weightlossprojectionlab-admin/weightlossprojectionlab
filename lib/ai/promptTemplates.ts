// AI Prompt Templates Library
// PRD Reference: ai_and_data_governance (PRD v1.3.7)
// TODO: Link to PRD v1.3.7 § ai_and_data_governance

import { PromptTemplate, PromptCategory, ModelTier } from '@/types/ai';

/**
 * Centralized prompt template library with PII field tagging
 * All templates include variable placeholders and PII redaction specs
 */
export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  // Coaching Templates
  coach_weekly_plan: {
    id: 'coach_weekly_plan',
    name: 'Generate Weekly AI Coach Plan',
    category: 'coaching',
    template: `You are AISA, a supportive weight loss coach. Generate a personalized 7-day action plan for this user:

User Progress:
- Current weight: {{currentWeight}} kg
- Goal weight: {{goalWeight}} kg
- Current streak: {{currentStreak}} days
- Recent adherence: {{adherence}}%
- Recent weight logs: {{recentWeightLogs}}

Create 7 daily actions that are:
1. Specific and actionable
2. Achievable given their current habits
3. Progressive in difficulty
4. Supportive and non-judgmental

Return JSON format:
{
  "days": [
    { "day": 1, "action": "...", "rationale": "..." }
  ]
}`,
    variables: ['currentWeight', 'goalWeight', 'currentStreak', 'adherence', 'recentWeightLogs'],
    piiFields: [],  // No PII in this template
    modelPreference: 'balanced',
    maxTokens: 1000,
    temperature: 0.7,
    createdAt: new Date('2025-10-07'),
    updatedAt: new Date('2025-10-07'),
  },

  nudge_motivation: {
    id: 'nudge_motivation',
    name: 'Daily Motivational Nudge',
    category: 'coaching',
    template: `Generate a short (2-3 sentences) motivational nudge for a user:

Context:
- Recent action: {{recentAction}}
- Days since last log: {{daysSinceLastLog}}
- Current goal: {{currentGoal}}
- Tone: {{tone}} (supportive/energetic/calm)

Create an encouraging message that:
1. Acknowledges their progress
2. Provides a specific next step
3. Is positive and body-positive

Return plain text only.`,
    variables: ['recentAction', 'daysSinceLastLog', 'currentGoal', 'tone'],
    piiFields: [],
    modelPreference: 'fast',
    maxTokens: 150,
    temperature: 0.8,
    createdAt: new Date('2025-10-07'),
    updatedAt: new Date('2025-10-07'),
  },

  // Nutrition Templates
  meal_analysis_followup: {
    id: 'meal_analysis_followup',
    name: 'Meal Analysis Follow-up Insights',
    category: 'nutrition',
    template: `Provide follow-up nutrition insights based on a meal photo analysis:

Meal Analysis:
- Detected foods: {{detectedFoods}}
- Estimated calories: {{calories}} kcal
- Macros: {{macros}}
- Meal type: {{mealType}}

User Context:
- Daily calorie target: {{dailyTarget}} kcal
- Calories consumed today: {{caloriesConsumed}} kcal
- User preferences: {{preferences}}

Provide:
1. One nutritional highlight (what they did well)
2. One gentle suggestion (if any)
3. One tip for their next meal

Keep it positive and educational. Return JSON:
{
  "highlight": "...",
  "suggestion": "...",
  "nextMealTip": "..."
}`,
    variables: ['detectedFoods', 'calories', 'macros', 'mealType', 'dailyTarget', 'caloriesConsumed', 'preferences'],
    piiFields: [],  // PHI (meal data) but no direct PII
    modelPreference: 'balanced',
    maxTokens: 300,
    temperature: 0.6,
    createdAt: new Date('2025-10-07'),
    updatedAt: new Date('2025-10-07'),
  },

  // Moderation Templates
  moderation_risk_assess: {
    id: 'moderation_risk_assess',
    name: 'Risk Assessment for Moderation Case',
    category: 'moderation',
    template: `Analyze this moderation case and provide risk assessment:

Case Details:
- Reason: {{reason}}
- Description: {{description}}
- Evidence summary: {{evidenceSummary}}
- Target user history: {{targetHistory}}

Assess:
1. Risk level (0-100)
2. Recommended action
3. Confidence in assessment
4. Rationale

Return JSON:
{
  "riskScore": 0-100,
  "recommendation": "refund_full|refund_partial|deny|review_manual",
  "confidence": 0.0-1.0,
  "rationale": "..."
}`,
    variables: ['reason', 'description', 'evidenceSummary', 'targetHistory'],
    piiFields: ['description'],  // May contain user names/emails
    modelPreference: 'accurate',
    maxTokens: 400,
    temperature: 0.3,  // Low temperature for consistent moderation
    createdAt: new Date('2025-10-07'),
    updatedAt: new Date('2025-10-07'),
  },

  support_sentiment_analysis: {
    id: 'support_sentiment_analysis',
    name: 'Support Message Sentiment Analysis',
    category: 'support',
    template: `Analyze the sentiment and intent of this support/dispute message:

Message: {{message}}
User context: {{userContext}}

Determine:
1. Overall sentiment (positive/neutral/negative)
2. Intent (seeking_help/escalating/venting/scam_attempt)
3. Urgency level (low/medium/high/critical)
4. Recommended response tone

Return JSON:
{
  "sentiment": "...",
  "intent": "...",
  "urgency": "...",
  "recommendedTone": "...",
  "confidence": 0.0-1.0
}`,
    variables: ['message', 'userContext'],
    piiFields: ['message'],  // May contain PII
    modelPreference: 'balanced',
    maxTokens: 200,
    temperature: 0.4,
    createdAt: new Date('2025-10-07'),
    updatedAt: new Date('2025-10-07'),
  },
};

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): PromptTemplate | null {
  return PROMPT_TEMPLATES[templateId] || null;
}

/**
 * Get all templates by category
 */
export function getTemplatesByCategory(category: PromptCategory): PromptTemplate[] {
  return Object.values(PROMPT_TEMPLATES).filter((t) => t.category === category);
}

/**
 * Render template with variables
 */
export function renderTemplate(
  templateId: string,
  variables: Record<string, any>
): string | null {
  const template = getTemplate(templateId);
  if (!template) return null;

  let rendered = template.template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return rendered;
}

/**
 * Validate that all required variables are provided
 */
export function validateVariables(
  templateId: string,
  variables: Record<string, any>
): { valid: boolean; missing: string[] } {
  const template = getTemplate(templateId);
  if (!template) return { valid: false, missing: ['template_not_found'] };

  const missing = template.variables.filter((v) => !(v in variables));
  return {
    valid: missing.length === 0,
    missing,
  };
}
