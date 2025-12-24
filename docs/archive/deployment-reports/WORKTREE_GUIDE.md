# Git Worktree Guide - Weight Loss Project Lab

## Overview
This repository uses Git worktrees for parallel development across multiple features and improvements. Each worktree is a separate working directory pointing to a different branch.

## Active Worktrees

### 📍 Main Repository
**Location:** `C:/Users/percy/wlpl/weightlossprojectlab`
**Branch:** `main`
**Purpose:** Production-ready code, stable branch

### 🚀 Feature Worktrees

#### 1. Native Wrapper (Priority 1)
**Location:** `C:/Users/percy/wlpl/wlpl-native-wrapper`
**Branch:** `feature/native-wrapper`
**Purpose:** React Native/Capacitor integration for full health API access
**Key Deliverables:**
- Apple Health integration
- Google Fit integration
- Native wrapper configuration
- Mobile app deployment setup

#### 2. Social Expansion (Priority 1)
**Location:** `C:/Users/percy/wlpl/wlpl-social-expansion`
**Branch:** `feature/social-expansion`
**Purpose:** Enhanced social features, groups, and challenges
**Key Deliverables:**
- Group challenges system
- Social engagement agent
- Community features
- Leaderboards and competitions

#### 3. Recipe Marketplace (Priority 1)
**Location:** `C:/Users/percy/wlpl/wlpl-recipe-marketplace`
**Branch:** `feature/recipe-marketplace`
**Purpose:** Recipe discovery and sharing platform
**Key Deliverables:**
- Recipe submission workflow
- Recipe moderation tools
- Recipe discovery features
- User ratings and reviews

#### 4. Premium Subscription (Priority 1)
**Location:** `C:/Users/percy/wlpl/wlpl-premium-subscription`
**Branch:** `feature/premium-subscription`
**Purpose:** Subscription tier implementation
**Key Deliverables:**
- Stripe/payment integration
- Subscription management
- Premium feature gates
- Billing and invoicing

### 🧪 Testing Worktree

#### 5. E2E Test Suite (Priority 2)
**Location:** `C:/Users/percy/wlpl/wlpl-e2e-suite`
**Branch:** `test/e2e-suite`
**Purpose:** Comprehensive E2E testing with Playwright
**Key Deliverables:**
- Critical user flow tests
- Authentication flow tests
- Meal logging flow tests
- Recipe workflow tests
- Admin dashboard tests

### ⚡ Performance Worktrees

#### 6. Bundle Optimization (Priority 2)
**Location:** `C:/Users/percy/wlpl/wlpl-bundle-optimization`
**Branch:** `perf/bundle-optimization`
**Purpose:** Further reduce bundle sizes and improve performance
**Key Deliverables:**
- Code splitting improvements
- Dynamic imports optimization
- Tree shaking enhancements
- Image optimization

### 🔧 Refactoring Worktrees

#### 7. React 19 Features (Priority 2)
**Location:** `C:/Users/percy/wlpl/wlpl-react-19-features`
**Branch:** `refactor/react-19-features`
**Purpose:** Migrate to React 19 concurrent features
**Key Deliverables:**
- Server components optimization
- Concurrent rendering
- Suspense improvements
- Performance enhancements

### 📚 Documentation Worktree

#### 8. Repository Cleanup (Priority 3)
**Location:** `C:/Users/percy/wlpl/wlpl-repository-cleanup`
**Branch:** `docs/repository-cleanup`
**Purpose:** Documentation organization and repository maintenance
**Key Deliverables:**
- Update README
- Organize documentation
- API documentation
- Component documentation

### 🧪 Shopping System Worktrees

#### 9. Shopping E2E Tests (Priority 2)
**Location:** `C:/Users/percy/wlpl/wlpl-shopping-tests`
**Branch:** `test/shopping-e2e`
**Purpose:** End-to-end tests for sequential shopping flow
**Key Deliverables:**
- Sequential flow happy path test
- Item not found → replacement flow test
- Multi-recipe linking tests
- Error handling tests
- Performance benchmarks

#### 10. Family Chat Feature (Priority 2)
**Location:** `C:/Users/percy/wlpl/wlpl-family-chat`
**Branch:** `feature/family-chat`
**Purpose:** Real-time family shopping collaboration
**Key Deliverables:**
- Firestore real-time messaging
- Push notifications integration
- Message history UI
- Family member management
- Shopping list sharing

## Workflow

### Working in a Worktree

```bash
# Navigate to worktree
cd C:/Users/percy/wlpl/wlpl-native-wrapper

# Make changes
# ... edit files ...

# Commit changes
git add .
git commit -m "feat: Add native wrapper"

# Push to remote
git push -u origin feature/native-wrapper
```

### Creating a Pull Request

```bash
# From within the worktree
gh pr create --title "feat: Native wrapper integration" --body "Description"
```

### Switching Between Worktrees

```bash
# Simply navigate to different directories
cd C:/Users/percy/wlpl/weightlossprojectlab    # Main
cd C:/Users/percy/wlpl/wlpl-native-wrapper     # Feature work
```

### Syncing with Main

```bash
# From within a worktree
git fetch origin
git merge origin/main

# Or rebase
git rebase origin/main
```

### Listing All Worktrees

```bash
git worktree list
```

### Removing a Worktree (After Merged)

```bash
# From main repository
git worktree remove ../wlpl-native-wrapper

# Delete the branch
git branch -d feature/native-wrapper

# Delete remote branch
git push origin --delete feature/native-wrapper
```

## Best Practices

### 1. Keep Worktrees Updated
Regularly sync with main to avoid conflicts:
```bash
cd C:/Users/percy/wlpl/wlpl-native-wrapper
git fetch origin
git merge origin/main
```

### 2. One Feature Per Worktree
Each worktree should focus on a single feature or improvement.

### 3. Regular Commits
Commit frequently with clear, descriptive messages.

### 4. Push Early and Often
Push your branch to remote regularly to enable collaboration and backups.

### 5. Clean Up After Merge
Remove worktrees and branches after PRs are merged.

### 6. Use Descriptive Branch Names
- `feature/` - New features
- `perf/` - Performance improvements
- `refactor/` - Code refactoring
- `test/` - Testing improvements
- `docs/` - Documentation
- `hotfix/` - Urgent bug fixes

## Development Priority

### Immediate (Start Now)
1. `test/shopping-e2e` - **CRITICAL** - No E2E tests for v2.1.0 shopping features
2. `feature/family-chat` - Complete sequential shopping flow placeholder
3. `feature/native-wrapper` - Critical for mobile health API access
4. `feature/social-expansion` - High user engagement impact

### Short-term (Next Sprint)
5. `feature/recipe-marketplace` - Key differentiator
6. `feature/premium-subscription` - Revenue generation
7. `test/e2e-suite` - Expand general E2E coverage
8. `perf/bundle-optimization` - User experience

### Medium-term (Future Sprints)
9. `refactor/react-19-features` - Technical debt
10. `docs/repository-cleanup` - Maintainability

## Troubleshooting

### Worktree Already Exists
```bash
# Remove and recreate
git worktree remove ../wlpl-native-wrapper
git worktree add ../wlpl-native-wrapper -b feature/native-wrapper
```

### Branch Already Exists
```bash
# Use existing branch
git worktree add ../wlpl-native-wrapper feature/native-wrapper

# Or delete and recreate
git branch -d feature/native-wrapper
git worktree add ../wlpl-native-wrapper -b feature/native-wrapper
```

### Can't Remove Worktree
```bash
# Force remove
git worktree remove --force ../wlpl-native-wrapper
```

## Git Configuration

All worktrees share the same git configuration from the main repository at:
- `C:/Users/percy/wlpl/weightlossprojectlab/.git/`

## Status Tracking

Track your progress across worktrees:

```bash
# Check status of all branches
git branch -a

# View recent commits across all branches
git log --all --oneline --graph -10
```

## VS Code Integration

Open multiple VS Code windows for parallel development:

```bash
code C:/Users/percy/wlpl/weightlossprojectlab
code C:/Users/percy/wlpl/wlpl-native-wrapper
code C:/Users/percy/wlpl/wlpl-social-expansion
```

## Resources

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Playwright Testing](https://playwright.dev/)

---

**Last Updated:** 2025-11-03
**Total Worktrees:** 11 (1 main + 10 feature/improvement/test)
**Active Development Branches:** 10
**Recent Additions:** Shopping E2E Tests, Family Chat Feature

### Shopping System v2.1.0 Complete! 🎉
- ✅ Multi-recipe ingredient linking
- ✅ Sequential shopping flow
- ✅ 75% state complexity reduction
- ⚠️ **Priority:** Add E2E tests before next feature
