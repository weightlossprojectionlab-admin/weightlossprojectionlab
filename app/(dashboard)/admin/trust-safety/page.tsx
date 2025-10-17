// Trust & Safety Admin Dashboard
// PRD Reference: trust_safety_moderation (PRD v1.3.7)

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import CaseList from '@/components/trust-safety/CaseList';
import RiskScoreDisplay from '@/components/trust-safety/RiskScoreDisplay';
import ActionPanel from '@/components/trust-safety/ActionPanel';
import type { DisputeCase, AdminAction } from '@/types/trust-safety';

export default function TrustSafetyAdminPage() {
  const { user } = useAuth();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // TODO: Replace with actual data fetching hook
  const cases: DisputeCase[] = [];
  const isLoading = false;
  const error = null;

  // TODO: Check if user is admin
  const isAdmin = false;

  const selectedCase = selectedCaseId ? cases.find(c => c.id === selectedCaseId) : null;

  const handleViewCase = (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  const handleAction = async (action: AdminAction, notes: string) => {
    console.log('Admin action:', action, 'Notes:', notes, 'Case:', selectedCaseId);
    // TODO: Implement Firebase function to process admin action
    // This would update the dispute case status and create an audit log entry

    // After successful action, refresh cases and clear selection
    setSelectedCaseId(null);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to access the Trust & Safety dashboard.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading cases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Cases</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Trust & Safety Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage disputes and moderation cases</p>
      </div>

      {/* Layout */}
      {!selectedCase ? (
        /* List View */
        <CaseList cases={cases} onViewCase={handleViewCase} />
      ) : (
        /* Detail View */
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedCaseId(null)}
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Cases</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Case Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Case Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Case #{selectedCase.id.slice(0, 8)}</h2>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Reason</div>
                    <div className="text-base text-gray-900 capitalize">
                      {selectedCase.reason.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Filed By</div>
                    <div className="text-base text-gray-900">{selectedCase.reporterId}</div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Against</div>
                    <div className="text-base text-gray-900">{selectedCase.targetId}</div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Filed On</div>
                    <div className="text-base text-gray-900">
                      {new Date(selectedCase.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {selectedCase.description && (
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-1">Description</div>
                      <div className="text-base text-gray-700 bg-gray-50 p-3 rounded">
                        {selectedCase.description}
                      </div>
                    </div>
                  )}

                  {/* Evidence */}
                  {selectedCase.evidence && selectedCase.evidence.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2">Evidence</div>
                      <div className="space-y-2">
                        {selectedCase.evidence.map((ev, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded">
                            <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                              {ev.type}
                            </div>
                            <div className="text-sm text-gray-900">
                              {JSON.stringify(ev.data, null, 2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Assessment */}
              <RiskScoreDisplay
                assessment={{
                  score: selectedCase.riskScore,
                  signals: selectedCase.signals || [],
                  recommendation: selectedCase.recommendation,
                  confidence: selectedCase.confidence
                }}
                showDetails={true}
              />
            </div>

            {/* Action Panel */}
            <div className="lg:col-span-1">
              <ActionPanel
                case={selectedCase}
                onAction={handleAction}
                disabled={selectedCase.status === 'resolved'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!selectedCase && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Trust & Safety Guidelines</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• High-risk cases (score ≥70) require immediate attention</li>
            <li>• Cases with ≥80% confidence can be auto-resolved per PRD policy</li>
            <li>• All actions are logged and auditable</li>
            <li>• SLA: First response within 4 hours, resolution within 72 hours</li>
            <li>• Escalate cases requiring senior review or legal consultation</li>
          </ul>
        </div>
      )}
    </div>
  );
}
