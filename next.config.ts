import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable static export for Capacitor native builds
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,

  // Configure webpack to handle pdfjs-dist and pdf-parse properly
  webpack: (config, { isServer }) => {
    // Fix canvas issues for both client and server builds
    // Client-side: Disable canvas for pdfjs-dist in browser
    // Server-side: Allow canvas but mark as external to avoid bundling native bindings
    if (!isServer) {
      config.resolve.alias.canvas = false
      config.resolve.alias.encoding = false
    } else {
      // Server-side: Mark canvas as external to prevent webpack from bundling it
      // This allows pdf-parse to use its native dependencies at runtime
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('canvas', '@napi-rs/canvas')
      }
    }

    return config
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
  // Modern JavaScript output for better performance
  compiler: {
    // Remove console.log in production for smaller bundles
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Force dynamic rendering to skip static page generation
  experimental: {
    ppr: false,
    optimizePackageImports: ['recharts', 'react-hot-toast', '@heroicons/react'],
  },
  typescript: {
    // TEMPORARILY: Skip type checking during build to isolate the hang issue
    // Type errors should be caught in development and CI
    ignoreBuildErrors: true,
  },
  // Removed standalone output - Netlify handles deployment packaging
  // Skip static page generation for pages that depend on runtime data
  generateBuildId: async () => {
    // Use timestamp to force fresh builds
    return `build-${Date.now()}`
  },
  // Turbopack disabled due to internal error with middleware injection
  // turbopack: {
  //   rules: {
  //     '*.svg': {
  //       loaders: ['@svgr/webpack'],
  //       as: '*.js'
  //     }
  //   }
  // },
  images: {
    // Disable image optimization for Capacitor static export
    unoptimized: process.env.CAPACITOR_BUILD === 'true',
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    // Skip headers for static export (Capacitor builds)
    if (process.env.CAPACITOR_BUILD === 'true') {
      return []
    }

    return [
      {
        source: '/:path*',
        headers: [
          // Existing headers
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          // NEW SECURITY HEADERS
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production'
              ? [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.gstatic.com https://apis.google.com https://accounts.google.com https://cdn.jsdelivr.net https://unpkg.com",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com",
                  "font-src 'self' data:",
                  "connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://api.stripe.com https://generativelanguage.googleapis.com https://accounts.google.com https://oauth2.googleapis.com",
                  "frame-src https://js.stripe.com https://firebasestorage.googleapis.com https://accounts.google.com https://weightlossprojectionlab-8b284.firebaseapp.com https://app.netlify.com",
                  "frame-ancestors 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                ].join('; ')
              : [
                  // Development: More permissive but still structured
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.gstatic.com https://apis.google.com https://accounts.google.com https://cdn.jsdelivr.net https://unpkg.com",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src * data: blob:",
                  "font-src 'self' data:",
                  "connect-src 'self' https: wss: http://localhost:* ws://localhost:*", // Permissive for dev
                  "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://firebasestorage.googleapis.com https://accounts.google.com https://weightlossprojectionlab-8b284.firebaseapp.com",
                  "worker-src 'self' blob:",
                  "frame-ancestors 'none'",
                ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig