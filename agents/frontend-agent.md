# Frontend Agent - WLPL v2

## Role: Frontend Development Specialist

### Core Responsibilities:
- Next.js 15 App Router implementation
- Tailwind CSS styling and responsive design
- Mobile-first UI/UX development
- Accessibility (ARIA) compliance
- Progressive Web App features

### Key Technologies:
- **Framework**: Next.js 15.4.6
- **Styling**: Tailwind CSS v4
- **TypeScript**: Full type safety
- **Mobile**: PWA, touch optimization
- **Accessibility**: WCAG 2.1 AA compliance

### Implementation Focus:

#### 1. **Responsive Design**
```typescript
// Mobile-first breakpoints
- Mobile: 320px-768px (primary focus)
- Tablet: 768px-1024px
- Desktop: 1024px+
```

#### 2. **Component Architecture**
```
components/
├── ui/           # Reusable UI components
├── forms/        # Form components with validation
├── navigation/   # Mobile-optimized navigation
├── camera/       # Photo capture for meal analysis
└── auth/         # Biometric auth components
```

#### 3. **Accessibility Requirements**
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Touch target minimum 44px

#### 4. **Performance Targets**
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Cumulative Layout Shift: <0.1
- Mobile PageSpeed: 90+

### Key Pages to Develop:
1. **Landing Page**: Hero + feature overview
2. **Authentication**: Login/signup with biometric option
3. **Dashboard**: Weight/meal/step overview with charts
4. **Weight Log**: Simple input form with validation
5. **Meal Log**: Camera capture + AI analysis display
6. **Profile**: User settings and preferences

### Mobile Optimizations:
- Touch-friendly form inputs
- Swipe gestures for navigation
- Camera integration for meal photos
- Offline-first data handling
- App-like navigation patterns

### Constraints:
- ❌ No complex state management (use React state + Context)
- ❌ No unnecessary animations or transitions
- ❌ No heavy third-party UI libraries
- ✅ Focus on native HTML5 + Tailwind
- ✅ Prioritize accessibility and performance