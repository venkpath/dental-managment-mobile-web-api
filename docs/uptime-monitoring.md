# Uptime Monitoring Configuration

## Recommended Service: UptimeRobot or BetterStack (Uptime)

### Monitors to Configure

| Monitor Name | URL | Check Interval | Alert Threshold |
|---|---|---|---|
| API Health | `{API_BASE_URL}/api/v1/health` | 5 min | 2 failures |
| API Readiness | `{API_BASE_URL}/api/v1/health/ready` | 5 min | 1 failure |
| API Detailed Health | `{API_BASE_URL}/api/v1/health/detailed` | 15 min | 2 failures |
| Frontend | `{FRONTEND_URL}` | 5 min | 2 failures |

### UptimeRobot Setup

1. Sign up at https://uptimerobot.com (free tier: 50 monitors, 5-min intervals)
2. Add HTTP(S) monitors for each endpoint above
3. Configure alert contacts (email, Slack, or webhook)
4. Set keyword monitor for `/health` expecting `"ok"` in response

### BetterStack Setup

1. Sign up at https://betterstack.com/uptime
2. Create monitors for each endpoint
3. Configure escalation policies
4. Integrate with Slack/Teams/PagerDuty as needed

### Alert Channels

- **Email**: Team distribution list
- **Slack**: #alerts channel webhook
- **PagerDuty**: For production on-call rotation (Phase 5+)

### Status Page (Optional)

Both UptimeRobot and BetterStack offer public status pages:
- URL: `status.yourdomain.com`
- Show: API Status, Frontend Status, Database Status
