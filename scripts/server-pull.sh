#!/bin/bash
set -e

# Runs ON THE BOX. Pulls latest main and reconciles the running stack.
# Two uses:
#   1) Manual:  ./scripts/server-pull.sh
#   2) Timer:   a systemd timer runs this so the daily GitHub Actions Parquet
#      commit (which can't SSH in over WireGuard) gets picked up automatically.
#
# It's a no-op-cheap pull: if nothing changed, docker compose up -d does nothing.

REPO="/home/rense/personal-site"
BRANCH="main"

cd "$REPO"

BEFORE=$(git rev-parse HEAD)
git fetch --quiet origin "$BRANCH"
git reset --hard --quiet "origin/$BRANCH"
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" != "$AFTER" ]; then
	echo "$(date -Is) updated $BEFORE -> $AFTER"
	# Caddy serves static files straight from disk, so a content-only change
	# needs no restart. Recreate only if infra files changed.
	if git diff --name-only "$BEFORE" "$AFTER" | grep -q '^infra/'; then
		echo "$(date -Is) infra changed, recreating stack"
		cd "$REPO/infra" && docker compose up -d
	fi
else
	echo "$(date -Is) already up to date"
fi
