# Admin Panel Setup Guide

## Overview

The WPL admin panel provides comprehensive tools for managing the platform, including user support, content moderation, trust & safety, AI decision review, and analytics.

## Access Levels

### Super Admins (Hardcoded)
**Emails:**
- `perriceconsulting@gmail.com`
- `weigthlossprojectionlab@gmail.com`

**Privileges:**
- Full read/write access to all admin functions
- Cannot be revoked or downgraded
- Can grant/revoke admin roles to other users
- Automatically assigned `role: 'admin'` in Firestore on first login

### Admin Roles

**Admin** - Full access to all admin functions
- User management (view, edit, suspend, delete)
- Recipe moderation (approve, reject, feature)
- Trust & Safety case resolution
- AI decision review and reversal
- Coaching administration
- Perk management
- Analytics & reporting
- System settings

**Moderator** - Content moderation focus
- View users
- Recipe moderation (approve, reject, feature)
- Trust & Safety case resolution
- View analytics

**Support** - User support focus
- View users
- Export user data (GDPR)
- View Trust & Safety cases
- View analytics

## How to Access Admin Panel

1. **Log in with super admin email:**
   - Visit `https://your-app.com/auth`
   - Log in with one of the super admin emails

2. **Navigate to admin panel:**
   - Visit `https://your-app.com/admin`
   - You should see the admin dashboard with navigation sidebar

3. **Verify access:**
   - Check for "Super Admin" badge on dashboard
   - Confirm all navigation items are visible

## Granting Admin Access to Others

### Using API (Super Admins Only)

```bash
# Grant admin role
curl -X POST https://your-app.com/api/admin/grant-role \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "uid-of-user",
    "role": "admin",
    "action": "grant"
  }'

# Grant moderator role
curl -X POST https://your-app.com/api/admin/grant-role \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "uid-of-user",
    "role": "moderator",
    "action": "grant"
  }'

# Revoke admin role
curl -X POST https://your-app.com/api/admin/grant-role \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "uid-of-user",
    "action": "revoke"
  }'
```

### Manually in Firestore (Super Admins Only)

1. Open Firebase Console
2. Navigate to Firestore Database
3. Go to `users/{userId}` collection
4. Update the user document:
   ```json
   {
     "role": "admin",  // or "moderator", "support"
     "updatedAt": "2025-10-22T00:00:00Z"
   }
   ```

## Admin Panel Features

### Dashboard (`/admin`)
- Platform health overview
- Pending actions summary
- Quick access to all admin functions
- Recent admin activity log

### Users (`/admin/users`)
- Search users by email/uid
- View user profiles and activity
- Suspend/unsuspend accounts
- Export user data (GDPR)
- Delete accounts

### Recipes (`/admin/recipes`)
- Review pending recipe submissions
- Approve/reject with reasons
- Feature recipes on homepage
- View approved/rejected history

### Trust & Safety (`/admin/trust-safety`)
- Review dispute cases
- Risk score assessment
- Evidence collection
- Case resolution (refund/deny/escalate)
- Coach strike management

### AI Decisions (`/admin/ai-decisions`)
- Review low-confidence AI decisions
- Decision history with filters
- Reverse AI decisions with rationale
- Statistics and analytics

### Coaching (`/admin/coaching`)
- Approve coach applications
- Manage coach strikes
- Payout management
- Billing disputes

### Perks (`/admin/perks`)
- Create/edit perks
- Manage partners
- Track redemptions
- Inventory management

### Analytics (`/admin/analytics`)
- User metrics (DAU, MAU, retention)
- Technical metrics (performance, uptime)
- Business metrics (revenue, conversions)
- Recipe platform analytics

### Settings (`/admin/settings`)
- Manage admin users
- Feature flags
- System configuration
- Audit log viewer

## Security Features

### Audit Logging
All admin actions are automatically logged to `admin_audit_logs` collection:
- Who performed the action
- What action was performed
- Target of the action
- Timestamp and reason
- Changes made (before/after)

### Firestore Security Rules
- Super admins bypass all role checks
- Admin/moderator/support roles enforced server-side
- Audit logs are append-only
- User role field cannot be self-modified

### Access Protection
- All admin routes check authentication
- Role verification on every API call
- Super admins cannot be locked out
- Failed auth attempts logged

## Troubleshooting

### "Access Denied" Error
**Symptom:** Cannot access admin panel despite being super admin

**Solutions:**
1. Verify you're logged in with correct email
2. Check browser console for errors
3. Clear browser cache and cookies
4. Log out and log back in
5. Check Firestore to confirm `role: 'admin'` exists

### API "Unauthorized" Error
**Symptom:** API calls fail with 401/403

**Solutions:**
1. Verify ID token is valid and not expired
2. Check Authorization header format: `Bearer YOUR_TOKEN`
3. Confirm super admin email matches exactly
4. Check Firestore rules are deployed

### Role Not Updating
**Symptom:** Role change doesn't take effect

**Solutions:**
1. Log out and log back in
2. Check Firestore for role field
3. Verify role is one of: `admin`, `moderator`, `support`, or `null`
4. Check browser console for errors

## Best Practices

1. **Use Super Admin Sparingly:** Grant regular admin roles to team members instead of hardcoding more super admins

2. **Audit Regularly:** Review admin audit logs for suspicious activity

3. **Grant Minimum Permissions:** Use support/moderator roles when full admin isn't needed

4. **Document Actions:** Always provide notes when moderating content or resolving cases

5. **Test in Staging:** Test role changes in staging environment before production

## File Locations

**Frontend:**
- `hooks/useAdminAuth.ts` - Admin authentication hook
- `lib/admin/permissions.ts` - RBAC permission system
- `lib/admin/audit.ts` - Audit logging utilities
- `components/admin/AdminNav.tsx` - Navigation sidebar
- `app/(dashboard)/admin/` - All admin pages

**Backend:**
- `app/api/admin/` - All admin API routes
- `firestore.rules` - Security rules with super admin checks

**Configuration:**
- Super admin emails defined in:
  - `hooks/useAdminAuth.ts` (lines 18-21)
  - `lib/admin/permissions.ts` (lines 18-21)
  - `firestore.rules` (lines 19-21)

## Support

For questions or issues:
- Email: perriceconsulting@gmail.com
- GitHub Issues: https://github.com/your-repo/issues
