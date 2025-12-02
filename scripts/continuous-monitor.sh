#!/bin/bash

PRODUCTION_URL="${1:-https://your-app.com}"
LOG_FILE="monitoring-$(date +%Y%m%d).log"
ALERT_THRESHOLD_MS=5000  # Alert if response time > 5s
CHECK_INTERVAL=60  # Check every 60 seconds

echo "🔍 Continuous Production Monitoring" | tee -a "$LOG_FILE"
echo "===================================" | tee -a "$LOG_FILE"
echo "URL: $PRODUCTION_URL" | tee -a "$LOG_FILE"
echo "Log: $LOG_FILE" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

monitor() {
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  # Response time check
  response_time=$(curl -o /dev/null -s -w '%{time_total}' "$PRODUCTION_URL")
  response_time_ms=$(echo "$response_time * 1000" | bc)
  response_time_ms=${response_time_ms%.*}

  # HTTP status check
  http_status=$(curl -o /dev/null -s -w '%{http_code}' "$PRODUCTION_URL")

  # Log results
  log_entry="$timestamp | Status: $http_status | Response: ${response_time_ms}ms"

  if [ "$http_status" != "200" ]; then
    echo "❌ $log_entry | ALERT: Non-200 status" | tee -a "$LOG_FILE"
    # Send alert
  elif [ "$response_time_ms" -gt "$ALERT_THRESHOLD_MS" ]; then
    echo "⚠️  $log_entry | ALERT: Slow response" | tee -a "$LOG_FILE"
    # Send alert
  else
    echo "✅ $log_entry" | tee -a "$LOG_FILE"
  fi
}

# Main monitoring loop
while true; do
  monitor
  sleep $CHECK_INTERVAL
done
