import { redirect } from 'next/navigation'

/**
 * DEPRECATED: /meal-gallery has been merged into /gallery
 *
 * The new /gallery page includes all the functionality of the old meal-gallery
 * PLUS social media sharing features, better UI, and more filter options.
 *
 * This route now redirects to /gallery
 */
export default function MealGalleryPage() {
  redirect('/gallery')
}
