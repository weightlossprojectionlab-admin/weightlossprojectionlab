/**
 * GET /api/patients/[patientId]/access
 *
 * Returns the CALLER's effective role + permissions for a patient, straight
 * from the server RBAC (checkPatientAccess) — the single source of truth the
 * write routes already enforce with.
 *
 * Why this exists: the client permission hook used to query
 * users/{callerUid}/familyMembers, but the owner's "Edit Permissions" modal
 * saves the grant on the OWNER's side (users/{ownerUid}/familyMembers). Those
 * are different documents, so a caregiver's UI never reflected the owner's
 * grant (e.g. "Edit Medications" checked by the owner, but the caregiver saw
 * "you don't have permission"). This endpoint makes the client read the same
 * grant the server enforces.
 *
 * Returns:
 *   200 { authorized, role, isOwner, permissions, ownerUserId }
 *   401 no auth
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken, checkPatientAccess } from '@/lib/rbac-middleware'

interface RouteParams {
  params: Promise<{ patientId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { patientId } = await params

  const auth = await verifyAuthToken(request.headers.get('authorization'))
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await checkPatientAccess(auth.userId, patientId)
  const isOwner = result.role === 'owner'

  return NextResponse.json({
    authorized: result.authorized,
    role: result.authorized ? result.role ?? null : null,
    isOwner,
    // Owners have all permissions implicitly (null = full). Family members
    // carry their explicit grant.
    permissions: isOwner ? null : result.permissions ?? null,
    ownerUserId: result.ownerUserId ?? null,
  })
}
