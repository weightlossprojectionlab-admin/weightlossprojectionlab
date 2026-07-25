import { buildDirectiveChangeAlert, type DirectiveChange } from './emergency-alerts'

// buildDirectiveChangeAlert is pure (no Firestore I/O) — it just shapes the alert that
// sendEmergencyAlert then fans out. These lock the phrasing + routing semantics of a
// governed advance-directive change.

const baseChange: DirectiveChange = {
  patientId: 'patient-123',
  patientName: 'Jimmy',
  field: 'code status',
  fromLabel: 'Not recorded',
  toLabel: 'DNR — do not resuscitate',
  changedBy: { uid: 'user-abc', name: 'Jane', role: 'caregiver' },
}

describe('buildDirectiveChangeAlert', () => {
  it('routes as an awareness alert, not a crisis (type directive_changed, severity urgent)', () => {
    const alert = buildDirectiveChangeAlert(baseChange)
    expect(alert.type).toBe('directive_changed')
    // urgent = notify + bell, NOT emergency (which would add siren/SMS/call). A record
    // edit must never trigger the 911-grade fan-out.
    expect(alert.severity).toBe('urgent')
  })

  it('names who changed what, from which value to which', () => {
    const alert = buildDirectiveChangeAlert(baseChange)
    expect(alert.message).toContain('Jane')
    expect(alert.message).toContain('Jimmy')
    expect(alert.message).toContain('code status')
    expect(alert.message).toContain('Not recorded')
    expect(alert.message).toContain('DNR — do not resuscitate')
  })

  it('targets the patient and carries the editor as reportedBy (so the fan-out can exclude them)', () => {
    const alert = buildDirectiveChangeAlert(baseChange)
    expect(alert.familyMemberId).toBe('patient-123')
    expect(alert.familyMemberName).toBe('Jimmy')
    expect(alert.reportedBy).toEqual({ uid: 'user-abc', name: 'Jane', role: 'caregiver' })
  })

  it('stamps a timestamp', () => {
    const alert = buildDirectiveChangeAlert(baseChange)
    expect(alert.timestamp).toBeInstanceOf(Date)
  })
})
