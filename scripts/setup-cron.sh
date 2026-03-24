#!/bin/bash
# Sets up a nightly cron job to run the deep-dive enrichment at 11pm.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/deep-dive.log"

mkdir -p "$PROJECT_DIR/logs"

CRON_CMD="0 23 * * * cd $PROJECT_DIR && npm run deep-dive >> $LOG_FILE 2>&1"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "deep-dive"; then
  echo "Cron job already installed."
  crontab -l | grep "deep-dive"
else
  (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
  echo "Cron job installed. Runs nightly at 11pm."
  echo "Logs: $LOG_FILE"
fi
