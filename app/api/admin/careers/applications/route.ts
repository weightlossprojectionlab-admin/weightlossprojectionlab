import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { isSuperAdmin } from '@/lib/admin/permissions';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.replace('Bearer ', '');

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminEmail = decodedToken.email || 'unknown';

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const adminData = adminDoc.data();
    const isSuper = isSuperAdmin(adminEmail);

    if (!isSuper && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch all job applications
    const applicationsSnapshot = await adminDb
      .collection('job_applications')
      .orderBy('submittedAt', 'desc')
      .get();

    const applications = applicationsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        applicationId: doc.id,
        ...data,
        submittedAt: data.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error fetching job applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.replace('Bearer ', '');

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminUid = decodedToken.uid;
    const adminEmail = decodedToken.email || 'unknown';

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get();
    const adminData = adminDoc.data();
    const isSuper = isSuperAdmin(adminEmail);

    if (!isSuper && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, status } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update application status
    await adminDb.collection('job_applications').doc(applicationId).update({
      status,
      reviewedAt: new Date(),
      reviewedBy: adminEmail,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Application status updated' });
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
