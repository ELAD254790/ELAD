#!/usr/bin/env bash
# Sets up daily cron jobs for morning report (07:00) and evening check-in (20:00)
# Run once: bash scripts/setup-cron.sh

set -e

APP_URL="${APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
  echo "❌  CRON_SECRET is not set. Add it to your .env and run:  source .env && bash scripts/setup-cron.sh"
  exit 1
fi

MORNING_CMD="curl -s -X POST \"${APP_URL}/api/daily-report\" -H \"x-cron-secret: ${CRON_SECRET}\" -H \"Content-Type: application/json\" >> /tmp/morning-report.log 2>&1"
EVENING_CMD="curl -s -X POST \"${APP_URL}/api/daily-report/evening\" -H \"x-cron-secret: ${CRON_SECRET}\" -H \"Content-Type: application/json\" >> /tmp/evening-checkin.log 2>&1"

# Remove existing entries managed by this script
TMPFILE=$(mktemp)
crontab -l 2>/dev/null | grep -v "daily-report\|evening-checkin" > "$TMPFILE" || true

# Israel Standard Time = UTC+3.  Morning 07:00 IL = 04:00 UTC.  Evening 20:00 IL = 17:00 UTC.
echo "0 4  * * *  $MORNING_CMD   # daily-report morning" >> "$TMPFILE"
echo "0 17 * * *  $EVENING_CMD   # evening-checkin" >> "$TMPFILE"

crontab "$TMPFILE"
rm "$TMPFILE"

echo "✅  Cron jobs installed:"
echo "    07:00 (Israel) → Morning report  → ${APP_URL}/api/daily-report"
echo "    20:00 (Israel) → Evening check-in → ${APP_URL}/api/daily-report/evening"
echo ""
echo "Verify with: crontab -l"
