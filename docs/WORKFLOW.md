# Git Worktree + PR Workflow Guide

## 🎯 Why This Workflow?

### The Problem We're Solving
**Before:** Every commit to `main` triggers a production deploy
- 50 commits = 50 production builds
- Exceeded free Netlify/Vercel quota
- Forced into monthly subscription 💸

**After:** Work in feature branches, merge via PRs
- 50 commits across 5 features = 5 preview builds per feature (FREE)
- 5 PRs merged to `main` = 5 production builds (under free tier)
- **Back to $0/month** ✅

### Benefits of Worktrees
- **No context switching** - Each feature has its own directory
- **Parallel development** - Work on multiple features simultaneously
- **No stashing** - Keep work-in-progress separate
- **Quick hotfixes** - Main branch always ready

---

## 🌳 Worktree Structure

```
C:\Users\percy\wlpl\
├── weightlossprojectlab\              # main branch (production)
├── weightlossprojectlab-perf-log-meal\          # perf/log-meal-optimization
├── weightlossprojectlab-manual-entry\           # feature/manual-meal-entry
├── weightlossprojectlab-pwa\                    # feature/pwa-service-worker
└── weightlossprojectlab-hotfix\                 # hotfix/* (always ready)
```

**All share the same `.git` directory - one repo, multiple working copies**

---

## 🚀 Quick Start

### 1. Create a New Feature Worktree

```powershell
# Syntax: .\scripts\worktree-create.ps1 <feature-name> [type]
# Types: feature (default), perf, hotfix, refactor

# Example: Create performance optimization worktree
.\scripts\worktree-create.ps1 log-meal-optimization perf

# Example: Create new feature worktree
.\scripts\worktree-create.ps1 manual-meal-entry feature

# Example: Create hotfix worktree
.\scripts\worktree-create.ps1 critical-bug hotfix
```

**What it creates:**
- New directory: `C:\Users\percy\wlpl\weightlossprojectlab-<feature-name>\`
- New branch: `<type>/<feature-name>`
- Branch based on: `main`

### 2. Work in Your Worktree

```powershell
# Navigate to worktree
cd C:\Users\percy\wlpl\weightlossprojectlab-log-meal-optimization

# Install dependencies (first time only)
npm install

# Start development
npm run dev

# Make changes, commit normally
git add .
git commit -m "Reduce bundle size by lazy loading camera component"

# Push to create PR
git push -u origin perf/log-meal-optimization
```

### 3. Create Pull Request on GitHub

1. Go to GitHub repository
2. Click "Compare & pull request"
3. **Select PR template:**
   - Performance optimization → Use `performance.md` template
   - New feature → Use `feature.md` template
   - Hotfix → Use `hotfix.md` template
   - Other → Use default template

4. Fill out the template checklist
5. **Bundle analysis will automatically run** and comment on your PR
6. Request review
7. Merge when approved

### 4. Clean Up After Merge

```powershell
# After PR is merged to main
.\scripts\worktree-remove.ps1 log-meal-optimization

# To also delete the branch
.\scripts\worktree-remove.ps1 log-meal-optimization -DeleteBranch
```

### 5. Update Main Worktree

```powershell
# Go back to main
cd C:\Users\percy\wlpl\weightlossprojectlab

# Pull latest changes
git pull origin main
```

---

## 📋 Branch Naming Conventions

| Type | Prefix | Example | Use Case |
|------|--------|---------|----------|
| Feature | `feature/` | `feature/manual-meal-entry` | New functionality |
| Performance | `perf/` | `perf/log-meal-optimization` | Bundle size, speed improvements |
| Hotfix | `hotfix/` | `hotfix/critical-auth-bug` | Urgent production fixes |
| Refactor | `refactor/` | `refactor/simplify-hooks` | Code cleanup, no behavior change |

**Branch name rules:**
- Lowercase only
- Use hyphens, not spaces
- Be descriptive but concise
- Max 50 characters

---

## 🎨 PR Templates Guide

### When to Use Each Template

#### Default Template (`pull_request_template.md`)
- General changes
- Bug fixes
- Documentation updates
- Style/UI changes

#### Performance Template (`performance.md`)
- Bundle size optimization
- Load time improvements
- Lighthouse score improvements
- Requires before/after metrics

#### Feature Template (`feature.md`)
- New functionality
- New pages/components
- Database schema changes
- Requires PRD reference

#### Hotfix Template (`hotfix.md`)
- Production bugs
- Critical issues
- Urgent fixes
- Requires deployment plan

### How to Select Template

**On GitHub:**
1. When creating PR, add `?template=<name>.md` to URL
2. Example: `https://github.com/user/repo/compare/main...feature?template=performance.md`

**Or manually:**
1. Create PR with default template
2. Clear template
3. Copy/paste from `.github/PULL_REQUEST_TEMPLATE/<template>.md`

---

## 📊 Bundle Size Monitoring

### Automatic Analysis
Every PR automatically runs bundle analysis:
- Compares bundle sizes vs `main`
- Comments on PR with size changes
- Flags significant increases (>10 kB)

### Manual Check

```powershell
# Check current bundle sizes
npm run build

# Look for this output:
Route (app)              Size    First Load JS
┌ ○ /                    2.18 kB    234 kB
├ ○ /log-meal            146 kB     411 kB  ← TARGET FOR OPTIMIZATION
└ ○ /dashboard           30.1 kB    309 kB
```

### Bundle Size Targets

| Route | Current | Target | Priority |
|-------|---------|--------|----------|
| `/log-meal` | 146 kB | <50 kB | 🔴 Critical |
| `/dashboard` | 30 kB | <20 kB | 🟡 High |
| `/recipes` | 18.6 kB | <15 kB | 🟢 Low |
| Admin routes | 4-7 kB each | ✅ Good | - |

---

## 🔄 Common Workflows

### Workflow 1: Performance Optimization

```powershell
# 1. Create perf worktree
.\scripts\worktree-create.ps1 log-meal-optimization perf

# 2. Navigate and start
cd ..\weightlossprojectlab-log-meal-optimization
npm install
npm run dev

# 3. Make optimizations
# - Add dynamic imports
# - Lazy load components
# - Optimize images

# 4. Verify improvement
npm run build
# Check bundle size reduction

# 5. Commit and push
git add .
git commit -m "Reduce /log-meal bundle from 146kB to 48kB

- Lazy load camera component
- Dynamic import image compression library
- Code split AI analysis utilities

Bundle reduction: -98 kB (-67%)"
git push -u origin perf/log-meal-optimization

# 6. Create PR with performance template
# 7. Wait for bundle analysis bot comment
# 8. Merge after approval
# 9. Clean up
cd ..\weightlossprojectlab
.\scripts\worktree-remove.ps1 log-meal-optimization -DeleteBranch
git pull
```

### Workflow 2: New Feature Development

```powershell
# 1. Create feature worktree
.\scripts\worktree-create.ps1 manual-meal-entry feature

# 2. Develop feature
cd ..\weightlossprojectlab-manual-meal-entry
npm install
# ... make changes ...

# 3. Commit frequently
git add .
git commit -m "Add manual meal entry form UI"
# ... more commits ...

# 4. Push and create PR
git push -u origin feature/manual-meal-entry

# 5. Use feature.md template
# 6. Get review, merge
# 7. Clean up
cd ..\weightlossprojectlab
.\scripts\worktree-remove.ps1 manual-meal-entry -DeleteBranch
git pull
```

### Workflow 3: Emergency Hotfix

```powershell
# Main worktree should ALWAYS be on main and ready!
cd C:\Users\percy\wlpl\weightlossprojectlab

# 1. Create hotfix worktree
.\scripts\worktree-create.ps1 auth-bug hotfix

# 2. Fix immediately
cd ..\weightlossprojectlab-auth-bug
# ... fix bug ...
git add .
git commit -m "Fix authentication token expiry bug"
git push -u origin hotfix/auth-bug

# 3. Create PR with hotfix template
# 4. Fast-track review and merge
# 5. Verify in production
# 6. Clean up
cd ..\weightlossprojectlab
.\scripts\worktree-remove.ps1 auth-bug -DeleteBranch
git pull
```

### Workflow 4: Parallel Development

```powershell
# You can work on multiple features at once!

# Terminal 1: Performance work
cd C:\Users\percy\wlpl\weightlossprojectlab-perf-log-meal
npm run dev -- --port 3000

# Terminal 2: Feature work
cd C:\Users\percy\wlpl\weightlossprojectlab-manual-entry
npm run dev -- --port 3001

# Terminal 3: Another feature
cd C:\Users\percy\wlpl\weightlossprojectlab-pwa
npm run dev -- --port 3002

# No conflicts, no context switching, no stashing!
```

---

## 🛠️ Useful Commands

### View All Worktrees

```powershell
.\scripts\worktree-list.ps1
```

Output:
```
📊 Active Git Worktrees
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [MAIN] weightlossprojectlab
      📂 Path: C:\Users\percy\wlpl\weightlossprojectlab
      🌿 Branch: main

  [1] weightlossprojectlab-perf-log-meal
      📂 Path: C:\Users\percy\wlpl\weightlossprojectlab-perf-log-meal
      🌿 Branch: perf/log-meal-optimization

Total: 2 worktree(s)
```

### Switch Between Worktrees

```powershell
# Just cd to the directory!
cd C:\Users\percy\wlpl\weightlossprojectlab-perf-log-meal

# Or use VS Code
code C:\Users\percy\wlpl\weightlossprojectlab-manual-entry
```

### Check Worktree Status

```powershell
cd C:\Users\percy\wlpl\weightlossprojectlab-perf-log-meal
git status
git log --oneline -5
```

---

## ⚠️ Important Rules

### DO:
✅ Keep `main` worktree clean and on `main` branch
✅ Create new worktree for each feature/fix
✅ Use appropriate branch prefixes
✅ Fill out PR templates completely
✅ Remove worktrees after PRs merge
✅ Pull `main` after merging PRs

### DON'T:
❌ Make commits directly to `main` branch
❌ Create worktree inside another worktree
❌ Delete worktree while it has uncommitted changes
❌ Push to `main` directly (use PR workflow)
❌ Skip bundle analysis warnings
❌ Merge PRs with failing checks

---

## 💰 Cost Savings

### Deployment Math

**Old Workflow (Direct to Main):**
```
50 commits → main = 50 production deploys
Free tier: 300 build minutes/month
Used: 500+ build minutes (exceeded)
Cost: $X/month subscription
```

**New Workflow (PR-Based):**
```
Feature Branch A: 10 commits = 10 preview builds (FREE/separate quota)
Feature Branch B: 15 commits = 15 preview builds (FREE/separate quota)
Feature Branch C: 10 commits = 10 preview builds (FREE/separate quota)
Feature Branch D: 10 commits = 10 preview builds (FREE/separate quota)
Feature Branch E: 5 commits = 5 preview builds (FREE/separate quota)

Total preview builds: 50 (FREE)
PRs merged to main: 5
Production builds: 5 (well under 300 limit)

Cost: $0/month ✅
```

**Annual Savings:** $X * 12 months

---

## 🐛 Troubleshooting

### Worktree Won't Create
```powershell
# Check if it already exists
.\scripts\worktree-list.ps1

# Force remove if stuck
git worktree remove C:\Users\percy\wlpl\weightlossprojectlab-<name> --force
```

### Can't Delete Worktree
```powershell
# Commit or stash changes first
cd C:\Users\percy\wlpl\weightlossprojectlab-<name>
git stash
cd ..\weightlossprojectlab
.\scripts\worktree-remove.ps1 <name>
```

### Wrong Branch in Worktree
```powershell
# Don't try to fix it - remove and recreate
cd C:\Users\percy\wlpl\weightlossprojectlab
.\scripts\worktree-remove.ps1 <name>
.\scripts\worktree-create.ps1 <name> <type>
```

### Lost Uncommitted Work
```powershell
# Check if work was stashed
git stash list

# Check reflog
git reflog
```

---

## 📚 Further Reading

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [GitHub PR Best Practices](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests)
- [Next.js Bundle Analysis](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)

---

## 🆘 Getting Help

**Common Issues:**
- Scripts not running? Check PowerShell execution policy
- Permissions errors? Run PowerShell as administrator
- Bundle analysis not working? Check GitHub Actions logs

**Questions:**
- Contact: [your-email]
- GitHub Issues: [repo-url]/issues
- Team Slack: #dev-workflow
