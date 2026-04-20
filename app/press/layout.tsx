import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Press & Media | Wellness Projection Lab',
  description:
    'Press releases, media kit, executive bios, and company background for Wellness Projection Lab — the intelligent family health tracking platform.',
  path: '/press',
  keywords: 'wellness projection lab press, WPL media kit, health tech press release, family health platform news',
})

export default function PressLayout({ children }: { children: React.ReactNode }) {
  return children
}
