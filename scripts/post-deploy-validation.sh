#!/bin/bash

BASE_URL="${1}"
TIMEOUT=30

if [ -z "$BASE_URL" ]; then
  echo "Usage: $0 <production-url>"
  echo "Example: $0 https://your-app.com"
  exit 1
fi

echo "✅ Post-Deployment Validation"
echo "============================="
echo "Target URL: $BASE_URL"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

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

# Function to check response time
check_response_time() {
  local endpoint=$1
  local max_time=$2
  local description=$3

  echo -n "Checking $description response time... "

  response_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time $TIMEOUT "$BASE_URL$endpoint" 2>/dev/null || echo "999")

  # Compare as floating point
  if (( $(echo "$response_time < $max_time" | bc -l) )); then
    echo "✅ (${response_time}s)"
    return 0
  else
    echo "⚠️  Slow response (${response_time}s, expected < ${max_time}s)"
    return 1
  fi
}

echo "=== Critical Endpoints ==="
echo ""

# Homepage
check_endpoint "/" "200" "Homepage" && ((CHECKS_PASSED++)) || ((CHECKS_FAILED++))

# Login page
check_endpoint "/login" "200" "Login page" && ((CHECKS_PASSED++)) || ((CHECKS_FAILED++))

# Health endpoint (if available)
check_endpoint "/api/health" "200" "Health API" && ((CHECKS_PASSED++)) || ((CHECKS_FAILED++))

echo ""
echo "=== Security Checks ==="
echo ""

# Check security headers
echo -n "Checking security headers... "
headers=$(curl -I -s "$BASE_URL" 2>/dev/null | grep -E "(X-Frame-Options|X-Content-Type-Options|Content-Security-Policy)" | wc -l)
if [ "$headers" -ge 2 ]; then
  echo "✅ ($headers security headers found)"
  ((CHECKS_PASSED++))
else
  echo "⚠️  Only $headers security headers found"
  ((CHECKS_FAILED++))
fi

# Check HTTPS redirect (if using HTTP)
if [[ "$BASE_URL" == http://* ]]; then
  echo -n "Checking HTTPS redirect... "
  redirect=$(curl -s -o /dev/null -w "%{redirect_url}" "$BASE_URL")
  if [[ "$redirect" == https://* ]]; then
    echo "✅ Redirects to HTTPS"
    ((CHECKS_PASSED++))
  else
    echo "⚠️  Does not redirect to HTTPS"
    ((CHECKS_FAILED++))
  fi
fi

# Check for debug endpoints (should be blocked)
check_endpoint "/api/debug-profile" "401" "Debug endpoint blocked" && ((CHECKS_PASSED++)) || ((CHECKS_FAILED++))

echo ""
echo "=== Performance Checks ==="
echo ""

# Check response times
check_response_time "/" 3.0 "Homepage" && ((CHECKS_PASSED++)) || ((CHECKS_FAILED++))

# Check static assets
echo -n "Checking static assets... "
if curl -s --head "$BASE_URL/_next/static/" | grep "200" > /dev/null; then
  echo "✅ Static assets accessible"
  ((CHECKS_PASSED++))
else
  echo "⚠️  Static assets may not be accessible"
  ((CHECKS_FAILED++))
fi

echo ""
echo "=== Firebase Services ==="
echo ""

# Note: These checks would require authentication, so we just verify endpoints respond
echo -n "Checking Firebase Auth integration... "
auth_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/session" 2>/dev/null || echo "000")
if [ "$auth_response" = "200" ] || [ "$auth_response" = "401" ]; then
  echo "✅ Auth endpoint responding ($auth_response)"
  ((CHECKS_PASSED++))
else
  echo "⚠️  Auth endpoint issue ($auth_response)"
  ((CHECKS_FAILED++))
fi

echo ""
echo "=== SSL/TLS Checks ==="
echo ""

if [[ "$BASE_URL" == https://* ]]; then
  echo -n "Checking SSL certificate... "
  if curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo "✅ SSL certificate valid"
    ((CHECKS_PASSED++))
  else
    echo "❌ SSL certificate issue"
    ((CHECKS_FAILED++))
  fi

  # Check SSL expiry (if openssl is available)
  if command -v openssl &> /dev/null; then
    echo -n "Checking SSL expiry... "
    domain=$(echo "$BASE_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
    expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)
    if [ -n "$expiry" ]; then
      echo "✅ Expires: $expiry"
      ((CHECKS_PASSED++))
    else
      echo "⚠️  Could not check expiry"
    fi
  fi
fi

echo ""
echo "=== Additional Checks ==="
echo ""

# Check robots.txt
echo -n "Checking robots.txt... "
robots_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/robots.txt")
if [ "$robots_status" = "200" ]; then
  echo "✅ robots.txt exists"
  ((CHECKS_PASSED++))
else
  echo "⚠️  robots.txt not found"
fi

# Check sitemap
echo -n "Checking sitemap... "
sitemap_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sitemap.xml")
if [ "$sitemap_status" = "200" ]; then
  echo "✅ sitemap.xml exists"
  ((CHECKS_PASSED++))
else
  echo "⚠️  sitemap.xml not found"
fi

# Check favicon
echo -n "Checking favicon... "
favicon_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/favicon.ico")
if [ "$favicon_status" = "200" ]; then
  echo "✅ favicon.ico exists"
  ((CHECKS_PASSED++))
else
  echo "⚠️  favicon.ico not found"
fi

echo ""
echo "========================================="
echo "Results: $CHECKS_PASSED passed, $CHECKS_FAILED failed"
echo "========================================="

if [ $CHECKS_FAILED -gt 0 ]; then
  echo ""
  echo "⚠️  Some validation checks failed."
  echo "Please review the issues above."
  exit 1
else
  echo ""
  echo "✅ All post-deployment validation checks passed!"
  exit 0
fi
