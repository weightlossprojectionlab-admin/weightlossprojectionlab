#!/bin/bash

PRODUCTION_URL="${1:-https://your-app.com}"
INTERVAL="${2:-30}"  # seconds

if [ -z "$1" ]; then
  echo "Usage: $0 <production-url> [interval-seconds]"
  echo "Example: $0 https://your-app.com 30"
  echo ""
  echo "Using default: $PRODUCTION_URL"
  echo ""
fi

echo "📊 Deployment Monitoring Dashboard"
echo "==================================="
echo "URL: $PRODUCTION_URL"
echo "Interval: ${INTERVAL}s"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Function to check endpoint status
check_status() {
  local url=$1
  curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000"
}

# Function to get response time
get_response_time() {
  local url=$1
  curl -o /dev/null -s -w '%{time_total}' --max-time 10 "$url" 2>/dev/null || echo "999.999"
}

# Function to format time
format_time() {
  local seconds=$1
  printf "%.3fs" "$seconds"
}

# Function to get status emoji
get_status_emoji() {
  local status=$1
  if [ "$status" = "200" ]; then
    echo "✅"
  elif [ "$status" = "000" ]; then
    echo "❌"
  else
    echo "⚠️ "
  fi
}

# Main monitoring loop
monitor_loop() {
  local iteration=0

  while true; do
    ((iteration++))

    clear
    echo "📊 Deployment Monitoring Dashboard - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=============================================================="
    echo ""
    echo "Target: $PRODUCTION_URL"
    echo "Iteration: $iteration"
    echo ""

    # Homepage check
    echo "=== Homepage ==="
    status=$(check_status "$PRODUCTION_URL")
    response_time=$(get_response_time "$PRODUCTION_URL")
    emoji=$(get_status_emoji "$status")
    echo "$emoji Status: $status"
    echo "   Response Time: $(format_time $response_time)"
    echo ""

    # Login page check
    echo "=== Login Page ==="
    login_status=$(check_status "$PRODUCTION_URL/login")
    login_time=$(get_response_time "$PRODUCTION_URL/login")
    login_emoji=$(get_status_emoji "$login_status")
    echo "$login_emoji Status: $login_status"
    echo "   Response Time: $(format_time $login_time)"
    echo ""

    # API health check
    echo "=== API Health ==="
    api_status=$(check_status "$PRODUCTION_URL/api/health")
    api_time=$(get_response_time "$PRODUCTION_URL/api/health")
    api_emoji=$(get_status_emoji "$api_status")
    echo "$api_emoji Status: $api_status"
    echo "   Response Time: $(format_time $api_time)"
    echo ""

    # Security headers check
    echo "=== Security ==="
    headers=$(curl -I -s "$PRODUCTION_URL" 2>/dev/null | grep -cE "(X-Frame-Options|X-Content-Type-Options|Content-Security-Policy)")
    if [ "$headers" -ge 2 ]; then
      echo "✅ Security Headers: $headers/3 present"
    else
      echo "⚠️  Security Headers: $headers/3 present"
    fi
    echo ""

    # Performance summary
    echo "=== Performance Summary ==="
    avg_time=$(echo "scale=3; ($response_time + $login_time + $api_time) / 3" | bc)
    echo "Average Response Time: $(format_time $avg_time)"

    if (( $(echo "$avg_time < 1.0" | bc -l) )); then
      echo "Performance: ✅ Excellent"
    elif (( $(echo "$avg_time < 2.0" | bc -l) )); then
      echo "Performance: ✅ Good"
    elif (( $(echo "$avg_time < 3.0" | bc -l) )); then
      echo "Performance: ⚠️  Acceptable"
    else
      echo "Performance: ❌ Poor"
    fi
    echo ""

    # Error tracking (would need log access in production)
    echo "=== Error Tracking ==="
    echo "📝 Error Rate: [Monitor logs separately]"
    echo "📝 Error Logs: Check Firebase Console / Application Logs"
    echo ""

    # Next check countdown
    echo "========================================="
    echo "Next check in ${INTERVAL} seconds..."
    echo "Press Ctrl+C to stop monitoring"

    sleep $INTERVAL
  done
}

# Trap Ctrl+C
trap 'echo ""; echo "Monitoring stopped."; exit 0' INT

# Start monitoring
monitor_loop
