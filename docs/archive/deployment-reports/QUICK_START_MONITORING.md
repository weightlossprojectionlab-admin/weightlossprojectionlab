# Quick Start: Production Monitoring

This guide gets you up and running with production monitoring in 5 minutes.

## Prerequisites

- Production application deployed
- Production URL available
- Bash/shell access
- curl, bc, grep installed

---

## Step 1: Validate Deployment (2 minutes)

Run comprehensive validation:

```bash
cd /path/to/weightlossprojectlab
./scripts/validate-production.sh https://your-production-url.com
```

**Expected Output**:
```
✅ Production Validation Suite
==============================
Target: https://your-production-url.com

1️⃣  Application Availability
✅ Application is accessible

2️⃣  Security Headers Validation
✅ X-Frame-Options header present
✅ X-Content-Type-Options header present
✅ Content-Security-Policy header present

...

📊 Results
Passed: 10
Failed: 0
Warnings: 2

✅ Validation PASSED
```

**If validation fails**:
- Check application is deployed and running
- Verify URL is correct
- Review failed checks
- Fix issues before proceeding

---

## Step 2: Start Monitoring (1 minute)

Start all monitoring services:

```bash
./scripts/monitor-all.sh https://your-production-url.com
```

**Expected Output**:
```
🚀 Starting All Monitoring Services
====================================
URL: https://your-production-url.com

Starting continuous monitoring...
  PID: 12345
Starting security event monitor...
  PID: 12346

✅ All monitoring services started

To view logs:
  Continuous: tail -f logs/continuous-monitor.log
  Security: tail -f logs/security-events.log
```

---

## Step 3: Verify Monitoring (30 seconds)

Check monitoring status:

```bash
./scripts/monitoring-status.sh
```

**Expected Output**:
```
📊 Monitoring Services Status
==============================

✅ Continuous Monitor: RUNNING (PID: 12345)
✅ Security Monitor: RUNNING (PID: 12346)

📁 Log File Status
------------------
Continuous Monitor Log: 4.0K
Security Events Log: 1.0K

✅ All monitoring services operational
```

---

## Step 4: View Live Dashboard (30 seconds)

Open performance dashboard:

```bash
./scripts/performance-dashboard.sh https://your-production-url.com
```

**Dashboard Updates Every 10 Seconds**:
```
📊 Production Performance Dashboard
====================================
Time: 2025-12-01 10:30:15
URL: https://your-production-url.com

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
```

**Press Ctrl+C to exit dashboard**

---

## Step 5: Generate Report (1 minute)

Create deployment report:

```bash
./scripts/generate-deployment-report.sh
```

**Output**: Creates `deployment-report-YYYYMMDD_HHMMSS.md`

---

## Ongoing Monitoring

### View Logs in Real-Time

```bash
# Continuous monitoring
tail -f logs/continuous-monitor.log

# Security events
tail -f logs/security-events.log
```

### Check Status Anytime

```bash
./scripts/monitoring-status.sh
```

### Quick Health Check

```bash
./scripts/health-check.sh https://your-production-url.com
```

---

## Stopping Monitoring

When monitoring period complete:

```bash
./scripts/stop-monitoring.sh
```

---

## Monitoring Schedule

### First 24 Hours

- [x] Initial validation (**Now**)
- [x] Start monitoring (**Now**)
- [ ] Check logs every 2 hours
- [ ] Review dashboard every 4 hours
- [ ] Generate report at 24 hours

### First Week

- [ ] Daily validation runs
- [ ] Daily log reviews
- [ ] Daily report generation
- [ ] Adjust alert thresholds as needed

### Ongoing

- [ ] Weekly validation
- [ ] Weekly report generation
- [ ] Monthly performance review
- [ ] Quarterly security audit

---

## Alert Configuration (Optional)

### Setup Slack Alerts

1. Create Slack webhook:
   - https://api.slack.com/apps
   - Create app → Incoming Webhooks
   - Copy webhook URL

2. Configure environment:
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"
```

3. Run setup:
```bash
./scripts/setup-alerts.sh
```

4. Test alert:
```bash
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test: Production monitoring active"}'
```

---

## What to Watch For

### Normal Behavior

✅ HTTP Status: 200
✅ Response Time: < 2000ms
✅ Error Rate: < 0.1%
✅ All security checks passing

### Warning Signs

⚠️ Response Time: > 2000ms
⚠️ Intermittent 5xx errors
⚠️ Elevated error rate
⚠️ Security header warnings

### Critical Issues

❌ Application down (non-200 status)
❌ Response time > 5000ms
❌ Debug endpoints accessible
❌ CSRF protection disabled
❌ Authentication bypassed

---

## Immediate Actions for Critical Issues

### Application Down

```bash
# 1. Verify issue
./scripts/health-check.sh https://your-app.com

# 2. Check recent deployments
git log -5 --oneline

# 3. Execute rollback if needed
./scripts/rollback-deployment.sh

# 4. Notify team
# Post to Slack/email
```

### High Error Rate

```bash
# 1. View recent logs
tail -100 logs/continuous-monitor.log

# 2. Run full validation
./scripts/validate-production.sh https://your-app.com

# 3. Check application logs
# Review server logs for errors
```

### Security Issue

```bash
# 1. Review security events
tail -f logs/security-events.log

# 2. Run validation
./scripts/validate-production.sh https://your-app.com

# 3. If critical, consider rollback
./scripts/rollback-deployment.sh
```

---

## Next Steps

- [ ] Configure Slack alerts
- [ ] Set up email notifications
- [ ] Add monitoring to CI/CD pipeline
- [ ] Schedule automated reports
- [ ] Document baseline performance
- [ ] Create custom alert rules

---

## Help & Documentation

- **Full Guide**: [docs/MONITORING_GUIDE.md](./MONITORING_GUIDE.md)
- **Scripts Reference**: [scripts/README.md](../scripts/README.md)
- **Rollback Procedures**: [docs/ROLLBACK_PROCEDURES.md](./ROLLBACK_PROCEDURES.md)

---

## Troubleshooting

### "Permission denied" when running scripts

```bash
chmod +x scripts/*.sh
```

### "curl: command not found"

```bash
# Install curl
sudo apt-get install curl  # Ubuntu/Debian
brew install curl          # macOS
```

### "bc: command not found"

```bash
# Install bc
sudo apt-get install bc    # Ubuntu/Debian
brew install bc            # macOS
```

### Monitoring not logging

```bash
# Check if processes running
ps aux | grep monitor

# Check logs directory exists
mkdir -p logs

# Restart monitoring
./scripts/stop-monitoring.sh
./scripts/monitor-all.sh https://your-app.com
```

---

**You're now monitoring production!**

Keep monitoring active for at least 24 hours post-deployment.
Review logs daily during the first week.
Adjust thresholds based on observed baselines.

---

**Setup Time**: ~5 minutes
**Recommended Monitoring Duration**: 24-48 hours minimum
**First Week**: Daily monitoring
**Ongoing**: Weekly validation
