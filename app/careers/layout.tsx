import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Careers — Build the Future of AI-Powered Health Tech | Wellness Projection Lab',
  description:
    'Join Wellness Projection Lab to build intelligent family health technology. Remote-friendly engineering, design, and healthcare roles with meaningful impact.',
  path: '/careers',
  keywords: 'health tech jobs, AI health startup careers, remote healthcare engineering, HIPAA platform jobs, wellness technology careers',
})

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return children
}
