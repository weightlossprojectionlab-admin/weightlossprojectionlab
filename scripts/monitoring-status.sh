#!/bin/bash

# Check status of all monitoring services
# Usage: ./monitoring-status.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📊 Monitoring Services Status"
echo "=============================="
echo "Time: $(date)"
echo ""

check_service() {
  local name=$1
  local pid_file=$2

  if [ -f "$pid_file" ]; then
    PID=$(cat "$pid_file")
    if kill -0 "$PID" 2>/dev/null; then
      echo "✅ $name: RUNNING (PID: $PID)"
      return 0
    else
      echo "❌ $name: STOPPED (stale PID file)"
      return 1
    fi
  else
    echo "❌ $name: NOT STARTED"
    return 1
  fi
}

# Check continuous monitor
check_service "Continuous Monitor" "$SCRIPT_DIR/../logs/monitor.pid"
MONITOR_STATUS=$?

# Check security monitor
check_service "Security Monitor" "$SCRIPT_DIR/../logs/security.pid"
SECURITY_STATUS=$?

echo ""

# Log file sizes
echo "📁 Log File Status"
echo "------------------"
if [ -f "$SCRIPT_DIR/../logs/continuous-monitor.log" ]; then
  SIZE=$(du -h "$SCRIPT_DIR/../logs/continuous-monitor.log" | cut -f1)
  echo "Continuous Monitor Log: $SIZE"
else
  echo "Continuous Monitor Log: Not found"
fi

if [ -f "$SCRIPT_DIR/../logs/security-events.log" ]; then
  SIZE=$(du -h "$SCRIPT_DIR/../logs/security-events.log" | cut -f1)
  echo "Security Events Log: $SIZE"
else
  echo "Security Events Log: Not found"
fi

echo ""

# Recent activity
echo "📝 Recent Activity (last 5 lines)"
echo "----------------------------------"
if [ -f "$SCRIPT_DIR/../logs/continuous-monitor.log" ]; then
  echo "Continuous Monitor:"
  tail -5 "$SCRIPT_DIR/../logs/continuous-monitor.log" | sed 's/^/  /'
fi

echo ""

if [ $MONITOR_STATUS -eq 0 ] && [ $SECURITY_STATUS -eq 0 ]; then
  echo "✅ All monitoring services operational"
  exit 0
else
  echo "⚠️  Some monitoring services not running"
  echo "Run ./scripts/monitor-all.sh to start"
  exit 1
fi
