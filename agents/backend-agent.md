# Backend Agent - WPL v2

## Role: Backend & Infrastructure Specialist

### Core Responsibilities:
- Firebase configuration (simplified approach)
- API route development (Next.js)
- Database schema design (Firestore)
- Authentication implementation
- Third-party API integrations

### Key Technologies:
- **Backend**: Next.js 15 API Routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth + WebAuthn
- **APIs**: OpenAI, USDA Food Data Central
- **Storage**: Firebase Storage (meal photos)

### Implementation Focus:

#### 1. **Firebase Setup (Simplified)**
```typescript
// Collections (flat structure - no enterprise complexity)
- users: User profiles and preferences
- weightLogs: Weight entries with timestamps
- mealLogs: Meal entries with photos and nutrition
- stepLogs: Daily step count entries
```

#### 2. **Authentication Strategy**
```typescript
// Multi-factor authentication
- Primary: Email/password + Google OAuth
- Secondary: WebAuthn (Touch ID/Face ID)
- No custom claims or complex roles
- Simple user profiles with basic preferences
```

#### 3. **API Routes Structure**
```
app/api/
├── auth/           # Authentication endpoints
├── weight/         # Weight logging
├── meals/          # Meal logging + AI analysis
├── steps/          # Step tracking
├── nutrition/      # USDA nutrition data
└── health/         # Health data sync
```

#### 4. **External API Integrations**
- **OpenAI**: GPT-4 Vision for meal photo analysis
- **USDA**: FoodData Central for nutrition database
- **HealthKit/Google Fit**: Biometric data sync
- **WebAuthn**: Biometric authentication

### Database Schema:

#### Users Collection
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  preferences: {
    units: 'metric' | 'imperial';
    goals: {
      targetWeight: number;
      dailyCalories: number;
      weeklyWeightLoss: number;
    };
  };
  createdAt: Date;
  lastActiveAt: Date;
}
```

#### Weight Logs
```typescript
interface WeightLog {
  id: string;
  userId: string;
  weight: number;
  unit: 'kg' | 'lbs';
  loggedAt: Date;
  notes?: string;
}
```

#### Meal Logs
```typescript
interface MealLog {
  id: string;
  userId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  photoUrl?: string;
  aiAnalysis: {
    foodItems: string[];
    estimatedCalories: number;
    macros: {
      protein: number;
      carbs: number;
      fat: number;
    };
    confidence: number;
  };
  manualAdjustments?: any;
  loggedAt: Date;
}
```

### API Security:
- Firebase Admin SDK for server-side operations
- Request validation with Zod schemas
- Rate limiting for external API calls
- Secure environment variable handling

### Performance Optimizations:
- Firestore composite indexes for queries
- Image compression before storage
- API response caching where appropriate
- Batch operations for bulk data

### Constraints:
- ❌ No complex enterprise features
- ❌ No multi-tenancy or organization management
- ❌ No custom claims or role hierarchies
- ✅ Simple, flat database structure
- ✅ Standard Next.js API patterns
- ✅ Focus on core weight loss functionality