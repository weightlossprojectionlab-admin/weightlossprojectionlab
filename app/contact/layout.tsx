import { buildPageMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageSchema } from '@/lib/json-ld'

export const metadata = buildPageMetadata({
  title: 'Contact Us | Wellness Projection Lab',
  description:
    'Get in touch with Wellness Projection Lab. Questions about family health tracking, partnerships, or support — we respond within one business day.',
  path: '/contact',
  keywords: 'contact wellness projection lab, WPL support, family health app contact, health tracking help',
})

const CONTACT_FAQS = [
  {
    question: 'How quickly will I receive a response?',
    answer:
      'Most inquiries receive a response within 24 hours during business days. Support tickets are typically answered within 2-4 hours. Emergency security issues are addressed immediately.',
  },
  {
    question: 'Do you offer phone support?',
    answer:
      'Currently, we provide support via email and our help center. Enterprise customers have access to dedicated phone support and a customer success manager.',
  },
  {
    question: 'How do I get started?',
    answer:
      'Most users can start with our 14-day free trial on the pricing page. For organizations requiring volume pricing, custom contracts, or enterprise features, use the contact form.',
  },
  {
    question: 'How do I report a security issue?',
    answer:
      'Use the contact form and select "Privacy/Security Concern". We monitor security submissions 24/7 and take all reports very seriously.',
  },
  {
    question: 'Where can I find technical documentation?',
    answer:
      'Visit the Documentation Center at /docs for comprehensive guides, API docs, and tutorials.',
  },
  {
    question: 'Do you have an office I can visit?',
    answer:
      'We\'re a remote-first company, but we\'re happy to arrange virtual meetings. For enterprise clients, we can schedule in-person meetings as needed.',
  },
]

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqPageSchema(CONTACT_FAQS)} />
      {children}
    </>
  )
}
