import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Platform Guide — How Wellness Projection Lab Works | Blog',
  description:
    'Explore the Wellness Projection Lab platform — meal tracking, weight projections, vitals monitoring, medication safety, care coordination, and AI health reports for your whole family.',
  path: '/blog',
  keywords: 'family health platform, AI meal tracking, weight projections, vitals monitoring, medication safety, care coordination, AI health reports',
})

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
