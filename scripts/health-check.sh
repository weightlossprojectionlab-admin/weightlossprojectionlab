#!/bin/bash

# Quick health check script for production
# Usage: ./health-check.sh [URL]

PRODUCTION_URL="${1:-https://your-app.com}"

echo "🏥 Production Health Check"
echo "=========================="
echo "URL: $PRODUCTION_URL"
echo "Time: $(date)"
echo ""

# Quick availability check
echo -n "Checking availability... "
if curl -f -s "$PRODUCTION_URL" > /dev/null 2>&1; then
  echo "✅ UP"
else
  echo "❌ DOWN"
  exit 1
fi

# Response time
echo -n "Measuring response time... "
response_time=$(curl -o /dev/null -s -w '%{time_total}' "$PRODUCTION_URL")
response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)
echo "${response_time_ms}ms"

# HTTP status
echo -n "HTTP status... "
status=$(curl -o /dev/null -s -w '%{http_code}' "$PRODUCTION_URL")
echo "$status"

# Health endpoint
if curl -f -s "$PRODUCTION_URL/api/health" > /dev/null 2>&1; then
  echo "✅ Health endpoint: OK"
else
  echo "⚠️  Health endpoint: Not responding"
fi

echo ""
echo "✅ Health check complete"
