#!/bin/bash
set -e

PRODUCTION_URL="${1:-https://your-app.com}"

echo "✅ Production Validation Suite"
echo "=============================="
echo "Target: $PRODUCTION_URL"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() { echo "✅ $1"; ((PASSED++)); }
fail() { echo "❌ $1"; ((FAILED++)); }
warn() { echo "⚠️  $1"; ((WARNINGS++)); }

echo "1️⃣  Application Availability"
echo "============================"
if curl -f -s "$PRODUCTION_URL" > /dev/null; then
  pass "Application is accessible"
else
  fail "Application is not accessible"
fi

echo ""
echo "2️⃣  Security Headers Validation"
echo "================================"

headers=$(curl -I -s "$PRODUCTION_URL")

# Check for required security headers
if echo "$headers" | grep -q "X-Frame-Options"; then
  pass "X-Frame-Options header present"
else
  fail "X-Frame-Options header missing"
fi

if echo "$headers" | grep -q "X-Content-Type-Options"; then
  pass "X-Content-Type-Options header present"
else
  fail "X-Content-Type-Options header missing"
fi

if echo "$headers" | grep -q "Content-Security-Policy"; then
  pass "Content-Security-Policy header present"
else
  fail "Content-Security-Policy header missing"
fi

if echo "$headers" | grep -q "Strict-Transport-Security"; then
  pass "HSTS header present"
else
  warn "HSTS header missing (recommended for HTTPS)"
fi

echo ""
echo "3️⃣  Debug Endpoints Protection"
echo "=============================="

debug_response=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/api/debug-profile")
if [ "$debug_response" = "403" ]; then
  pass "Debug endpoints blocked (403)"
else
  fail "Debug endpoints not blocked (got $debug_response)"
fi

echo ""
echo "4️⃣  CSRF Protection"
echo "==================="

# Test POST without CSRF token
csrf_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PRODUCTION_URL/api/meals")
if [ "$csrf_response" = "403" ]; then
  pass "CSRF protection active (403)"
else
  fail "CSRF protection not active (got $csrf_response)"
fi

echo ""
echo "5️⃣  Rate Limiting"
echo "================="

# Check for rate limit headers
rate_headers=$(curl -I -s "$PRODUCTION_URL/api/fetch-url" | grep -i "x-ratelimit")
if [ -n "$rate_headers" ]; then
  pass "Rate limiting headers present"
else
  warn "Rate limiting headers not detected"
fi

echo ""
echo "6️⃣  Authentication"
echo "==================="

# Test authenticated endpoint without auth (should return 401)
auth_response=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/api/patients")
if [ "$auth_response" = "401" ] || [ "$auth_response" = "403" ]; then
  pass "Authentication required (${auth_response})"
else
  fail "Authentication not enforced (got $auth_response)"
fi

echo ""
echo "7️⃣  Firebase Integration"
echo "========================"

# Would need actual Firebase API calls
echo "⚠️  Manual verification required:"
echo "   - Check Firestore connectivity"
echo "   - Check Storage connectivity"
echo "   - Verify security rules deployed"

echo ""
echo "8️⃣  Error Handling"
echo "=================="

# Trigger error to check sanitization (would need specific endpoint)
echo "⚠️  Manual verification required:"
echo "   - Trigger error in production"
echo "   - Verify no stack traces exposed"
echo "   - Check error logs contain details"

echo ""
echo "📊 Results"
echo "=========="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Warnings: $WARNINGS"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "❌ Validation FAILED"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo "⚠️  Validation passed with warnings"
  exit 0
else
  echo "✅ Validation PASSED"
  exit 0
fi
