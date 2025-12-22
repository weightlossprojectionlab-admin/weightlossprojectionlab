#!/bin/bash
set -e

echo "Fixing TypeScript errors..."

# 1. Fix useNotificationPreferences.ts - line 216
sed -i "216s/.*/          logger.info('[NotificationPreferences] Preferences loaded', { loaded: true })/" hooks/useNotificationPreferences.ts

# 2. Fix useRealtimeExpiredItems.ts - line 106
sed -i "106s/.*/          const expiresAt = item.expiresAt instanceof Date ? item.expiresAt : (item.expiresAt as any)?.toDate?.() || new Date(item.expiresAt as any)/" hooks/useRealtimeExpiredItems.ts

# 3. Fix useStepCounter.ts - line 123
sed -i "123s/.*/            logger.debug('[Step Counter] Restored from storage', { totalSteps: data.totalSteps })/" hooks/useStepCounter.ts

# 4. Fix useMeals.ts - line 81
sed -i "81s/.*/    data: Omit<MealLog, 'id' | 'patientId' | 'userId' | 'loggedBy'>/" hooks/useMeals.ts

echo "Hook files fixed"
