# Family Member + Caregiver Unified Architecture

## Current Issues

### Problem 1: Separate Family Member and Caregiver Entities
- **Family members** are stored as patient profiles (billable)
- **Caregivers** are stored separately in familyMembers collection (access-only)
- When accepting an invitation, users become caregivers but NOT patient profiles
- This breaks the family plan model where family = patient + caregiver permissions

### Problem 2: No Seat-Based Billing
- Subscriptions don't enforce seat limits
- No validation when adding family members
- Potential for billing fraud (adding unlimited family members)

### Problem 3: No External Caregiver Support
- System doesn't distinguish between family caregivers and professional caregivers
- Professional caregivers (nurses, aides) shouldn't be billable seats
- No way to grant access-only permissions without creating a patient profile

### Problem 4: No Age-Based Permissions
- Children can be granted full caregiver access
- No safeguards for age-appropriate permissions
- No trust verification for minors managing sensitive health data

---

## New Unified Architecture

### Subscription Tiers & Seat Limits

#### Base Plans (Monthly/Yearly)

| Plan | Monthly | Yearly | Seats | Features |
|------|---------|--------|-------|----------|
| **Free Trial** | $0 | - | 1 | 14-day trial, basic features |
| **Single User** | $9.99 | $99/year (17% off) | 1 | Core features, 1 person |
| **Family Basic** | $19.99 | $199/year (17% off) | 5 | Up to 5 family members |
| **Family Plus** | $29.99 | $299/year (17% off) ⭐ | 10 | Up to 10 members, premium features |
| **Family Premium** | $39.99 | $399/year (17% off) | Unlimited | Unlimited members, all features |

**Best Value Badge**: Family Plus (yearly) - Most popular for typical families

#### Feature Matrix

| Feature | Free | Single | Family Basic | Family Plus | Premium |
|---------|------|--------|--------------|-------------|---------|
| Patient Profiles | 1 | 1 | 5 | 10 | Unlimited |
| External Caregivers | 0 | 2 | 5 | 10 | Unlimited |
| Basic Health Tracking | ✓ | ✓ | ✓ | ✓ | ✓ |
| Advanced Analytics | ✗ | ✗ | ✗ | ✓ | ✓ |
| Family Sharing | ✗ | ✗ | ✓ | ✓ | ✓ |
| AI Health Insights | ✗ | ✗ | ✗ | ✓ | ✓ |
| Priority Support | ✗ | ✗ | ✗ | ✓ | ✓ |
| Data Export | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## Family Member Model

### Concept: Family Member = Patient Profile + Caregiver Permissions

Every family member added to the account:
1. **IS a patient profile** (can track their own health)
2. **MAY be a caregiver** (can manage others' health, if age-appropriate)
3. **Counts as a billable seat**

### Data Structure

```typescript
interface FamilyMember {
  // Patient Profile Data
  id: string
  userId?: string // Firestore Auth UID if they have account
  name: string
  dateOfBirth: string
  age: number // calculated
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  relationship: 'self' | 'spouse' | 'parent' | 'child' | 'sibling' | 'grandparent' | 'pet'
  type: 'human' | 'pet'

  // Account Status
  accountStatus: 'owner' | 'member' | 'pending_invite' | 'no_account'
  invitedAt?: string
  acceptedAt?: string

  // Caregiver Permissions
  caregiverStatus: {
    enabled: boolean // Can this person be a caregiver?
    eligibleByAge: boolean // Age >= 13
    trustedByOwner: boolean // Owner override for minors
    permissionLevel: 'none' | 'view_only' | 'limited' | 'full'
    canManagePatients: string[] // Patient IDs they can manage
    canEditSettings: boolean
    canInviteOthers: boolean
  }

  // Billing
  countsAsSeat: true // Always true for family members
  addedBy: string // Account owner who added them
  addedAt: string
}
```

---

## External Caregiver Model

### Concept: Access-Only, Non-Billable

Professional caregivers who manage patients but aren't family:
- Nurses, doctors, home health aides
- Do NOT get a patient profile
- Do NOT count as billable seats
- Have access expiration dates

### Data Structure

```typescript
interface ExternalCaregiver {
  id: string
  userId: string // Must have Firestore Auth account
  email: string
  name: string

  // Professional Info
  role: 'nurse' | 'doctor' | 'aide' | 'therapist' | 'other'
  organization?: string
  credentials?: string

  // Access Control
  accessLevel: 'view_only' | 'limited' | 'full'
  patientsAccess: string[] // Which patients they can manage
  accessGrantedBy: string // Account owner
  accessGrantedAt: string
  accessExpiresAt?: string // Optional expiration

  // Permissions
  permissions: {
    viewMedicalRecords: boolean
    editMedicalRecords: boolean
    viewMedications: boolean
    manageMedications: boolean
    viewDocuments: boolean
    uploadDocuments: boolean
    receiveAlerts: boolean
  }

  // Not a Patient
  countsAsSeat: false
  isExternal: true
}
```

---

## Age-Based Caregiver Eligibility

### Age Thresholds

```typescript
const CAREGIVER_AGE_RULES = {
  MINIMUM_AGE: 13, // Absolute minimum
  TRUSTED_MINOR_MAX: 17, // Requires owner approval
  AUTOMATIC_APPROVAL: 18, // Full caregiver rights
}
```

### Logic Flow

```
1. Add family member
   ↓
2. Calculate age from DOB
   ↓
3. Age < 13?
   YES → caregiverStatus.enabled = false
   NO  → Continue
   ↓
4. Age 13-17?
   YES → Ask owner: "Do you trust [Name, Age 14] to manage sensitive health data?"
         ├─ YES → caregiverStatus.enabled = true, trustedByOwner = true
         └─ NO  → caregiverStatus.enabled = false
   NO  → Continue
   ↓
5. Age 18+?
   YES → caregiverStatus.enabled = true, eligibleByAge = true
```

### Permission Levels

**For Minors (13-17) with Trust:**
- View Only (default)
- Limited (can log meals, weight, steps)
- Full (requires additional owner confirmation)

**For Adults (18+):**
- View Only
- Limited
- Full

---

## Invitation Flow

### Type 1: Family Member Invitation

**When to use:** Adding spouse, children, parents, siblings, grandparents, pets

**Flow:**
1. Account owner clicks "Add Family Member"
2. **Check seat limit** (subscription tier)
   - If at limit: Show upgrade prompt
   - If under limit: Continue
3. Enter family member details:
   - Name
   - Date of Birth
   - Gender
   - Relationship
   - Type (human/pet)
4. **Calculate age** (for humans)
5. **Determine caregiver eligibility:**
   - Age < 13: Not eligible
   - Age 13-17: Ask "Trust as caregiver?"
   - Age 18+: Eligible
6. **Set initial permissions** (if caregiver-eligible)
7. **Ask:** "Does [Name] have an email to create an account?"
   - YES: Send invitation email
   - NO: Create profile without account (managed by owner)
8. **Increment seat count**
9. **Bill for seat** on next cycle

**Result:**
- Patient profile created (billable seat)
- Caregiver permissions set (if eligible)
- Invitation sent (if has email)

### Type 2: External Caregiver Invitation

**When to use:** Adding nurses, doctors, professional caregivers

**Flow:**
1. Account owner clicks "Invite External Caregiver"
2. **No seat limit check** (not billable)
3. Enter caregiver details:
   - Email (required)
   - Name
   - Role (nurse, doctor, aide, etc.)
   - Organization (optional)
4. **Select patients to share:**
   - Multi-select from family members
5. **Set permissions:**
   - View only
   - Limited edit
   - Full access
6. **Set expiration** (optional):
   - 30 days, 90 days, 1 year, never
7. Send invitation email
8. **Does NOT increment seat count**

**Result:**
- No patient profile created
- Access-only permissions granted
- Not billable
- Can have expiration date

---

## Upgrade Flow

### Scenario: At Seat Limit

```
User tries to add family member
↓
System checks: currentSeats >= maxSeats?
YES ↓
Show modal:
  "You've reached your limit of [X] family members.
   Upgrade to add more!"

  Current Plan: Family Basic (5 seats)

  Suggested Upgrades:
  ○ Family Plus (10 seats) - $29.99/month ⭐ Best Value
  ○ Family Premium (Unlimited) - $39.99/month

  [Upgrade Now] [Cancel]
```

### Scenario: External Caregiver Limit

```
User tries to add external caregiver
↓
System checks: currentExternalCaregivers >= maxExternal?
YES ↓
Show modal:
  "You've reached your limit of [X] external caregivers.
   Upgrade to add more!"

  Current Plan: Single User (2 caregivers)

  Suggested Upgrade:
  ○ Family Basic (5 caregivers) - $19.99/month

  [Upgrade Now] [Cancel]
```

---

## Implementation Checklist

### Phase 1: Data Model Updates
- [ ] Update `FamilyMember` interface with unified model
- [ ] Create `ExternalCaregiver` interface
- [ ] Add `caregiverStatus` to patient profiles
- [ ] Add `countsAsSeat` field
- [ ] Update subscription type to include seat limits

### Phase 2: Age-Based Logic
- [ ] Create age calculation utility
- [ ] Implement caregiver eligibility rules
- [ ] Add minor trust confirmation UI
- [ ] Create permission level selector

### Phase 3: Invitation Flows
- [ ] Refactor invitation modal to show two options
- [ ] Implement family member invitation flow
- [ ] Implement external caregiver invitation flow
- [ ] Add seat limit validation
- [ ] Create upgrade prompts

### Phase 4: Subscription Enforcement
- [ ] Add seat counting logic
- [ ] Enforce limits on patient creation
- [ ] Enforce limits on external caregiver invites
- [ ] Create upgrade modal with new tiers
- [ ] Add monthly/yearly toggle with discount

### Phase 5: Migration
- [ ] Script to convert existing family members
- [ ] Script to convert existing caregivers
- [ ] Grandfather existing users
- [ ] Set appropriate seat limits

### Phase 6: UI Updates
- [ ] Update "Add Family Member" button
- [ ] Add "Invite External Caregiver" button
- [ ] Show seat usage in settings
- [ ] Display caregiver permissions
- [ ] Age indicators on family cards

---

## Security & Privacy

### Family Member Access Rules
- Children < 13: Cannot be caregivers
- Teens 13-17: Require owner trust confirmation
- Adults 18+: Can be caregivers with any permission level
- Owner can revoke caregiver permissions at any time

### External Caregiver Access Rules
- Must have verified email account
- Access can have expiration dates
- Owner can revoke access instantly
- Cannot add other caregivers
- Cannot modify subscription or billing

### Data Visibility
- Caregivers only see patients they're assigned to
- Owner sees everything
- External caregivers have limited feature access
- Audit log tracks all caregiver actions

---

## Billing Logic

### Seat Counting
```typescript
function calculateSeats(account: Account): number {
  const familyMembers = account.patients.filter(p => p.countsAsSeat)
  return familyMembers.length
}

function canAddFamilyMember(account: Account): boolean {
  const currentSeats = calculateSeats(account)
  const maxSeats = account.subscription.maxSeats
  return currentSeats < maxSeats
}
```

### Prorated Billing
- New family member added mid-cycle: Prorated charge
- Downgrade: Credit applied to next cycle
- Upgrade: Immediate charge, prorated

---

## Example User Scenarios

### Scenario 1: Nuclear Family (4 people)
- **Account Owner:** Dad (age 45)
- **Family Members:**
  - Mom (age 43) - Full caregiver ✓
  - Daughter (age 16) - Trusted caregiver ✓ (with approval)
  - Son (age 10) - Not a caregiver ✗
- **Plan:** Family Basic (5 seats) - $19.99/month
- **Seats Used:** 4/5

### Scenario 2: Elderly Care
- **Account Owner:** Adult daughter (age 52)
- **Family Members:**
  - Mother (age 78) - Not a caregiver ✗ (elderly)
  - Father (age 80) - Not a caregiver ✗ (elderly)
- **External Caregivers:**
  - Home health nurse (access expires in 90 days)
  - Physical therapist (view only)
- **Plan:** Family Basic (5 seats) - $19.99/month
- **Seats Used:** 3/5 (daughter + 2 parents)
- **External Caregivers:** 2/5 (not billed)

### Scenario 3: Large Family + Pets
- **Account Owner:** Mom (age 40)
- **Family Members:**
  - Dad (age 42) - Full caregiver ✓
  - Child 1 (age 18) - Full caregiver ✓
  - Child 2 (age 15) - Limited caregiver ✓ (trusted)
  - Child 3 (age 12) - Not a caregiver ✗
  - Child 4 (age 8) - Not a caregiver ✗
  - Dog (age 5) - Not a caregiver ✗
  - Cat (age 3) - Not a caregiver ✗
- **Plan:** Family Plus (10 seats) - $29.99/month ⭐
- **Seats Used:** 8/10

---

## Future Enhancements

### Phase 2 Features
- Transfer ownership to another family member
- Temporary caregiver access (babysitter mode)
- Emergency access codes
- Caregiver activity dashboard
- Family health insights (aggregated)

### Phase 3 Features
- Multi-household support (grandparents in separate house)
- Shared calendars across family
- Family health goals and challenges
- Caregiver shift scheduling
- Medical appointment coordination

---

## Migration Strategy

### Existing Users (Grandfathering)
1. Identify all current patients (family members)
2. Count seats used
3. Assign appropriate plan:
   - 1 seat → Single User
   - 2-5 seats → Family Basic
   - 6-10 seats → Family Plus
   - 11+ seats → Family Premium
4. Enable caregiver permissions for age-appropriate members
5. Set `currentPeriodEnd = null` (no expiration)
6. Mark as grandfathered

### New Users
- Start with Free Trial (14 days, 1 seat)
- Must upgrade after trial
- Seat limits enforced immediately
- Age-based rules apply from day 1

---

## Notes

- All prices subject to change
- Stripe integration required for billing
- Family members with no account still count as seats
- External caregivers do NOT count as seats
- Age calculated from DOB in real-time
- Owner can override age restrictions with trust confirmation
