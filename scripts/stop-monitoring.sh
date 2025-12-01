#!/bin/bash

# Stop all monitoring processes
# Usage: ./stop-monitoring.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛑 Stopping All Monitoring Services"
echo "===================================="
echo ""

# Stop continuous monitor
if [ -f "$SCRIPT_DIR/../logs/monitor.pid" ]; then
  MONITOR_PID=$(cat "$SCRIPT_DIR/../logs/monitor.pid")
  if kill -0 "$MONITOR_PID" 2>/dev/null; then
    kill "$MONITOR_PID"
    echo "✅ Stopped continuous monitoring (PID: $MONITOR_PID)"
  else
    echo "⚠️  Continuous monitoring not running"
  fi
  rm "$SCRIPT_DIR/../logs/monitor.pid"
fi

# Stop security monitor
if [ -f "$SCRIPT_DIR/../logs/security.pid" ]; then
  SECURITY_PID=$(cat "$SCRIPT_DIR/../logs/security.pid")
  if kill -0 "$SECURITY_PID" 2>/dev/null; then
    kill "$SECURITY_PID"
    echo "✅ Stopped security monitoring (PID: $SECURITY_PID)"
  else
    echo "⚠️  Security monitoring not running"
  fi
  rm "$SCRIPT_DIR/../logs/security.pid"
fi

# Also kill by process name as fallback
pkill -f "continuous-monitor.sh" 2>/dev/null && echo "✅ Killed any remaining continuous-monitor processes"
pkill -f "security-event-monitor.sh" 2>/dev/null && echo "✅ Killed any remaining security-event-monitor processes"

echo ""
echo "✅ All monitoring services stopped"
