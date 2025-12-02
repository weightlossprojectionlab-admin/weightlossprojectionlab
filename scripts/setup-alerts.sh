#!/bin/bash

echo "🔔 Setting Up Production Alerts"
echo "================================"
echo ""

# Create alert configuration file
cat > alerts-config.json <<EOF
{
  "alerts": [
    {
      "name": "application_down",
      "condition": "http_status != 200",
      "severity": "critical",
      "notification_channels": ["email", "slack"]
    },
    {
      "name": "high_response_time",
      "condition": "response_time_ms > 5000",
      "severity": "warning",
      "notification_channels": ["slack"]
    },
    {
      "name": "high_error_rate",
      "condition": "error_rate > 0.05",
      "severity": "high",
      "notification_channels": ["email", "slack"]
    },
    {
      "name": "failed_authentication",
      "condition": "auth_failures > 100/hour",
      "severity": "medium",
      "notification_channels": ["slack"]
    },
    {
      "name": "rate_limit_exceeded",
      "condition": "rate_limit_hits > 1000/hour",
      "severity": "low",
      "notification_channels": ["slack"]
    }
  ],
  "notification_channels": {
    "email": {
      "enabled": true,
      "recipients": ["ops@example.com"]
    },
    "slack": {
      "enabled": true,
      "webhook_url": "\${SLACK_WEBHOOK_URL}"
    }
  }
}
EOF

echo "✅ Alert configuration created: alerts-config.json"
echo ""
echo "Next steps:"
echo "1. Set SLACK_WEBHOOK_URL environment variable"
echo "2. Configure email SMTP settings"
echo "3. Test alert notifications"
