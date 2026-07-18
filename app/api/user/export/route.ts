import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { collectUserExport } from '@/lib/user-data-export'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'

/**
 * GET /api/user/export
 * Lets a signed-in user download all of their own data (GDPR-style export).
 * Reuses the same collector as the admin export so both stay in sync.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request.headers.get('authorization'))
    if (!auth) {
      return unauthorizedResponse()
    }

    const data = await collectUserExport(auth.userId)
    const exportData = {
      ...data,
      user: { uid: auth.userId, email: auth.email },
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="wpl-my-data-export.json"`,
      },
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/user/export',
      operation: 'fetch',
    })
  }
}
