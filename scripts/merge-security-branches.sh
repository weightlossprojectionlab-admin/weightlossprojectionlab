#!/bin/bash

###############################################################################
# Security Branch Merge Script
#
# Purpose: Systematically merge 20 security branches into main
# Created: 2025-12-01
# Author: Production Deployment Agent 1
#
# IMPORTANT: This script performs actual git merges. Review carefully before running.
# USAGE: bash scripts/merge-security-branches.sh [--dry-run]
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
BACKUP_BRANCH=""
MERGE_LOG="merge-execution.log"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$MERGE_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$MERGE_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$MERGE_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$MERGE_LOG"
}

confirm_action() {
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would perform: $1"
        return 0
    fi

    echo -e "${YELLOW}About to: $1${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Operation cancelled by user"
        exit 1
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if git is installed
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi

    # Check if in git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi

    # Check if on main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        log_error "Not on main branch (currently on: $CURRENT_BRANCH)"
        exit 1
    fi

    # Check if working directory is clean
    if [ -n "$(git status --porcelain)" ]; then
        log_error "Working directory is not clean. Commit or stash changes first."
        git status --short
        exit 1
    fi

    # Check if main is up to date
    log_info "Fetching latest from origin..."
    git fetch origin main

    LOCAL=$(git rev-parse main)
    REMOTE=$(git rev-parse origin/main)

    if [ "$LOCAL" != "$REMOTE" ]; then
        log_warning "Local main is not in sync with origin/main"
        confirm_action "Pull latest changes from origin/main"
        git pull origin main
    fi

    log_success "Prerequisites check passed"
}

create_backup() {
    BACKUP_BRANCH="main-backup-$(date +%Y%m%d-%H%M%S)"
    log_info "Creating backup branch: $BACKUP_BRANCH"

    if [ "$DRY_RUN" = false ]; then
        git branch "$BACKUP_BRANCH"
        git push origin "$BACKUP_BRANCH"
        log_success "Backup created: $BACKUP_BRANCH"
    else
        log_info "[DRY RUN] Would create backup: $BACKUP_BRANCH"
    fi
}

merge_branch() {
    local BRANCH=$1
    local DESCRIPTION=$2
    local PHASE=$3

    echo ""
    log_info "=========================================="
    log_info "Phase $PHASE: Merging $BRANCH"
    log_info "Description: $DESCRIPTION"
    log_info "=========================================="

    # Check if branch exists
    if ! git rev-parse --verify "$BRANCH" > /dev/null 2>&1; then
        log_warning "Branch $BRANCH does not exist. Skipping."
        return 0
    fi

    # Check if branch has unique commits
    COMMITS_AHEAD=$(git log --oneline main.."$BRANCH" | wc -l)
    if [ "$COMMITS_AHEAD" -eq 0 ]; then
        log_warning "Branch $BRANCH has no unique commits. Skipping."
        return 0
    fi

    log_info "Branch has $COMMITS_AHEAD commit(s) ahead of main"

    # Confirm merge
    confirm_action "Merge branch $BRANCH into main"

    if [ "$DRY_RUN" = false ]; then
        # Attempt merge
        log_info "Executing merge..."

        if git merge --no-ff "$BRANCH" -m "SECURITY: Merge $BRANCH

$DESCRIPTION

Phase: $PHASE

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"; then
            log_success "Merge successful"
        else
            log_error "Merge conflicts detected"
            log_error "Resolve conflicts manually, then run:"
            log_error "  git add <resolved-files>"
            log_error "  git commit"
            log_error "Then re-run this script to continue"
            exit 1
        fi
    else
        log_info "[DRY RUN] Would merge: git merge --no-ff $BRANCH"
    fi
}

validate_merge() {
    local PHASE=$1

    log_info "Validating merge for Phase $PHASE..."

    if [ "$DRY_RUN" = false ]; then
        # Check if build succeeds
        log_info "Running build..."
        if npm run build > /dev/null 2>&1; then
            log_success "Build successful"
        else
            log_error "Build failed!"
            log_error "Fix build errors before proceeding"
            exit 1
        fi

        # Check if tests pass
        log_info "Running tests..."
        if npm test > /dev/null 2>&1; then
            log_success "Tests passed"
        else
            log_warning "Tests failed. Review test output."
            confirm_action "Continue despite test failures"
        fi

        # Check if lint passes
        log_info "Running linter..."
        if npm run lint > /dev/null 2>&1; then
            log_success "Lint passed"
        else
            log_warning "Lint issues detected. Review output."
            confirm_action "Continue despite lint issues"
        fi
    else
        log_info "[DRY RUN] Would validate: npm run build && npm test && npm run lint"
    fi
}

###############################################################################
# Main Merge Execution
###############################################################################

main() {
    log_info "Security Branch Merge Script - Starting"
    log_info "Dry Run: $DRY_RUN"
    log_info "Log File: $MERGE_LOG"
    echo ""

    # Parse arguments
    for arg in "$@"; do
        case $arg in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--dry-run] [--help]"
                echo ""
                echo "Options:"
                echo "  --dry-run    Simulate merge without making changes"
                echo "  --help       Show this help message"
                exit 0
                ;;
        esac
    done

    # Prerequisites
    check_prerequisites

    # Create backup
    create_backup

    ###########################################################################
    # PHASE 1: Infrastructure & Documentation (No Conflicts Expected)
    ###########################################################################

    log_info "===== PHASE 1: Infrastructure & Documentation ====="

    merge_branch "sec-002-super-admin-env" \
                 "SEC-002: Move super admin emails to environment variables" \
                 "1"

    merge_branch "sec-009-security-headers" \
                 "SEC-009: Add security headers (CSP, XFO, XCTO, Referrer-Policy)" \
                 "1"

    merge_branch "production-deployment-runbook" \
                 "DEPLOY: Production deployment runbook and procedures" \
                 "1"

    merge_branch "production-migration-plan" \
                 "DEPLOY: Production migration execution plan" \
                 "1"

    validate_merge "1"
    log_success "Phase 1 complete"

    ###########################################################################
    # PHASE 2: Core Security Libraries (Low Conflicts)
    ###########################################################################

    echo ""
    log_info "===== PHASE 2: Core Security Libraries ====="

    merge_branch "sec-001-ssrf-fix" \
                 "SEC-001: SSRF protection with URL validation and private IP blocking" \
                 "2"

    merge_branch "sec-007-recipe-rules" \
                 "SEC-007: Recipe access control with authentication and pagination" \
                 "2"

    validate_merge "2"
    log_success "Phase 2 complete"

    ###########################################################################
    # PHASE 3: Error Handling - BASE LAYER (High Conflicts Expected)
    ###########################################################################

    echo ""
    log_info "===== PHASE 3: Error Handling (Base Layer) ====="
    log_warning "HIGH CONFLICT EXPECTED: ~128 files will conflict"
    log_warning "Manual conflict resolution will be required"
    echo ""

    confirm_action "Proceed with Phase 3 (Error Handling merge)"

    merge_branch "sec-008-complete-error-sanitization" \
                 "SEC-008: Complete error sanitization with centralized error response handler" \
                 "3"

    log_warning "===== CRITICAL VALIDATION POINT ====="
    log_warning "Verify all catch blocks use errorResponse()"
    log_warning "Check: grep -r 'details: error' app/api/ should return 0 results"
    echo ""

    validate_merge "3"

    if [ "$DRY_RUN" = false ]; then
        # Additional validation for SEC-008
        log_info "Checking for old error patterns..."
        if grep -r "details: error" app/api/ --include="*.ts" > /dev/null 2>&1; then
            log_error "Found old error pattern 'details: error' in code"
            log_error "SEC-008 migration incomplete. Fix before proceeding."
            exit 1
        fi
        log_success "No old error patterns found"
    fi

    log_success "Phase 3 complete"

    ###########################################################################
    # PHASE 4: Rate Limiting - MIDDLE LAYER (High Conflicts Expected)
    ###########################################################################

    echo ""
    log_info "===== PHASE 4: Rate Limiting (Middle Layer) ====="
    log_warning "HIGH CONFLICT EXPECTED: ~128 files will conflict with Phase 3"
    log_warning "Conflicts will be in API routes where both error handling and rate limiting apply"
    echo ""

    confirm_action "Proceed with Phase 4 (Rate Limiting merge)"

    merge_branch "sec-006-complete-rate-limiting" \
                 "SEC-006: Distributed rate limiting with Upstash Redis and graceful fallback" \
                 "4"

    log_warning "===== CRITICAL VALIDATION POINT ====="
    log_warning "Verify rate limiting calls are BEFORE expensive operations"
    log_warning "Test: Make 11 requests to /api/fetch-url and verify 429 response"
    echo ""

    validate_merge "4"
    log_success "Phase 4 complete"

    ###########################################################################
    # PHASE 5: CSRF Protection - TOP LAYER (High Conflicts Expected)
    ###########################################################################

    echo ""
    log_info "===== PHASE 5: CSRF Protection (Top Layer) ====="
    log_warning "HIGH CONFLICT EXPECTED: ~128 files + middleware.ts conflict"
    log_warning "Middleware.ts conflict requires manual merge of SEC-003 and SEC-005 versions"
    echo ""

    confirm_action "Proceed with Phase 5 (CSRF Protection merge)"

    merge_branch "sec-005-complete-csrf-middleware" \
                 "SEC-005: Complete CSRF protection with server-side middleware validation" \
                 "5"

    log_warning "===== CRITICAL VALIDATION POINT ====="
    log_warning "Verify CSRF middleware includes both security AND family logic (if sec-003 merged)"
    log_warning "Test: POST request without CSRF token should return 403"
    echo ""

    validate_merge "5"
    log_success "Phase 5 complete"

    ###########################################################################
    # PHASE 6: Testing & Validation (Low Conflicts)
    ###########################################################################

    echo ""
    log_info "===== PHASE 6: Testing & Validation ====="

    merge_branch "sec-sprint3-regression-tests" \
                 "SEC-SPRINT3: Comprehensive security regression test suite" \
                 "6"

    merge_branch "sec-sprint3-migration-validation" \
                 "SEC-SPRINT3: Migration validation and rollback procedures" \
                 "6"

    validate_merge "6"
    log_success "Phase 6 complete"

    ###########################################################################
    # Final Validation
    ###########################################################################

    echo ""
    log_info "===== FINAL VALIDATION ====="

    if [ "$DRY_RUN" = false ]; then
        log_info "Running complete test suite..."
        npm test

        log_info "Running security tests..."
        if [ -f "__tests__/security/regression.test.ts" ]; then
            npm test -- __tests__/security/regression.test.ts
        fi

        log_success "All tests passed!"
    fi

    ###########################################################################
    # Summary
    ###########################################################################

    echo ""
    log_success "=========================================="
    log_success "MERGE COMPLETE!"
    log_success "=========================================="
    echo ""
    log_info "Summary:"
    log_info "  Backup Branch: $BACKUP_BRANCH"
    log_info "  Merged Branches: 11 branches across 6 phases"
    log_info "  Skipped Branches: 9 branches (superseded/duplicate/empty)"
    echo ""
    log_info "Next Steps:"
    log_info "  1. Review merge log: $MERGE_LOG"
    log_info "  2. Run manual security tests (SSRF, rate limit, CSRF)"
    log_info "  3. Deploy to staging environment"
    log_info "  4. Run full regression test suite"
    log_info "  5. Deploy to production after staging validation"
    echo ""
    log_info "Rollback Instructions (if needed):"
    log_info "  git reset --hard $BACKUP_BRANCH"
    log_info "  git push origin main --force  # ⚠️ Coordinate with team first"
    echo ""
    log_success "Merge script execution complete"
}

###############################################################################
# Script Entry Point
###############################################################################

# Trap errors
trap 'log_error "Script failed at line $LINENO"' ERR

# Run main function
main "$@"
