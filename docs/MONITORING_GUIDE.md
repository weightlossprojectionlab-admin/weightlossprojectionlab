# Production Monitoring Guide

## Overview

This guide provides comprehensive instructions for monitoring the production deployment using the automated monitoring infrastructure.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Monitoring Scripts](#monitoring-scripts)
3. [Alert Configuration](#alert-configuration)
4. [Performance Baselines](#performance-baselines)
5. [Security Event Tracking](#security-event-tracking)
6. [Incident Response](#incident-response)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Immediate Post-Deployment

Run these commands immediately after deployment:

```bash
# 1. Validate production deployment
./scripts/validate-production.sh https://your-production-url.com

# 2. Start continuous monitoring (in background)
./scripts/continuous-monitor.sh https://your-production-url.com &

# 3. Start security event monitoring
./scripts/security-event-monitor.sh &

# 4. Generate deployment report
./scripts/generate-deployment-report.sh
```

### Monitor Dashboard

Open a live performance dashboard:

```bash
./scripts/performance-dashboard.sh https://your-production-url.com
```

---

## Monitoring Scripts

### 1. validate-production.sh

**Purpose**: Comprehensive validation suite that checks 8 critical aspects of production deployment.

**Usage**:
```bash
./scripts/validate-production.sh [PRODUCTION_URL]
```

**Checks Performed**:
1. Application Availability (HTTP 200 response)
2. Security Headers (X-Frame-Options, CSP, XCO, HSTS)
3. Debug Endpoints Protection (403 on /api/debug-profile)
4. CSRF Protection (403 on POST without token)
5. Rate Limiting (X-RateLimit headers)
6. Authentication (401/403 on protected endpoints)
7. Firebase Integration (manual verification)
8. Error Handling (manual verification)

**Exit Codes**:
- `0`: All checks passed
- `1`: One or more checks failed

**When to Run**:
- Immediately after deployment
- After configuration changes
- Daily during first week
- Weekly thereafter

**Example Output**:
```
✅ Production Validation Suite
==============================
Target: https://your-app.com

1️⃣  Application Availability
============================
✅ Application is accessible

2️⃣  Security Headers Validation
================================
✅ X-Frame-Options header present
✅ X-Content-Type-Options header present
✅ Content-Security-Policy header present
⚠️  HSTS header missing (recommended for HTTPS)

...

📊 Results
==========
Passed: 10
Failed: 0
Warnings: 2

✅ Validation PASSED
```

---

### 2. continuous-monitor.sh

**Purpose**: Real-time monitoring with automated alerting for availability and performance.

**Usage**:
```bash
./scripts/continuous-monitor.sh [PRODUCTION_URL]
```

**Features**:
- Checks every 60 seconds (configurable)
- Monitors HTTP status codes
- Tracks response times
- Logs all results to file
- Alerts on failures or slow responses

**Configuration**:
Edit the script to modify:
- `ALERT_THRESHOLD_MS=5000` - Alert if response > 5 seconds
- `CHECK_INTERVAL=60` - Check every 60 seconds

**Log Output**:
```
2025-12-01 10:15:30 | Status: 200 | Response: 245ms
2025-12-01 10:16:30 | Status: 200 | Response: 312ms
❌ 2025-12-01 10:17:30 | Status: 503 | Response: 0ms | ALERT: Non-200 status
⚠️  2025-12-01 10:18:30 | Status: 200 | Response: 5230ms | ALERT: Slow response
```

**Running in Background**:
```bash
# Start monitoring
./scripts/continuous-monitor.sh https://your-app.com > monitor.log 2>&1 &

# Check status
tail -f monitoring-$(date +%Y%m%d).log

# Stop monitoring
pkill -f continuous-monitor.sh
```

---

### 3. setup-alerts.sh

**Purpose**: Configure alert thresholds and notification channels.

**Usage**:
```bash
./scripts/setup-alerts.sh
```

**Alert Types**:

| Alert Name | Condition | Severity | Channels |
|------------|-----------|----------|----------|
| application_down | http_status != 200 | CRITICAL | Email, Slack |
| high_response_time | response_time > 5s | WARNING | Slack |
| high_error_rate | error_rate > 5% | HIGH | Email, Slack |
| failed_authentication | auth_failures > 100/hr | MEDIUM | Slack |
| rate_limit_exceeded | rate_limit_hits > 1000/hr | LOW | Slack |

**Setup Steps**:

1. Set environment variables:
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
export ALERT_EMAIL="ops@example.com"
```

2. Run setup script:
```bash
./scripts/setup-alerts.sh
```

3. Test notifications:
```bash
# Test Slack webhook
curl -X POST $SLACK_WEBHOOK_URL -H 'Content-Type: application/json' -d '{"text":"Test alert from monitoring system"}'
```

**Customizing Alerts**:

Edit `alerts-config.json` to modify:
- Alert conditions
- Severity levels
- Notification channels
- Recipients

---

### 4. performance-dashboard.sh

**Purpose**: Real-time performance dashboard with live updates.

**Usage**:
```bash
./scripts/performance-dashboard.sh [PRODUCTION_URL]
```

**Dashboard Sections**:

1. **Response Time**: 5 consecutive requests with timing
2. **Endpoint Status**: Health check for critical endpoints
3. **Security Headers**: Verification of security controls
4. **System Metrics**: Integration point for monitoring service

**Dashboard Output**:
```
📊 Production Performance Dashboard
====================================
Time: 2025-12-01 10:30:15
URL: https://your-app.com

⏱️  Response Time
----------------
  Request 1: 234ms
  Request 2: 245ms
  Request 3: 256ms
  Request 4: 241ms
  Request 5: 238ms

🔍 Endpoint Status
------------------
  /: 200
  /api/health: 200
  /api/debug-profile: 403

🔒 Security Headers
-------------------
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Content-Security-Policy: default-src 'self'

📈 System Metrics
-----------------
  [Connect to monitoring service]
```

**Auto-Refresh**: Dashboard refreshes every 10 seconds.

---

### 5. security-event-monitor.sh

**Purpose**: Track and log security-related events.

**Usage**:
```bash
./scripts/security-event-monitor.sh
```

**Events Monitored**:
- Failed authentication attempts
- CSRF token validation failures
- Rate limit exceeded events
- SSRF attempts blocked
- Unauthorized access attempts
- Debug endpoint access in production

**Log Format**:
```
[2025-12-01 10:45:23] [WARNING] Failed Authentication: User attempted login with invalid credentials
[2025-12-01 10:46:15] [CRITICAL] CSRF Violation: POST request without valid token blocked
[2025-12-01 10:47:02] [INFO] Rate Limit: IP 192.168.1.100 exceeded 100 requests/minute
```

**Integration**:

To integrate with application logs:

1. Configure application to log security events
2. Update script to tail appropriate log file
3. Add custom parsing for event types
4. Configure alert thresholds

---

### 6. generate-deployment-report.sh

**Purpose**: Generate comprehensive deployment report with metrics and checklist.

**Usage**:
```bash
./scripts/generate-deployment-report.sh
```

**Report Sections**:
- Deployment Summary
- Validation Results
- Performance Metrics
- Security Posture
- Issues Encountered
- Monitoring Status
- Next Steps
- Sign-Off

**Output**: Creates timestamped markdown file `deployment-report-YYYYMMDD_HHMMSS.md`

**When to Generate**:
- Immediately after deployment
- After 24-hour monitoring period
- After major incidents
- For weekly status reports

---

## Alert Configuration

### Alert Severity Levels

| Level | Response Time | Actions |
|-------|---------------|---------|
| CRITICAL | Immediate | Page on-call engineer, all channels |
| HIGH | < 15 minutes | Notify team lead, email + Slack |
| MEDIUM | < 1 hour | Slack notification, log for review |
| LOW | < 4 hours | Log only, review in daily standup |
| WARNING | Next business day | Log for investigation |

### Notification Channels

#### Slack Integration

1. Create Slack webhook:
   - Go to https://api.slack.com/apps
   - Create new app
   - Add Incoming Webhook
   - Copy webhook URL

2. Configure environment:
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"
```

3. Test webhook:
```bash
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Production monitoring test alert"}'
```

#### Email Integration

1. Configure SMTP settings in `alerts-config.json`
2. Add recipient email addresses
3. Test email delivery

---

## Performance Baselines

### Expected Response Times

| Endpoint | Expected | Warning | Critical |
|----------|----------|---------|----------|
| Homepage | < 500ms | > 2s | > 5s |
| API /health | < 100ms | > 500ms | > 2s |
| API /patients | < 1s | > 3s | > 10s |
| API /meals | < 1s | > 3s | > 10s |
| Database queries | < 200ms | > 1s | > 5s |

### Availability Targets

- **Uptime**: 99.9% (8.76 hours downtime/year)
- **Error Rate**: < 0.1% of requests
- **Response Time**: 95th percentile < 2s

### Traffic Patterns

Monitor for:
- Unusual traffic spikes (> 3x normal)
- Geographic anomalies
- Unusual endpoint access patterns
- Sudden error rate increases

---

## Security Event Tracking

### Critical Events

**Immediate Response Required**:
- Multiple failed authentication attempts (> 10/minute)
- SSRF attempts detected
- Debug endpoint access in production
- Unauthorized data access attempts
- Database injection attempts

### Event Categories

1. **Authentication Events**
   - Failed logins
   - Password resets
   - Account lockouts
   - Multi-factor failures

2. **Authorization Events**
   - Unauthorized access attempts
   - Permission escalation attempts
   - Cross-account access attempts

3. **Data Access Events**
   - Large data exports
   - Unusual query patterns
   - Sensitive data access

4. **Security Control Events**
   - CSRF violations
   - Rate limit exceeded
   - Content Security Policy violations
   - CORS policy violations

### Logging Requirements

All security events must include:
- Timestamp (UTC)
- Event type
- Severity level
- User/IP address
- Endpoint accessed
- Result (blocked/allowed)
- Additional context

---

## Incident Response

### Incident Severity Classification

**P0 - Critical**:
- Application completely down
- Data breach or leak
- Security vulnerability exploited
- Complete service outage

**P1 - High**:
- Major feature unavailable
- Severe performance degradation
- Security control failure
- Data integrity issues

**P2 - Medium**:
- Minor feature degraded
- Intermittent errors
- Elevated error rates
- Non-critical security issues

**P3 - Low**:
- Cosmetic issues
- Low-impact bugs
- Performance optimization opportunities

### Response Procedures

#### P0 - Critical Incident

1. **Immediate Actions** (0-5 minutes):
   - Page on-call engineer
   - Assess impact and scope
   - Execute rollback if needed
   - Post incident notice to status page

2. **Investigation** (5-30 minutes):
   - Identify root cause
   - Collect logs and metrics
   - Document timeline
   - Implement temporary fix

3. **Resolution** (30+ minutes):
   - Deploy permanent fix
   - Verify resolution
   - Monitor for recurrence
   - Update status page

4. **Post-Incident** (24-48 hours):
   - Conduct post-mortem
   - Document lessons learned
   - Implement preventive measures
   - Share findings with team

#### Rollback Procedures

If validation fails or critical issues detected:

```bash
# 1. Execute rollback script
./scripts/rollback-deployment.sh

# 2. Verify rollback successful
./scripts/validate-production.sh

# 3. Document rollback reason
echo "Rolled back due to: [reason]" >> rollback-log.txt

# 4. Notify team
# Post to Slack/email with rollback details
```

### Communication Templates

**Incident Notice**:
```
🚨 INCIDENT ALERT - P[0-3]
Time: [timestamp]
Issue: [brief description]
Impact: [user-facing impact]
Status: Investigating/Fixing/Resolved
ETA: [estimated resolution time]
```

**Resolution Notice**:
```
✅ INCIDENT RESOLVED - P[0-3]
Time: [timestamp]
Issue: [description]
Root Cause: [brief cause]
Resolution: [what was done]
Prevention: [future safeguards]
```

---

## Troubleshooting

### Common Issues

#### Validation Script Fails

**Symptom**: `validate-production.sh` reports failures

**Solutions**:

1. **Application not accessible**:
   - Check DNS resolution: `nslookup your-app.com`
   - Check firewall rules
   - Verify deployment completed
   - Check server logs

2. **Security headers missing**:
   - Verify next.config.js headers configuration
   - Check CDN/proxy settings
   - Clear cache and retry

3. **Debug endpoints not blocked**:
   - Verify NODE_ENV=production
   - Check middleware configuration
   - Review routing rules

4. **CSRF protection not active**:
   - Verify CSRF middleware installed
   - Check token generation
   - Review API route configuration

#### Monitoring Script Not Running

**Symptom**: No monitoring logs generated

**Solutions**:

1. Check script permissions:
```bash
chmod +x scripts/*.sh
```

2. Verify dependencies:
```bash
which curl  # Should return path
which bc    # Should return path
```

3. Check background processes:
```bash
ps aux | grep monitor
```

4. Review error logs:
```bash
tail -f monitor.log
```

#### High Response Times

**Symptom**: Response times exceed thresholds

**Investigation Steps**:

1. Check server resources:
```bash
# CPU usage
top

# Memory usage
free -m

# Disk I/O
iostat
```

2. Review application logs:
```bash
# Check for errors
grep ERROR /var/log/application.log

# Check slow queries
grep "slow query" /var/log/application.log
```

3. Analyze database performance:
```bash
# Check active queries
# Check connection pool status
# Review query execution plans
```

4. Check external dependencies:
```bash
# Test Firebase connectivity
# Test Redis connectivity
# Test third-party APIs
```

#### Alert Fatigue

**Symptom**: Too many alerts, team ignoring

**Solutions**:

1. Adjust thresholds in `alerts-config.json`
2. Implement alert aggregation (group similar alerts)
3. Add alert cooldown periods
4. Prioritize critical alerts
5. Regular review and tuning of alert rules

---

## Monitoring Checklist

### Daily (First Week)

- [ ] Run validation suite
- [ ] Review monitoring logs
- [ ] Check error rates
- [ ] Review security events
- [ ] Verify alert system functioning
- [ ] Check response time trends

### Weekly (First Month)

- [ ] Generate deployment report
- [ ] Review performance baselines
- [ ] Analyze security events
- [ ] Update alert thresholds
- [ ] Review incident reports
- [ ] Team retrospective

### Monthly (Ongoing)

- [ ] Comprehensive security audit
- [ ] Performance optimization review
- [ ] Alert configuration tuning
- [ ] Update monitoring documentation
- [ ] Review and update runbooks
- [ ] Disaster recovery drill

---

## Best Practices

1. **Always run validation before and after changes**
2. **Keep monitoring logs for at least 90 days**
3. **Review alerts weekly and tune thresholds**
4. **Document all incidents and resolutions**
5. **Test rollback procedures regularly**
6. **Keep monitoring scripts updated**
7. **Share monitoring access with team**
8. **Automate as much as possible**
9. **Set up redundant monitoring**
10. **Regular security event reviews**

---

## Additional Resources

- [Rollback Procedures](./ROLLBACK_PROCEDURES.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Security Audit Guide](./SECURITY_AUDIT.md)
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)

---

## Support

For issues or questions about monitoring:
1. Check this guide first
2. Review monitoring logs
3. Check application logs
4. Contact DevOps team
5. Escalate to on-call engineer if critical

---

**Last Updated**: 2025-12-01
**Version**: 1.0
**Maintained By**: DevOps Team
