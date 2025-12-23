import { NextResponse } from 'next/server'

export async function GET() {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (!privateKey) {
    return NextResponse.json({
      error: 'FIREBASE_ADMIN_PRIVATE_KEY not set',
      exists: false
    })
  }

  // Don't expose the actual key, just diagnostic info
  return NextResponse.json({
    exists: true,
    length: privateKey.length,
    startsWithQuote: privateKey.startsWith('"') || privateKey.startsWith("'"),
    endsWithQuote: privateKey.endsWith('"') || privateKey.endsWith("'"),
    hasBeginMarker: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
    hasEndMarker: privateKey.includes('-----END PRIVATE KEY-----'),
    hasEscapedNewlines: privateKey.includes('\\n'),
    hasActualNewlines: privateKey.includes('\n'),
    firstChars: privateKey.substring(0, 50),
    lastChars: privateKey.substring(privateKey.length - 50)
  })
}
