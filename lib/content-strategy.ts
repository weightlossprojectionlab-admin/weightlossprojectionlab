/**
 * Content Strategy — Stage-Aware Growth Playbook
 *
 * Defines growth stages, checklists, and content generation
 * prompts based on the SaaS first-100-customers playbook.
 * Targets the caregiver ICP (sandwich generation, family health).
 */

export interface GrowthStage {
  id: string
  name: string
  range: [number, number] // [min, max] user count (max = Infinity for last stage)
  description: string
  color: string // tailwind color class
  checklist: ChecklistItem[]
  calendarTemplate: CalendarSlot[]
}

export interface ChecklistItem {
  id: string
  text: string
  category: 'outreach' | 'content' | 'feedback' | 'conversion' | 'scale'
}

export interface CalendarSlot {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  platform: string
  activity: string
}

export const GROWTH_STAGES: GrowthStage[] = [
  {
    id: 'stage1',
    name: 'First 10 Customers',
    range: [0, 10],
    description: 'Do things that don\'t scale. Have conversations. Build relationships.',
    color: 'orange',
    checklist: [
      { id: 's1_communities', text: 'Join 3 caregiver communities (Reddit, Facebook, forums)', category: 'outreach' },
      { id: 's1_conversations', text: 'Have 10 conversations with potential users (don\'t sell, learn)', category: 'outreach' },
      { id: 's1_loom', text: 'Record 3 personalized Loom videos for community admins/influencers', category: 'outreach' },
      { id: 's1_follow', text: 'Follow 50 caregiver accounts on LinkedIn/Twitter', category: 'outreach' },
      { id: 's1_engage', text: 'Engage daily (comments, likes) for 2 weeks before any DM', category: 'outreach' },
      { id: 's1_shorts', text: 'Post first 5 YouTube Shorts (caregiver pain point content)', category: 'content' },
      { id: 's1_loom_setup', text: 'Set up Loom account for video outreach', category: 'outreach' },
      { id: 's1_beta', text: 'Create a "beta tester" landing page or signup form', category: 'conversion' },
    ],
    calendarTemplate: [
      { day: 'Mon', platform: 'YouTube', activity: 'Post Short (caregiver pain point)' },
      { day: 'Tue', platform: 'LinkedIn', activity: 'Engage with 10 caregiver posts' },
      { day: 'Wed', platform: 'Reddit', activity: 'Answer questions in r/caregivers or r/AgingParents' },
      { day: 'Thu', platform: 'LinkedIn', activity: 'Post value-first tip (no product mention)' },
      { day: 'Fri', platform: 'YouTube', activity: 'Post Short (family health tip)' },
      { day: 'Sat', platform: 'Loom', activity: 'Record 1 personalized outreach video' },
    ],
  },
  {
    id: 'stage2',
    name: 'Early Adopters',
    range: [1, 10],
    description: 'Collect feedback obsessively. Build social proof. Refine your ICP.',
    color: 'blue',
    checklist: [
      { id: 's2_feedback', text: 'Collect feedback from every user (what\'s missing, what frustrates them)', category: 'feedback' },
      { id: 's2_testimonials', text: 'Ask 3 users for a 2-sentence testimonial', category: 'feedback' },
      { id: 's2_replace', text: 'Replace placeholder homepage testimonials with real ones', category: 'conversion' },
      { id: 's2_icp', text: 'Identify what your first users have in common (refine ICP)', category: 'feedback' },
      { id: 's2_ab', text: 'A/B test homepage headline', category: 'conversion' },
      { id: 's2_referral', text: 'Send first referral email to early users', category: 'scale' },
    ],
    calendarTemplate: [
      { day: 'Mon', platform: 'YouTube', activity: 'Post Short (user pain point you learned from feedback)' },
      { day: 'Tue', platform: 'Email', activity: 'Follow up with users for testimonials' },
      { day: 'Wed', platform: 'LinkedIn', activity: 'Share a learning from user feedback (thought leadership)' },
      { day: 'Thu', platform: 'YouTube', activity: 'Post Short (how-to for a feature users love)' },
      { day: 'Fri', platform: 'Twitter', activity: 'Share a caregiver tip thread' },
      { day: 'Sat', platform: 'Email', activity: 'Send referral invitation to happy users' },
    ],
  },
  {
    id: 'stage3',
    name: 'Scale to 50',
    range: [11, 50],
    description: 'Scale what\'s working. Build case studies. Start paid experiments.',
    color: 'green',
    checklist: [
      { id: 's3_cases', text: 'Build 3 case studies from power users', category: 'content' },
      { id: 's3_referral_campaign', text: 'Launch referral program email campaign', category: 'scale' },
      { id: 's3_loom_scale', text: 'Scale Loom outreach (10 videos/week)', category: 'outreach' },
      { id: 's3_longform', text: 'Start weekly YouTube long-form content', category: 'content' },
      { id: 's3_paid', text: 'Run first paid ad experiment ($50 budget, one platform)', category: 'scale' },
    ],
    calendarTemplate: [
      { day: 'Mon', platform: 'YouTube', activity: 'Post long-form video (feature deep-dive or case study)' },
      { day: 'Tue', platform: 'Loom', activity: 'Record 2 personalized outreach videos' },
      { day: 'Wed', platform: 'LinkedIn', activity: 'Publish case study excerpt or data insight' },
      { day: 'Thu', platform: 'YouTube', activity: 'Post Short (quick caregiver hack)' },
      { day: 'Fri', platform: 'Ads', activity: 'Review ad performance, adjust targeting' },
      { day: 'Sat', platform: 'Pinterest', activity: 'Pin caregiver infographic or health tip' },
    ],
  },
  {
    id: 'stage4',
    name: 'First 100 & Beyond',
    range: [51, Infinity],
    description: 'Build authority through content. Automate referrals. Scale with proof.',
    color: 'purple',
    checklist: [
      { id: 's4_thought', text: 'Publish weekly thought leadership content', category: 'content' },
      { id: 's4_automate', text: 'Automate referral program reminders', category: 'scale' },
      { id: 's4_partners', text: 'Build partner/integration relationships', category: 'scale' },
      { id: 's4_success', text: 'Create a "Success Stories" page on the website', category: 'conversion' },
      { id: 's4_syndicate', text: 'Explore content syndication (Medium, Dev.to, health blogs)', category: 'content' },
    ],
    calendarTemplate: [
      { day: 'Mon', platform: 'YouTube', activity: 'Post long-form (thought leadership or interview)' },
      { day: 'Tue', platform: 'Blog', activity: 'Publish SEO article targeting caregiver keywords' },
      { day: 'Wed', platform: 'LinkedIn', activity: 'Share industry insight or data' },
      { day: 'Thu', platform: 'YouTube', activity: 'Post Short (testimonial clip or quick tip)' },
      { day: 'Fri', platform: 'Email', activity: 'Newsletter to user base with tips + feature highlights' },
      { day: 'Sat', platform: 'Pinterest', activity: 'Pin weekly health infographic' },
    ],
  },
]

export function getCurrentStage(userCount: number): GrowthStage {
  // Stage 1 is for 0 users, stage 2 starts at 1 real user
  if (userCount <= 0) return GROWTH_STAGES[0]
  if (userCount <= 10) return GROWTH_STAGES[1]
  if (userCount <= 50) return GROWTH_STAGES[2]
  return GROWTH_STAGES[3]
}

export function getStageProgress(userCount: number, stage: GrowthStage): number {
  const [min, max] = stage.range
  if (max === Infinity) return Math.min(100, (userCount / 150) * 100)
  const range = max - min
  if (range <= 0) return 100
  return Math.min(100, Math.max(0, ((userCount - min) / range) * 100))
}

export function buildContentPrompt(stage: GrowthStage): string {
  const icpContext = `
ICP: Family caregivers (sandwich generation, ages 30-55).
Pain points: Scattered health records, missed medications, can't share medical info with spouse/sitter, managing health for kids + aging parents + pets.
Product: Wellness Projection Lab — one app for the whole family's health (vitals, meds, meals, appointments, caregiver sharing).
Tone: Empathetic, practical, not salesy. Speak to their overwhelm and offer relief.
`.trim()

  if (stage.id === 'stage1') {
    return `${icpContext}

STAGE: Pre-launch, 0 real users. Goal is to start conversations and get first 10 signups.

Generate:
1. Five YouTube Short scripts (30-40 seconds each). Format: Hook (2 sec) → Pain point → Quick solution → CTA. Do NOT mention the product by name in the hook — lead with the pain.
2. Five LinkedIn/Twitter post ideas that provide value to caregivers without selling anything. Each should be 2-3 sentences max.
3. Three Loom outreach script templates for reaching out to caregiver community admins or influencers. Frame as "I built something and want feedback" not "buy my product."
4. Three Reddit/Facebook community post templates that answer a common caregiver question and subtly mention you're building a tool to help.

Return as JSON: { shorts: [{title, hook, script, cta}], posts: [{platform, text}], looms: [{subject, script}], community: [{title, body}] }`
  }

  if (stage.id === 'stage2') {
    return `${icpContext}

STAGE: 1-10 early adopters. Goal is to collect feedback, get testimonials, and iterate messaging.

Generate:
1. Five YouTube Short scripts that address specific pain points you've heard from users. Format: "I asked 10 caregivers what frustrates them most..." storytelling angle.
2. Five LinkedIn/Twitter posts sharing insights from user feedback (anonymized). Position yourself as learning in public.
3. Three email templates: one for asking for testimonials, one for asking for feature feedback, one for referral invitation.
4. Three A/B test headline ideas for the homepage.

Return as JSON: { shorts: [{title, hook, script, cta}], posts: [{platform, text}], emails: [{subject, body, purpose}], headlines: [{variant, reasoning}] }`
  }

  if (stage.id === 'stage3') {
    return `${icpContext}

STAGE: 11-50 users. Goal is to scale outreach, build case studies, run first paid ad.

Generate:
1. Five YouTube Short scripts featuring transformation stories ("Before WPL, Sarah used 4 apps...").
2. Five LinkedIn/Twitter posts with data-driven insights from your user base.
3. Three case study outlines (problem → solution → results format).
4. Three paid ad copy variants for Facebook/Instagram targeting caregivers.

Return as JSON: { shorts: [{title, hook, script, cta}], posts: [{platform, text}], caseStudies: [{title, problem, solution, results}], ads: [{platform, headline, body, cta}] }`
  }

  // stage4
  return `${icpContext}

STAGE: 50+ users, scaling to 100+. Goal is thought leadership, brand building, and automated growth.

Generate:
1. Five YouTube long-form video ideas (5-10 min each) on caregiver health management topics.
2. Five LinkedIn/Twitter thought leadership posts positioning you as an expert in family health tech.
3. Three blog post outlines for SEO (targeting "caregiver app", "family health management", "medication tracker for family").
4. Three partnership outreach templates (for health bloggers, caregiver organizations, pediatrician offices).

Return as JSON: { videos: [{title, outline, duration}], posts: [{platform, text}], blogs: [{title, outline, targetKeyword}], partnerships: [{target, subject, pitch}] }`
}
