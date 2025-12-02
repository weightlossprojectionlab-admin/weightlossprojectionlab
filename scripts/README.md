# Production Monitoring Scripts

This directory contains automated monitoring and validation scripts for production deployment.

## Quick Start

### Validate Production Deployment

```bash
./scripts/validate-production.sh https://your-production-url.com
```

### Start All Monitoring

```bash
./scripts/monitor-all.sh https://your-production-url.com
```

### Check Monitoring Status

```bash
./scripts/monitoring-status.sh
```

### Stop All Monitoring

```bash
./scripts/stop-monitoring.sh
```

---

## Scripts Overview

### Core Validation & Monitoring

| Script | Purpose | Usage |
|--------|---------|-------|
| `validate-production.sh` | Comprehensive validation (8 checks) | `./validate-production.sh [URL]` |
| `continuous-monitor.sh` | Real-time monitoring with alerts | `./continuous-monitor.sh [URL]` |
| `performance-dashboard.sh` | Live performance dashboard | `./performance-dashboard.sh [URL]` |
| `security-event-monitor.sh` | Security event tracking | `./security-event-monitor.sh` |

### Utilities

| Script | Purpose | Usage |
|--------|---------|-------|
| `health-check.sh` | Quick health check | `./health-check.sh [URL]` |
| `monitor-all.sh` | Start all monitoring services | `./monitor-all.sh [URL]` |
| `stop-monitoring.sh` | Stop all monitoring services | `./stop-monitoring.sh` |
| `monitoring-status.sh` | Check monitoring service status | `./monitoring-status.sh` |

### Configuration & Reporting

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-alerts.sh` | Configure alert thresholds | `./setup-alerts.sh` |
| `generate-deployment-report.sh` | Generate deployment report | `./generate-deployment-report.sh` |

---

## Validation Checks

The validation suite (`validate-production.sh`) performs these checks:

1. **Application Availability** - HTTP 200 response
2. **Security Headers** - X-Frame-Options, CSP, XCO, HSTS
3. **Debug Endpoints** - Protected (403) in production
4. **CSRF Protection** - Active on POST endpoints
5. **Rate Limiting** - Headers present
6. **Authentication** - Required for protected endpoints
7. **Firebase Integration** - Manual verification
8. **Error Handling** - Manual verification

---

## Monitoring Features

### Continuous Monitoring

- **Frequency**: Every 60 seconds (configurable)
- **Metrics**: HTTP status, response time
- **Alerts**: Status changes, slow responses
- **Logging**: All results to timestamped log file

### Performance Dashboard

- **Response Time**: 5 consecutive requests
- **Endpoint Status**: Health checks for critical endpoints
- **Security Headers**: Verification of security controls
- **Auto-refresh**: Every 10 seconds

### Security Event Monitoring

- Failed authentication attempts
- CSRF token validation failures
- Rate limit exceeded events
- SSRF attempts blocked
- Unauthorized access attempts
- Debug endpoint access in production

---

## Alert Configuration

### Default Thresholds

- **Response Time Warning**: > 5000ms
- **Check Interval**: 60 seconds
- **Critical**: Non-200 HTTP status
- **Warning**: Slow response time

### Notification Channels

Configure in `alerts-config.json`:
- Email notifications
- Slack webhooks
- Custom integrations

---

## Log Files

Logs are stored in `../logs/` directory:

| Log File | Content |
|----------|---------|
| `continuous-monitor.log` | Continuous monitoring results |
| `security-events.log` | Security event tracking |
| `monitoring-YYYYMMDD.log` | Daily monitoring logs |
| `security-events-YYYYMMDD.log` | Daily security logs |

---

## Usage Examples

### Complete Monitoring Setup

```bash
# 1. Initial validation
./scripts/validate-production.sh https://myapp.com

# 2. Start all monitoring
./scripts/monitor-all.sh https://myapp.com

# 3. Check status
./scripts/monitoring-status.sh

# 4. View live dashboard
./scripts/performance-dashboard.sh https://myapp.com

# 5. Generate report
./scripts/generate-deployment-report.sh
```

### Quick Health Check

```bash
# Fast availability check
./scripts/health-check.sh https://myapp.com
```

### View Logs

```bash
# Continuous monitoring
tail -f logs/continuous-monitor.log

# Security events
tail -f logs/security-events.log
```

### Stop Monitoring

```bash
# Stop all services
./scripts/stop-monitoring.sh
```

---

## Script Permissions

Make scripts executable:

```bash
chmod +x scripts/*.sh
```

Or on Windows with Git Bash:

```bash
git update-index --chmod=+x scripts/*.sh
```

---

## Dependencies

Required tools:
- `curl` - HTTP requests
- `bc` - Math calculations
- `grep` - Pattern matching
- `sed` - Text processing
- `tail` - Log viewing

Check dependencies:

```bash
which curl bc grep sed tail
```

---

## Configuration

### Environment Variables

```bash
# Alert configuration
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"
export ALERT_EMAIL="ops@example.com"

# Monitoring configuration
export PRODUCTION_URL="https://your-app.com"
export ALERT_THRESHOLD_MS=5000
export CHECK_INTERVAL=60
```

### Custom Thresholds

Edit scripts to modify:
- `ALERT_THRESHOLD_MS` - Response time threshold
- `CHECK_INTERVAL` - Monitoring frequency

---

## Troubleshooting

### Scripts Not Executing

```bash
# Make executable
chmod +x scripts/*.sh

# Check permissions
ls -la scripts/
```

### Monitoring Not Running

```bash
# Check status
./scripts/monitoring-status.sh

# View processes
ps aux | grep monitor

# Check logs
tail logs/*.log
```

### High Response Times

```bash
# Run performance dashboard
./scripts/performance-dashboard.sh https://myapp.com

# Check detailed validation
./scripts/validate-production.sh https://myapp.com
```

---

## Best Practices

1. **Run validation after every deployment**
2. **Keep monitoring active for 24 hours post-deployment**
3. **Review logs daily during first week**
4. **Adjust alert thresholds based on baselines**
5. **Generate reports weekly**
6. **Test rollback procedures regularly**

---

## Integration

### CI/CD Pipeline

```yaml
# Example GitHub Actions integration
- name: Validate Production
  run: ./scripts/validate-production.sh ${{ secrets.PRODUCTION_URL }}

- name: Start Monitoring
  run: ./scripts/monitor-all.sh ${{ secrets.PRODUCTION_URL }}
```

### Cron Jobs

```bash
# Hourly validation
0 * * * * /path/to/scripts/validate-production.sh https://myapp.com

# Daily report
0 0 * * * /path/to/scripts/generate-deployment-report.sh
```

---

## Support

For detailed documentation, see:
- [Monitoring Guide](../docs/MONITORING_GUIDE.md)
- [Rollback Procedures](../docs/ROLLBACK_PROCEDURES.md)
- [Deployment Checklist](../docs/DEPLOYMENT_CHECKLIST.md)

---

**Last Updated**: 2025-12-01
**Version**: 1.0
