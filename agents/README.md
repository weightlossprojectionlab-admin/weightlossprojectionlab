# WLPL v2 Agent Team Configuration

## Project: AI-Powered Weight Loss Progress Logger v2

### Agent Team Structure (Simplified Approach)

This project uses a streamlined agent approach focused on core functionality:

**Core Principles:**
- ✅ Simple, focused agents (not complex orchestration)
- ✅ Direct development approach
- ✅ Mobile-first, accessible design
- ✅ AI-powered meal analysis with biometric auth

### Active Agents:

#### Core Development Agents

#### 1. **Frontend Agent** (`frontend-agent.md`)
- **Focus**: Next.js 15 + Tailwind CSS + Mobile UI
- **Responsibilities**:
  - Responsive, accessible components
  - Camera integration for meal photos
  - Biometric authentication UI
  - Progressive Web App features

#### 2. **Backend Agent** (`backend-agent.md`)
- **Focus**: Firebase + API integration
- **Responsibilities**:
  - Simple Firebase setup (no enterprise complexity)
  - OpenAI Vision API integration
  - USDA nutrition database integration
  - WebAuthn biometric authentication

#### 3. **AI Agent** (`ai-agent.md`)
- **Focus**: OpenAI integration + meal analysis
- **Responsibilities**:
  - GPT-4 Vision meal photo analysis
  - Nutrition data processing
  - Health data integration
  - AI-powered recommendations

#### 4. **QA Agent** (`qa-agent.md`)
- **Focus**: Testing + accessibility
- **Responsibilities**:
  - Mobile responsiveness testing
  - Accessibility compliance (ARIA)
  - Cross-browser compatibility
  - Progressive enhancement validation

#### Specialized Camera & Permission Agents

#### 5. **Camera Debug Agent** (`camera-debug-agent.md`)
- **Focus**: Camera diagnostics & troubleshooting
- **Responsibilities**:
  - Diagnose getUserMedia() failures
  - Browser compatibility detection
  - Permission state debugging
  - HTTPS/secure context validation
  - Device enumeration testing

#### 6. **Camera Fix Agent** (`camera-fix-agent.md`)
- **Focus**: Robust camera implementation
- **Responsibilities**:
  - Video stream lifecycle management
  - Comprehensive error handling
  - Retry logic with fallback constraints
  - Photo capture optimization
  - Memory cleanup and leak prevention

#### 7. **Mobile Camera Agent** (`mobile-camera-agent.md`)
- **Focus**: Mobile camera optimization
- **Responsibilities**:
  - iOS Safari camera handling
  - Android Chrome compatibility
  - Front/back camera toggle
  - Touch-optimized controls
  - Safe area insets support

#### 8. **Permission Manager Agent** (`permission-manager-agent.md`)
- **Focus**: Permission UX & state management
- **Responsibilities**:
  - Educational permission dialogs
  - Platform-specific settings instructions
  - Permission state persistence
  - Progressive permission requests
  - Graceful fallback mechanisms

### Key Lessons Applied:
- ❌ No over-engineering or enterprise features
- ❌ No complex multi-tenancy or admin systems
- ❌ No agent orchestration complexity
- ✅ Focus on core weight loss tracking functionality
- ✅ Simple, proven technology stack
- ✅ Incremental development with testing

### Agent Team Workflow:

**When implementing camera functionality:**
1. **Camera Debug Agent** → Diagnose root cause of camera issues
2. **Camera Fix Agent** → Implement robust fixes with error handling
3. **Mobile Camera Agent** → Ensure mobile compatibility (iOS/Android)
4. **Permission Manager Agent** → Enhance permission UX and guidance
5. **QA Agent** → Test across browsers and devices

### Project Status:
**Phase 1**: Foundation setup with agent team configuration ✅
**Phase 2**: Camera & permission specialized agents added ✅
**Current Focus**: Camera functionality debugging and implementation