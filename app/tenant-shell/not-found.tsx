import Link from 'next/link'

export default function TenantNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Organization not found
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          We couldn&apos;t find an organization at this address. Double-check the URL or contact your administrator.
        </p>
        <Link
          href="https://www.wellnessprojectionlab.com"
          className="inline-block mt-4 text-blue-600 dark:text-blue-400 underline"
        >
          Go to Wellness Projection Lab
        </Link>
      </div>
    </main>
  )
}
