import { NextRequest, NextResponse } from 'next/server'

/**
 * PDF Proxy Endpoint
 * Fetches PDFs from Firebase Storage and serves them through our domain
 * This bypasses CORS and iframe blocking issues
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdfUrl = searchParams.get('url')

    if (!pdfUrl) {
      return NextResponse.json({ error: 'Missing PDF URL' }, { status: 400 })
    }

    // Verify it's a Firebase Storage URL
    if (!pdfUrl.includes('firebasestorage.googleapis.com')) {
      return NextResponse.json({ error: 'Invalid PDF URL' }, { status: 400 })
    }

    // Fetch the PDF from Firebase Storage
    const pdfResponse = await fetch(pdfUrl)

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${pdfResponse.statusText}` },
        { status: pdfResponse.status }
      )
    }

    // Get the PDF data
    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[PDF Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy PDF' },
      { status: 500 }
    )
  }
}
