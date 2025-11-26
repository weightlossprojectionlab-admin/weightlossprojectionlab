# Weight Loss Project Lab - System Flow Diagrams

> **Visual diagrams for understanding data flows and system architecture**
> These Mermaid diagrams can be viewed in GitHub, VS Code, or exported as images for Figma

---

## Table of Contents

1. [Overall Platform Architecture](#overall-platform-architecture)
2. [User Authentication Flow](#user-authentication-flow)
3. [Weight Tracking Data Flow](#weight-tracking-data-flow)
4. [Meal Logging Flow](#meal-logging-flow)
5. [Medical Records System](#medical-records-system)
6. [Shopping to Inventory Flow](#shopping-to-inventory-flow)
7. [Recipe to Cooking Flow](#recipe-to-cooking-flow)
8. [AI Decision Review Workflow](#ai-decision-review-workflow)
9. [Family Collaboration Flow](#family-collaboration-flow)
10. [Performance Optimization Flow](#performance-optimization-flow)

---

## Overall Platform Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        PWA[Progressive Web App<br/>Next.js 14]
        Mobile[Mobile Browser]
        Desktop[Desktop Browser]
    end

    subgraph "Authentication"
        Auth[Firebase Auth]
        Biometric[WebAuthn Biometric]
    end

    subgraph "Backend Services"
        Firestore[(Firestore Database)]
        Storage[Firebase Storage]
        Functions[Cloud Functions]
    end

    subgraph "AI Services"
        Gemini[Google Gemini AI]
        Vision[Gemini Vision]
        USDA[USDA FoodData API]
    end

    subgraph "External Services"
        HealthKit[Apple Health]
        GoogleFit[Google Fit]
        Bluetooth[Bluetooth Devices]
        Camera[Device Camera]
    end

    Mobile --> PWA
    Desktop --> PWA

    PWA --> Auth
    PWA --> Biometric
    Auth --> Functions

    PWA --> Firestore
    PWA --> Storage
    PWA --> Functions

    Functions --> Gemini
    Functions --> Vision
    Functions --> USDA

    PWA --> HealthKit
    PWA --> GoogleFit
    PWA --> Bluetooth
    PWA --> Camera

    style PWA fill:#4CAF50
    style Firestore fill:#FF9800
    style Gemini fill:#2196F3
```

---

## User Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant App
    participant Auth as Firebase Auth
    participant FS as Firestore
    participant Onboard as Onboarding Flow

    User->>App: Visit app
    App->>Auth: Check auth status

    alt User Not Authenticated
        Auth-->>App: No user
        App->>User: Show landing page
        User->>App: Sign up / Sign in
        App->>Auth: Create account / Login
        Auth->>FS: Create user document
        Auth-->>App: User authenticated

        App->>FS: Check onboarding status
        FS-->>App: onboardingCompleted: false
        App->>Onboard: Redirect to onboarding

        Onboard->>User: Step 1: Profile
        User->>Onboard: Enter profile data
        Onboard->>User: Step 2: Goals
        User->>Onboard: Set weight goals
        Onboard->>User: Step 3: Health
        User->>Onboard: Health conditions

        Onboard->>FS: Save complete profile
        FS-->>Onboard: Success
        Onboard->>FS: Mark onboarding complete
        Onboard->>App: Redirect to dashboard
    else User Authenticated
        Auth-->>App: User object
        App->>FS: Fetch user profile
        FS-->>App: Profile data

        alt Onboarding Complete
            App->>User: Show dashboard
        else Onboarding Incomplete
            App->>Onboard: Resume onboarding
        end
    end

    Note over User,FS: Biometric authentication (WebAuthn)<br/>available after first login
```

---

## Weight Tracking Data Flow

```mermaid
graph TB
    User[User Action] --> LogType{Log Type?}

    LogType -->|Manual| Manual[Manual Entry Form]
    LogType -->|Photo| Photo[Take Photo of Scale]
    LogType -->|Bluetooth| BT[Bluetooth Scale Sync]

    Manual --> WeightValue[Enter Weight Value]
    WeightValue --> Unit[Select Unit lbs/kg]
    Unit --> Notes[Optional Notes/Tags]

    Photo --> CameraCapture[Capture Photo]
    CameraCapture --> Upload[Upload to Storage]
    Upload --> ManualConfirm[Manual Entry Required]
    ManualConfirm --> Notes

    BT --> DeviceConnect[Connect to Scale]
    DeviceConnect --> AutoRead[Auto-read Weight]
    AutoRead --> Notes

    Notes --> Validate{Valid?}
    Validate -->|No| Error[Show Error]
    Validate -->|Yes| CreateLog[Create WeightLog]

    CreateLog --> Firestore[(weight-logs collection)]

    Firestore --> UpdateProfile[Update Profile Current Weight]
    Firestore --> RecalcGoals[Recalculate Goal Progress]
    Firestore --> UpdateChart[Update Weight Chart]
    Firestore --> CheckMilestone{Hit Milestone?}

    CheckMilestone -->|Yes| XP[Award XP]
    CheckMilestone -->|Yes| Badge[Unlock Badge]
    CheckMilestone -->|No| Done[Done]

    XP --> Done
    Badge --> Done

    RecalcGoals --> AICheck{Check AI Coach}
    AICheck -->|Plateau Detected| Recommendation[Create Recommendation]
    AICheck -->|Rapid Loss| Warning[Safety Warning]
    AICheck -->|Normal| Done

    Recommendation --> Done
    Warning --> Done

    style CreateLog fill:#4CAF50
    style Firestore fill:#FF9800
    style XP fill:#FFD700
```

---

## Meal Logging Flow

```mermaid
sequenceDiagram
    actor User
    participant Camera
    participant Storage
    participant App
    participant Gemini as Gemini Vision AI
    participant USDA as USDA API
    participant FS as Firestore

    User->>App: Click "Log Meal"
    App->>Camera: Request camera permission
    Camera-->>App: Permission granted

    User->>Camera: Take photo
    Camera->>App: Image captured

    App->>User: Show photo preview
    User->>App: Confirm photo

    App->>App: Compress image (WebP, 500KB)
    App->>Storage: Upload compressed image
    Storage-->>App: Download URL

    App->>Gemini: Analyze photo<br/>(food items, portions, nutrition)

    Note over Gemini: AI analyzes image<br/>Identifies foods<br/>Estimates portions<br/>Calculates nutrition

    Gemini-->>App: Analysis result<br/>{foods, calories, macros, confidence}

    App->>User: Show AI analysis

    par USDA Validation for each food item
        App->>USDA: Search for food 1
        USDA-->>App: USDA data
        App->>USDA: Search for food 2
        USDA-->>App: USDA data
        App->>USDA: Search for food 3
        USDA-->>App: USDA data
    end

    App->>App: Merge AI + USDA data
    App->>User: Show validated nutrition

    alt User wants to adjust
        User->>App: Edit values
        App->>User: Show edit form
        User->>App: Submit adjustments
    end

    App->>FS: Create meal-log document
    FS-->>App: Success

    App->>FS: Update dashboard summary
    App->>FS: Check if template worthy

    opt Low confidence or user flagged
        App->>FS: Create AI decision for review
        FS-->>App: Decision ID
    end

    App->>User: Meal logged successfully

    Note over User,FS: Real-time nutrition summary updates<br/>XP awarded<br/>Daily mission progress updated
```

---

## Medical Records System

```mermaid
graph TB
    subgraph "Family Structure"
        Owner[Account Owner]
        Patient1[Patient: Self]
        Patient2[Patient: Spouse]
        Patient3[Patient: Child]
        Patient4[Patient: Pet]
        FamMem[Family Members<br/>with Permissions]
    end

    Owner --> Patient1
    Owner --> Patient2
    Owner --> Patient3
    Owner --> Patient4
    Owner --> FamMem

    subgraph "Medical Records per Patient"
        Vitals[Health Vitals<br/>BP, Sugar, SpO2, Temp]
        WeightLogs[Weight Logs]
        MealLogs[Meal Logs]
        StepLogs[Step Logs]
        Meds[Medications]
        Docs[Documents<br/>Insurance, Labs, Rx]
        Appts[Appointments]
    end

    Patient1 --> Vitals
    Patient1 --> WeightLogs
    Patient1 --> MealLogs
    Patient1 --> StepLogs
    Patient1 --> Meds
    Patient1 --> Docs
    Patient1 --> Appts

    subgraph "Healthcare Network"
        Providers[Healthcare Providers]
        PCP[Primary Care]
        Specialist[Specialists]
        Dentist[Dentist]
        Vet[Veterinarian]
        Pharmacy[Pharmacy]
    end

    Appts --> Providers
    Providers --> PCP
    Providers --> Specialist
    Providers --> Dentist
    Providers --> Vet
    Providers --> Pharmacy

    subgraph "AI Features"
        AIHealth[AI Health Profile<br/>Dietary Restrictions]
        AIAppt[AI Appointment<br/>Recommendations]
        AISafety[Meal Safety Check]
    end

    Vitals --> AIHealth
    Meds --> AIHealth
    Docs --> AIHealth

    WeightLogs --> AIAppt
    Vitals --> AIAppt
    Appts --> AIAppt

    MealLogs --> AISafety
    AIHealth --> AISafety

    subgraph "Collaboration"
        Invite[Invite Family Member]
        Permissions[Set Permissions]
        Notify[Notifications]
        Driver[Driver Assignment]
    end

    FamMem --> Invite
    FamMem --> Permissions
    FamMem --> Notify
    Appts --> Driver
    Driver --> FamMem

    style Owner fill:#4CAF50
    style AIHealth fill:#2196F3
    style Vitals fill:#FF5722
```

---

## Shopping to Inventory Flow

```mermaid
graph LR
    subgraph "Input Sources"
        Manual[Manual Add]
        Barcode[Barcode Scan]
        Recipe[Recipe Import]
    end

    subgraph "Shopping List"
        SL[Shopping List Items]
        Category[Categorized]
        Store[Store Selected]
        Nutrition[Nutrition Preview]
    end

    Manual --> SL
    Barcode --> ProductDB[(Product Database)]
    ProductDB --> SL
    Recipe --> Ingredients[Extract Ingredients]
    Ingredients --> CheckInv{In Inventory?}
    CheckInv -->|No| SL
    CheckInv -->|Yes| Skip[Skip Item]

    SL --> Category
    Category --> Store
    Store --> Nutrition

    Nutrition --> HealthCheck{Health Compatible?}
    HealthCheck -->|Warning| Alert[Show Warning]
    HealthCheck -->|OK| Ready[Ready to Shop]

    Alert --> UserDecide{User Decision}
    UserDecide -->|Remove| RemoveItem[Remove from List]
    UserDecide -->|Keep| Ready

    Ready --> Shopping[Go Shopping]
    Shopping --> Purchase{Item Purchased?}

    Purchase -->|Yes| Inventory[(Kitchen Inventory)]
    Purchase -->|No| StillNeeded[Remains on List]

    Inventory --> Expiration[Set Expiration Date]
    Expiration --> Calendar[Expiration Calendar]

    Calendar --> Monitor{Days to Expire}
    Monitor -->|7 days| Notification[Notification]
    Monitor -->|3 days| UrgentNotif[Urgent Notification]
    Monitor -->|Expired| Waste[Track Waste]

    Monitor --> RecipeSuggest[Recipe Suggestions<br/>Use Before Expires]

    Inventory --> Consume{Consumed?}
    Consume -->|Yes| Remove[Remove from Inventory]
    Consume -->|Partial| Adjust[Adjust Quantity]
    Consume -->|Expired| Waste

    Waste --> Analytics[Waste Analytics]
    Analytics --> Insights[Insights & Tips]

    style SL fill:#FF9800
    style Inventory fill:#4CAF50
    style Waste fill:#f44336
```

---

## Recipe to Cooking Flow

```mermaid
sequenceDiagram
    actor User
    participant Recipes
    participant Recipe
    participant Inventory
    participant App
    participant Timer
    participant Session
    participant MealLog

    User->>Recipes: Browse recipes
    Recipes->>Inventory: Check ingredient availability
    Inventory-->>Recipes: Available ingredients
    Recipes->>User: Show recipes with badges<br/>"8/10 ingredients available"

    User->>Recipe: Click recipe
    Recipe->>User: Show recipe details

    alt Add to Shopping List
        User->>Recipe: "Add missing ingredients"
        Recipe->>Inventory: Get missing items
        Inventory-->>Recipe: Missing list
        Recipe->>App: Add to shopping list
        App-->>User: Added to shopping list
    end

    alt Add to Queue
        User->>Recipe: "Save for later"
        Recipe->>App: Add to queue
        App-->>User: Added to queue
    end

    alt Start Cooking
        User->>Recipe: "Start Cooking"
        Recipe->>App: Create cooking session
        App->>Session: Initialize session<br/>{recipeId, servingSize, mealType}
        Session-->>User: Cooking mode activated

        loop For each step
            Session->>User: Show step instructions

            opt Step has timer
                Session->>Timer: Start timer<br/>"Bake for 25 minutes"
                Timer->>User: Visual countdown
                Timer->>User: Notification when done
            end

            User->>Session: Mark step complete
            Session->>Session: Move to next step
        end

        Session->>User: All steps complete!

        User->>Session: Mark session complete
        Session->>App: Cooking completed

        App->>User: Auto-log meal?

        alt Auto-log meal
            User->>App: Yes, log meal
            App->>MealLog: Create meal log<br/>{recipeId, nutrition, servingSize}

            opt Take photo
                User->>App: Add photo
                App->>MealLog: Attach photo
            end

            MealLog-->>App: Meal logged
            App->>User: XP awarded!
        else Skip logging
            User->>App: Skip
        end

        opt Add leftovers to inventory
            User->>App: Store leftovers
            App->>Inventory: Add leftover portions
            Inventory-->>User: Added to inventory
        end
    end

    Note over User,MealLog: Real-time step progress<br/>Multiple concurrent timers<br/>Background timer notifications
```

---

## AI Decision Review Workflow

```mermaid
graph TB
    subgraph "AI Actions Requiring Review"
        MealAnalysis[Meal Photo Analysis<br/>Low Confidence <70%]
        HealthProfile[Health Profile Generation<br/>All new profiles]
        SafetyCheck[Meal Safety Warning<br/>Critical severity]
    end

    MealAnalysis --> Queue
    HealthProfile --> Queue
    SafetyCheck --> Queue

    Queue[(AI Decisions Queue<br/>Firestore)]

    Queue --> AdminPanel[Admin Panel<br/>AI Decisions Tab]

    AdminPanel --> FilterSort{Filter & Sort}
    FilterSort -->|Type| ByType[By Decision Type]
    FilterSort -->|Confidence| ByConf[By Confidence Score]
    FilterSort -->|Severity| BySev[By Severity]
    FilterSort -->|Date| ByDate[By Creation Date]

    ByType --> DecisionCard
    ByConf --> DecisionCard
    BySev --> DecisionCard
    ByDate --> DecisionCard

    DecisionCard[Decision Card Display]

    DecisionCard --> AdminView{Admin Reviews}

    AdminView -->|Meal Analysis| ViewMeal[View Photo + AI Analysis]
    AdminView -->|Health Profile| ViewProfile[View Conditions + Restrictions]
    AdminView -->|Safety Check| ViewWarning[View Meal + Warnings]

    ViewMeal --> AdminAction
    ViewProfile --> AdminAction
    ViewWarning --> AdminAction

    AdminAction{Admin Decision}

    AdminAction -->|Approve| Approve[Mark as Approved<br/>Trust AI]
    AdminAction -->|Modify| Edit[Edit Values<br/>Correct AI]
    AdminAction -->|Reject| Reject[Mark as Rejected<br/>Bad Analysis]
    AdminAction -->|Flag User| FlagUser[Create Trust & Safety Case]

    Approve --> UpdateFS[Update Firestore<br/>reviewStatus: approved]
    Edit --> UpdateFS
    Reject --> UpdateFS
    FlagUser --> TrustSafety[Trust & Safety System]

    UpdateFS --> NotifyUser{User Notification?}
    NotifyUser -->|Yes| SendNotif[Send Notification]
    NotifyUser -->|No| LogAudit[Audit Log]

    SendNotif --> LogAudit
    LogAudit --> ModelTraining[Data for Model Training]

    subgraph "Analytics"
        ModelTraining --> ApprovalRate[Approval Rate by Type]
        ModelTraining --> CommonErrors[Common AI Errors]
        ModelTraining --> ReviewerPerf[Reviewer Performance]
    end

    ApprovalRate --> ModelImprovement[Model Improvement]
    CommonErrors --> ModelImprovement
    ReviewerPerf --> ProcessImprovement[Process Improvement]

    style Queue fill:#FF9800
    style AdminPanel fill:#2196F3
    style ModelImprovement fill:#4CAF50
```

---

## Family Collaboration Flow

```mermaid
sequenceDiagram
    actor Owner as Account Owner
    actor FamilyMember as Family Member
    participant App
    participant FS as Firestore
    participant Email
    participant Permissions

    Owner->>App: Go to Family tab
    App->>FS: Fetch family members
    FS-->>App: Current members list
    App->>Owner: Show family members

    Owner->>App: Click "Invite Family"
    App->>Owner: Show invite form

    Owner->>App: Enter email<br/>Select patients to share<br/>Set permissions
    App->>FS: Create invitation document
    FS-->>App: Invitation ID + code

    App->>Email: Send invite email
    Email-->>FamilyMember: Invitation received

    FamilyMember->>App: Click invite link
    App->>FS: Verify invitation

    alt Valid Invitation
        FS-->>App: Invitation valid

        alt New User
            App->>FamilyMember: Sign up form
            FamilyMember->>App: Create account
            App->>FS: Create user
        else Existing User
            App->>FamilyMember: Sign in
            FamilyMember->>App: Login
        end

        App->>FamilyMember: Show invitation details<br/>Patients: Mom, Dad<br/>Permissions: View, Edit, Log

        FamilyMember->>App: Accept invitation

        App->>FS: Update invitation status
        App->>FS: Add to family-members collection
        App->>FS: Grant patient access

        FS-->>App: Success
        App->>Email: Notify owner (acceptance)
        App->>FamilyMember: Welcome! Access granted

    else Invalid/Expired
        FS-->>App: Invalid invitation
        App->>FamilyMember: Invitation expired/invalid
    end

    Note over FamilyMember,FS: Family member can now access<br/>shared patient records

    FamilyMember->>App: View patient dashboard
    App->>Permissions: Check permissions
    Permissions-->>App: Allowed actions

    App->>FS: Fetch patient data
    FS-->>App: Patient records (filtered by permissions)
    App->>FamilyMember: Show patient dashboard

    alt Log Vital for Patient
        FamilyMember->>App: Log blood pressure for Mom
        App->>Permissions: Can log vitals?
        Permissions-->>App: Yes

        FamilyMember->>App: Enter BP values
        App->>FS: Create vital-sign document<br/>takenBy: FamilyMember.userId
        FS-->>App: Success

        App->>Email: Notify owner (new vital logged)
        App->>FamilyMember: Vital logged successfully
    end

    alt Schedule Appointment
        FamilyMember->>App: Schedule appointment for Dad
        App->>Permissions: Can schedule appointments?
        Permissions-->>App: Yes

        FamilyMember->>App: Fill appointment form
        App->>FS: Create appointment
        FS-->>App: Appointment ID

        App->>Email: Notify owner + dad (new appointment)
        App->>FamilyMember: Appointment scheduled
    end

    alt Assigned as Driver
        App->>Email: Notify FamilyMember<br/>"You're assigned as driver for Dad's appointment"
        FamilyMember->>Email: Receive notification
        FamilyMember->>App: Open app
        App->>FamilyMember: Show appointment details<br/>Pickup time, location

        FamilyMember->>App: Accept / Decline driver role

        alt Accept
            App->>FS: Update appointment<br/>driverStatus: accepted
            FS-->>App: Updated
            App->>Email: Notify owner (driver accepted)
        else Decline
            App->>FS: Update appointment<br/>driverStatus: declined
            App->>Email: Notify owner (driver declined)
            App->>Owner: Find new driver
        end
    end

    Note over Owner,Permissions: Granular permission control<br/>Audit trail of all actions<br/>Real-time notifications
```

---

## Performance Optimization Flow

```mermaid
graph TB
    subgraph "Current Slow Path"
        UserRequest[User Requests Dashboard]
        Sequential[Sequential Queries]
        Q1[Query 1: Profile]
        Q2[Query 2: Goals]
        Q3[Query 3: Meal Logs]
        Q4[Query 4: Step Logs]
        Q5[Query 5: Weight Logs]
        Q6[Query 6: Recommendations]
        Q7[Query 7: Appointments]

        UserRequest --> Sequential
        Sequential --> Q1
        Q1 --> Q2
        Q2 --> Q3
        Q3 --> Q4
        Q4 --> Q5
        Q5 --> Q6
        Q6 --> Q7
        Q7 --> SlowRender[Render Dashboard<br/>⏱️ 3.2 seconds]
    end

    subgraph "Optimized Path"
        UserRequest2[User Requests Dashboard]

        ServiceWorker[Service Worker<br/>Check Cache]
        Cache{Cache Hit?}

        UserRequest2 --> ServiceWorker
        ServiceWorker --> Cache

        Cache -->|Yes| CachedData[Return Cached Data<br/>⏱️ 0.1 seconds]
        Cache -->|No| ParallelQueries[Parallel Queries<br/>React Query]

        CachedData --> StaleRevalidate[Stale-While-Revalidate<br/>Update in Background]

        ParallelQueries --> P1[Query 1: Profile]
        ParallelQueries --> P2[Query 2: Summary Doc]
        ParallelQueries --> P3[Query 3: Recommendations]

        P1 --> FastRender
        P2 --> FastRender
        P3 --> FastRender

        FastRender[Render Dashboard<br/>⏱️ 0.8 seconds]
    end

    subgraph "Data Denormalization"
        CloudFunction[Cloud Function Triggers]

        MealLogged[Meal Logged]
        WeightLogged[Weight Logged]
        StepLogged[Step Logged]

        MealLogged --> CloudFunction
        WeightLogged --> CloudFunction
        StepLogged --> CloudFunction

        CloudFunction --> UpdateSummary[Update Dashboard Summary Doc]
        UpdateSummary --> SummaryDoc[(users/{uid}/dashboard-summary)]

        SummaryDoc --> Contains[Contains:<br/>- Today's nutrition<br/>- Today's steps<br/>- Weight trend<br/>- Urgent recommendations]
    end

    subgraph "Caching Strategy"
        L1[L1: React Query<br/>In-Memory Cache<br/>TTL: 5 min]
        L2[L2: IndexedDB<br/>Local Storage<br/>TTL: 1 hour]
        L3[L3: Service Worker<br/>HTTP Cache<br/>TTL: 24 hours]
        L4[L4: CDN<br/>Static Assets<br/>TTL: 7 days]

        L1 --> L2
        L2 --> L3
        L3 --> L4
    end

    subgraph "Code Splitting"
        InitialBundle[Initial Bundle<br/>Core features only]
        LazyCharts[Lazy: Chart Libraries]
        LazyCamera[Lazy: Camera Components]
        LazyAdmin[Lazy: Admin Portal]

        InitialBundle --> PageLoad[Fast Initial Load]
        LazyCharts --> OnDemand[Load on Demand]
        LazyCamera --> OnDemand
        LazyAdmin --> OnDemand
    end

    subgraph "Image Optimization"
        OriginalImage[Original Photo<br/>2-5 MB]
        Compress[Compress + WebP<br/>500 KB]
        Thumbnail[Generate Thumbnail<br/>50 KB]
        CDN_Upload[Upload to CDN]

        OriginalImage --> Compress
        Compress --> Thumbnail
        Thumbnail --> CDN_Upload
        CDN_Upload --> LazyLoad[Lazy Load Images<br/>Blur Placeholder]
    end

    style SlowRender fill:#f44336
    style FastRender fill:#4CAF50
    style SummaryDoc fill:#FF9800
    style L1 fill:#2196F3
```

---

## Subscription & Feature Gating Flow

```mermaid
graph TB
    User[User Account] --> CheckSub{Check Subscription}

    CheckSub --> Free[Free Plan<br/>1 Patient<br/>Basic Features]
    CheckSub --> Single[Single Plan<br/>1 Patient<br/>All Features]
    CheckSub --> Family[Family Plan<br/>10 Patients<br/>All Features + Family]

    Free --> FreeFeatures[Allowed:<br/>- Weight/Meal/Step logging<br/>- Basic recipes<br/>- Progress charts]

    Single --> SingleFeatures[Free Features +<br/>- AI coaching<br/>- Advanced analytics<br/>- Export data]

    Family --> FamilyFeatures[Single Features +<br/>- 10 patients<br/>- Family collaboration<br/>- Shared shopping lists<br/>- Medical records<br/>- Appointment scheduling]

    subgraph "Feature Gate Check"
        ActionRequest[User Action] --> FeatureGate{Feature Gate}

        FeatureGate --> CheckPlan[Check User Plan]
        CheckPlan --> CheckLimit[Check Usage Limits]

        CheckLimit --> Allow{Allowed?}
        Allow -->|Yes| GrantAccess[Grant Access]
        Allow -->|No| ShowUpgrade[Show Upgrade Modal]

        ShowUpgrade --> Upgrade{User Upgrades?}
        Upgrade -->|Yes| Stripe[Stripe Checkout]
        Stripe --> UpdateSub[Update Subscription]
        UpdateSub --> GrantAccess

        Upgrade -->|No| Block[Block Access]
    end

    subgraph "Patient Limit Example"
        AddPatient[User Clicks "Add Patient"]
        AddPatient --> CountPatients{Count Patients}

        CountPatients -->|"1 (Free Plan)"| MaxReached[Max Reached]
        CountPatients -->|"1 (Single Plan)"| MaxReached
        CountPatients -->|"<10 (Family Plan)"| AllowAdd[Allow Add]

        MaxReached --> ShowUpgrade
        AllowAdd --> CreatePatient[Create Patient]
    end

    subgraph "Add-on Features"
        FamilyAddon[Family Features Add-on]
        FutureAddon[Future Add-ons]

        Single --> CanBuyAddon{Buy Family Add-on?}
        CanBuyAddon -->|Yes| SingleWithFamily[Single + Family Features]
        SingleWithFamily --> EquivalentToFamily[Equivalent to Family Plan]
    end

    style Free fill:#9E9E9E
    style Single fill:#2196F3
    style Family fill:#4CAF50
    style ShowUpgrade fill:#FF9800
```

---

## Complete User Journey Map

```mermaid
journey
    title Weight Loss Project Lab - User Journey
    section Discovery
      Find app online: 5: User
      Read features: 4: User
      Sign up: 5: User
    section Onboarding
      Enter profile data: 4: User
      Set weight goals: 5: User
      Add health conditions: 3: User
      Complete setup: 5: User
    section Daily Usage
      Log breakfast: 5: User
      Take meal photo: 4: User
      AI analyzes food: 5: User, AI
      Review nutrition: 4: User
      Check daily progress: 5: User
      Log weight: 4: User
      View weight trend: 5: User
    section Weekly Routine
      Plan meals for week: 4: User
      Browse recipes: 5: User
      Add ingredients to shopping: 5: User
      Go grocery shopping: 4: User
      Scan barcodes: 5: User
      Check nutrition warnings: 4: User, AI
      Purchase items: 5: User
      Add to inventory: 4: User
    section Cooking
      Pick recipe from queue: 5: User
      Start cooking session: 5: User
      Follow step-by-step: 5: User
      Use timers: 5: User
      Complete cooking: 5: User
      Auto-log meal: 5: User
    section Medical (Family)
      Add family members: 4: User
      Invite spouse: 3: User
      Spouse accepts: 5: Spouse
      Log parent's vitals: 4: Spouse
      Schedule doctor appointment: 4: User
      AI recommends checkup: 5: AI
      Assign driver: 3: User
      Driver accepts: 4: Family
    section Gamification
      Complete daily mission: 5: User
      Earn XP: 5: User
      Unlock badge: 5: User
      Join group: 4: User
      Compete in challenge: 5: User
      Redeem perk: 5: User
    section Long-term
      Hit weight milestone: 5: User
      AI coach celebrates: 5: AI
      Share success socially: 5: User
      Set new goals: 4: User
      Continue maintaining: 5: User
```

---

## Summary

These diagrams provide a comprehensive visual understanding of your platform's:

1. **Architecture** - How all services connect
2. **Authentication** - User onboarding and login flows
3. **Core Features** - Weight, meal, and step tracking
4. **Medical System** - Family collaboration and healthcare management
5. **Shopping/Inventory** - End-to-end food management
6. **Recipes/Cooking** - Interactive cooking experience
7. **AI Governance** - Human review of AI decisions
8. **Family Features** - Multi-user collaboration
9. **Performance** - Optimization strategies
10. **Subscription** - Feature gating and monetization

---

## How to Use These Diagrams

### View in VS Code
1. Install "Markdown Preview Mermaid Support" extension
2. Open this file
3. Click "Open Preview" (Ctrl+Shift+V)

### Export as Images
1. Use https://mermaid.live
2. Copy/paste diagram code
3. Export as PNG/SVG
4. Import into Figma

### Generate from Code
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i SYSTEM_DIAGRAMS.md -o diagrams/
```

---

*These diagrams can be embedded in documentation, presentations, or design tools*
