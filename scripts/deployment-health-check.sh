#!/bin/bash

BASE_URL="${1:-http://localhost:3000}"
TIMEOUT=30

echo "🏥 Deployment Health Check"
echo "=========================="
echo "Target: $BASE_URL"
echo ""

# Function to check endpoint
check_endpoint() {
  local endpoint=$1
  local expected_status=$2
  local description=$3

  echo -n "Checking $description... "

  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL$endpoint" 2>/dev/null || echo "000")

  if [ "$response" = "$expected_status" ]; then
    echo "✅ ($response)"
    return 0
  else
    echo "❌ Expected $expected_status, got $response"
    return 1
  fi
}

# Run checks
CHECKS_PASSED=0
CHECKS_FAILED=0

echo "=== Basic Health Checks ==="
echo ""

# Homepage
check_endpoint "/" "200" "Homepage" && ((CHECKS_PASSED++)) || ((CHECKS_FAILED++))

# Login page
check_endpoint "/login" "200" "Login page" && ((CHECKS_PASSED++)) || ((CHECKS_FAILED++))

# API health endpoint
check_endpoint "/api/health" "200" "Health endpoint" && ((CHECKS_PASSED++)) || ((CHECKS_FAILED++))

echo ""
echo "=== Security Checks ==="
echo ""

# Debug endpoint should be blocked
check_endpoint "/api/debug-profile" "401" "Debug endpoint blocked" && ((CHECKS_PASSED++)) || ((CHECKS_FAILED++))

# Check security headers
echo -n "Checking security headers... "
headers=$(curl -I -s "$BASE_URL" 2>/dev/null | grep -E "(X-Frame-Options|X-Content-Type-Options|Content-Security-Policy)")
if [ -n "$headers" ]; then
  echo "✅"
  ((CHECKS_PASSED++))
else
  echo "❌"
  ((CHECKS_FAILED++))
fi

echo ""
echo "=== Performance Checks ==="
echo ""

# Check response time
echo -n "Checking response time... "
response_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time $TIMEOUT "$BASE_URL" 2>/dev/null || echo "999")
echo "$response_time seconds"
if (( $(echo "$response_time < 3.0" | bc -l) )); then
  echo "   ✅ Response time acceptable"
  ((CHECKS_PASSED++))
else
  echo "   ⚠️  Response time slow"
  ((CHECKS_FAILED++))
fi

# Check SSL (if HTTPS)
if [[ "$BASE_URL" == https://* ]]; then
  echo ""
  echo "=== SSL Checks ==="
  echo ""

  echo -n "Checking SSL certificate... "
  if curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo "✅"
    ((CHECKS_PASSED++))
  else
    echo "❌"
    ((CHECKS_FAILED++))
  fi
fi

echo ""
echo "========================================="
echo "Results: $CHECKS_PASSED passed, $CHECKS_FAILED failed"
echo "========================================="

if [ $CHECKS_FAILED -gt 0 ]; then
  echo ""
  echo "⚠️  Health check failed. Please investigate."
  exit 1
else
  echo ""
  echo "✅ All health checks passed!"
  exit 0
fi
