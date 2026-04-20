import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Discover Recipes — Family-Friendly, AI-Analyzed | Wellness Projection Lab',
  description:
    'Browse healthy recipes curated and analyzed by AI for your family. Filter by meal type, dietary preferences, and allergens — save favorites to your meal plan.',
  path: '/discover',
  keywords: 'healthy recipes, AI recipe analysis, family meal ideas, allergen-friendly recipes, wellness recipes, nutrition-analyzed recipes',
})

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children
}
