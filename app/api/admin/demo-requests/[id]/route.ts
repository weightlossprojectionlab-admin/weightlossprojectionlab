/**
 * Admin Demo Request API Route
 *
 * PATCH /api/admin/demo-requests/[id] - Update demo request (admin-only)
 * DELETE /api/admin/demo-requests/[id] - Delete demo request (admin-only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { verifyAdmin } from '@/lib/auth-helpers'
import type { UpdateDemoRequestInput } from '@/types/demo-requests'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json() as UpdateDemoRequestInput

    // Validate that at least one field is being updated
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Get the document reference
    const requestRef = doc(db, 'demo_requests', id)

    // Check if document exists
    const requestSnap = await getDoc(requestRef)
    if (!requestSnap.exists()) {
      return NextResponse.json(
        { error: 'Demo request not found' },
        { status: 404 }
      )
    }

    // Build update object (only include provided fields)
    const updateData: any = {}

    if (body.status !== undefined) {
      updateData.status = body.status

      // Set timestamp fields based on status
      if (body.status === 'scheduled' && !body.scheduledAt) {
        updateData.scheduledAt = new Date().toISOString()
      }
      if (body.status === 'completed' && !body.completedAt) {
        updateData.completedAt = new Date().toISOString()
      }
      if (body.status === 'cancelled' && !body.cancelledAt) {
        updateData.cancelledAt = new Date().toISOString()
      }
    }

    if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt
    if (body.completedAt !== undefined) updateData.completedAt = body.completedAt
    if (body.cancelledAt !== undefined) updateData.cancelledAt = body.cancelledAt
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo
    if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes
    if (body.followUpDate !== undefined) updateData.followUpDate = body.followUpDate

    // Update the document
    await updateDoc(requestRef, updateData)

    return NextResponse.json({
      success: true,
      message: 'Demo request updated successfully',
      updated: updateData
    })
  } catch (error) {
    console.error('Error updating demo request:', error)
    return NextResponse.json(
      { error: 'Failed to update demo request' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get the document reference
    const requestRef = doc(db, 'demo_requests', id)

    // Check if document exists
    const requestSnap = await getDoc(requestRef)
    if (!requestSnap.exists()) {
      return NextResponse.json(
        { error: 'Demo request not found' },
        { status: 404 }
      )
    }

    // Delete the document
    await deleteDoc(requestRef)

    return NextResponse.json({
      success: true,
      message: 'Demo request deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting demo request:', error)
    return NextResponse.json(
      { error: 'Failed to delete demo request' },
      { status: 500 }
    )
  }
}
