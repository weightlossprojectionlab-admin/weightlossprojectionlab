#!/bin/bash

PRODUCTION_URL="${1:-https://your-app.com}"

generate_dashboard() {
  clear
  echo "📊 Production Performance Dashboard"
  echo "===================================="
  echo "Time: $(date)"
  echo "URL: $PRODUCTION_URL"
  echo ""

  # Response Time
  echo "⏱️  Response Time"
  echo "----------------"
  for i in {1..5}; do
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "$PRODUCTION_URL")
    response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)
    echo "  Request $i: ${response_time_ms}ms"
  done
  echo ""

  # Endpoint Status
  echo "🔍 Endpoint Status"
  echo "------------------"
  check_endpoint() {
    local endpoint=$1
    local status=$(curl -o /dev/null -s -w '%{http_code}' "$PRODUCTION_URL$endpoint")
    echo "  $endpoint: $status"
  }

  check_endpoint "/"
  check_endpoint "/api/health"
  check_endpoint "/api/debug-profile"
  echo ""

  # Security Headers
  echo "🔒 Security Headers"
  echo "-------------------"
  headers=$(curl -I -s "$PRODUCTION_URL")
  echo "$headers" | grep -E "(X-Frame-Options|X-Content-Type-Options|Content-Security-Policy)" | sed 's/^/  /'
  echo ""

  # System Metrics (if available)
  echo "📈 System Metrics"
  echo "-----------------"
  echo "  [Connect to monitoring service]"
  echo ""
}

# Refresh every 10 seconds
while true; do
  generate_dashboard
  sleep 10
done
