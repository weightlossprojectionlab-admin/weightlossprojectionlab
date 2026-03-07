'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import {
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface JobApplication {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  applicantName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export default function CareerApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/careers/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load applications');

      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err) {
      logger.error('Failed to load applications', err as Error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: string) => {
    try {
      setUpdating(true);
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/careers/applications', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationId, status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Application status updated');
      await loadApplications();
      setShowDetailModal(false);
    } catch (err) {
      logger.error('Failed to update application status', err as Error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const filteredApplications = applications.filter(
    (app) => selectedStatus === 'all' || app.status === selectedStatus
  );

  const statusCounts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    reviewed: applications.filter((a) => a.status === 'reviewed').length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
    hired: applications.filter((a) => a.status === 'hired').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'shortlisted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'hired':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Job Applications</h1>
        <p className="mt-1 text-muted-foreground">Review and manage candidate applications</p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'reviewed', label: 'Reviewed' },
          { key: 'shortlisted', label: 'Shortlisted' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'hired', label: 'Hired' },
        ].map((status) => (
          <button
            key={status.key}
            onClick={() => setSelectedStatus(status.key)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedStatus === status.key
                ? 'bg-primary text-white'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }`}
          >
            {status.label} ({statusCounts[status.key as keyof typeof statusCounts]})
          </button>
        ))}
      </div>

      {/* Applications List */}
      <div className="bg-card rounded-lg shadow border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No applications found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredApplications.map((application) => (
              <div
                key={application.applicationId}
                className="p-6 hover:bg-background cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedApplication(application);
                  setShowDetailModal(true);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {application.applicantName}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          application.status
                        )}`}
                      >
                        {application.status}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {application.jobTitle}
                    </p>

                    <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <EnvelopeIcon className="h-4 w-4" />
                        <span>{application.email}</span>
                      </div>
                      {application.phone && (
                        <div className="flex items-center gap-1">
                          <PhoneIcon className="h-4 w-4" />
                          <span>{application.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatDate(application.submittedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {application.resumeUrl && (
                      <a
                        href={application.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-lg hover:bg-blue-200"
                        title="View Resume"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {showDetailModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {selectedApplication.applicantName}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedApplication.jobTitle}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Information */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <EnvelopeIcon className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${selectedApplication.email}`}
                      className="text-primary hover:underline"
                    >
                      {selectedApplication.email}
                    </a>
                  </div>
                  {selectedApplication.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${selectedApplication.phone}`}
                        className="text-primary hover:underline"
                      >
                        {selectedApplication.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Letter */}
              {selectedApplication.coverLetter && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Cover Letter</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-background p-4 rounded-lg border border-border">
                    {selectedApplication.coverLetter}
                  </p>
                </div>
              )}

              {/* Resume */}
              {selectedApplication.resumeUrl && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Resume</h4>
                  <a
                    href={selectedApplication.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-lg hover:bg-blue-200"
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    View Resume
                  </a>
                </div>
              )}

              {/* Status Update */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Update Status</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'].map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        handleUpdateStatus(selectedApplication.applicationId, status)
                      }
                      disabled={updating || selectedApplication.status === status}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors capitalize ${
                        selectedApplication.status === status
                          ? getStatusColor(status)
                          : 'bg-background border border-border text-foreground hover:bg-muted'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Application Details */}
              <div className="pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium text-foreground">
                      {formatDate(selectedApplication.submittedAt)}
                    </p>
                  </div>
                  {selectedApplication.reviewedAt && (
                    <div>
                      <p className="text-muted-foreground">Reviewed</p>
                      <p className="font-medium text-foreground">
                        {formatDate(selectedApplication.reviewedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
