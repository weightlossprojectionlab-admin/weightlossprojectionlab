import { buildPageMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageSchema } from '@/lib/json-ld'

export const metadata = buildPageMetadata({
  title: 'Pricing — Family Health Tracking Plans | Wellness Projection Lab',
  description:
    'Simple plans for individuals, couples, and families. Track vitals, medications, meals, and appointments for everyone you care about. Start free, upgrade anytime.',
  path: '/pricing',
  keywords: 'family health app pricing, caregiver app plans, HIPAA health tracking cost, wellness app subscription, family health plan',
})

const PRICING_FAQS = [
  {
    question: 'How does the 7-day trial work?',
    answer:
      'When you upgrade from the free plan to any paid plan, you get full access to all features for 7 days with no payment required. After your trial ends, you\'ll be prompted to add payment to continue. The free plan itself has no trial period — it\'s free forever with basic features.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. You can cancel your subscription at any time from your account settings. You\'ll retain access until the end of your billing period.',
  },
  {
    question: 'What happens after my trial ends?',
    answer:
      'After your 7-day trial of a paid plan ends, you\'ll need to add payment to continue with that plan\'s features. If you don\'t add payment, you\'ll automatically return to the free plan. We\'ll send you reminders before your trial ends so you\'re never surprised.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer:
      'Yes. You can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your billing cycle.',
  },
]

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqPageSchema(PRICING_FAQS)} />
      {children}
    </>
  )
}
