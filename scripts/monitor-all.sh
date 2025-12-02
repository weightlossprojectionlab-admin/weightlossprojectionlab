#!/bin/bash

# Master monitoring script - starts all monitoring processes
# Usage: ./monitor-all.sh [PRODUCTION_URL]

PRODUCTION_URL="${1:-https://your-app.com}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting All Monitoring Services"
echo "===================================="
echo "URL: $PRODUCTION_URL"
echo ""

# Create logs directory
mkdir -p "$SCRIPT_DIR/../logs"

# Start continuous monitoring
echo "Starting continuous monitoring..."
"$SCRIPT_DIR/continuous-monitor.sh" "$PRODUCTION_URL" > "$SCRIPT_DIR/../logs/continuous-monitor.log" 2>&1 &
MONITOR_PID=$!
echo "  PID: $MONITOR_PID"

# Start security event monitor
echo "Starting security event monitor..."
"$SCRIPT_DIR/security-event-monitor.sh" > "$SCRIPT_DIR/../logs/security-events.log" 2>&1 &
SECURITY_PID=$!
echo "  PID: $SECURITY_PID"

# Save PIDs
echo "$MONITOR_PID" > "$SCRIPT_DIR/../logs/monitor.pid"
echo "$SECURITY_PID" > "$SCRIPT_DIR/../logs/security.pid"

echo ""
echo "✅ All monitoring services started"
echo ""
echo "To view logs:"
echo "  Continuous: tail -f $SCRIPT_DIR/../logs/continuous-monitor.log"
echo "  Security: tail -f $SCRIPT_DIR/../logs/security-events.log"
echo ""
echo "To stop all monitoring:"
echo "  ./scripts/stop-monitoring.sh"
