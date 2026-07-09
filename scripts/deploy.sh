#!/bin/bash
set -e

# Manual deploy for the personal site.
#   Local machine -> git push -> ssh (over WireGuard) -> git pull on box.
# SSH rides the WireGuard tunnel, so there is still no public SSH port.
#
# Prereqs (one-time):
#   - ~/.ssh/config has a `Host hetzner` entry pointing at the box's WireGuard IP
#   - the repo is cloned on the box at $REMOTE_PATH
#
# Usage:
#   ./scripts/deploy.sh            # push + pull (site content / Caddyfile tweaks)
#   ./scripts/deploy.sh --docker   # also recreate the caddy + cloudflared stack

SERVER="hetzner"                       # ~/.ssh/config Host alias (WireGuard IP)
REMOTE_PATH="/home/rense/personal-site"
BRANCH="main"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

DOCKER=false
[ "$1" = "--docker" ] && DOCKER=true

echo -e "${YELLOW}=== Personal site deploy $([ "$DOCKER" = true ] && echo '(with Docker recreate)' || echo '(content only)') ===${NC}"

# Refuse to deploy a dirty tree
if [ -n "$(git status --porcelain)" ]; then
	echo -e "${RED}Error: uncommitted changes. Commit or stash first.${NC}"
	git status --short
	exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
	echo -e "${RED}Error: not on ${BRANCH} (currently on ${CURRENT_BRANCH}).${NC}"
	exit 1
fi

echo -e "${GREEN}[1] Pushing to GitHub...${NC}"
git push origin "$BRANCH"

echo -e "${GREEN}[2] Pulling on server...${NC}"
ssh "$SERVER" "cd $REMOTE_PATH && git pull origin $BRANCH"

if [ "$DOCKER" = true ]; then
	echo -e "${GREEN}[3] Recreating the public stack...${NC}"
	ssh "$SERVER" "cd $REMOTE_PATH/infra && docker compose up -d --build"
	echo -e "${GREEN}[4] Container status:${NC}"
	sleep 3
	ssh "$SERVER" "cd $REMOTE_PATH/infra && docker compose ps"
fi

echo -e "${GREEN}=== Deploy complete ===${NC}"
if [ "$DOCKER" = false ]; then
	echo -e "${YELLOW}Static files updated; Caddy serves them from disk immediately.${NC}"
	echo -e "${YELLOW}Cloudflare edge cache on HTML is 5 min — purge in the dashboard to see changes instantly.${NC}"
fi
