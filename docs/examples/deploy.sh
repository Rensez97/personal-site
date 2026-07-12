#!/bin/bash
set -e

SERVER="dagster-vps"
REMOTE_PATH="/home/rense/dagster-cc"
BRANCH="main"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Usage: ./deploy.sh [--docker]
#   No flag  = push + pull only (proxy changes, config tweaks, etc.)
#   --docker = also rebuild and restart the Docker stack
DOCKER=false
if [ "$1" = "--docker" ]; then
    DOCKER=true
fi

echo -e "${YELLOW}=== Dagster CC Deploy $([ "$DOCKER" = true ] && echo '(with Docker rebuild)' || echo '(code only)') ===${NC}"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: You have uncommitted changes. Commit or stash them first.${NC}"
    git status --short
    exit 1
fi

# Check we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo -e "${RED}Error: Not on ${BRANCH} branch (currently on ${CURRENT_BRANCH}).${NC}"
    exit 1
fi

# Push to remote
echo -e "${GREEN}[1] Pushing to GitHub...${NC}"
git push origin "$BRANCH"

# Pull on server
echo -e "${GREEN}[2] Pulling on server...${NC}"
ssh "$SERVER" "cd $REMOTE_PATH && git pull origin $BRANCH"

# Sync proxy dependencies (runs outside Docker, uses its own venv)
echo -e "${GREEN}[3] Syncing proxy dependencies...${NC}"
ssh "$SERVER" "cd $REMOTE_PATH/proxies && \
    [ -d venv ] || python3 -m venv venv && \
    venv/bin/pip install -q -r requirements.txt"

if [ "$DOCKER" = true ]; then
    echo -e "${GREEN}[4] Rebuilding and restarting Docker stack...${NC}"
    ssh "$SERVER" "cd $REMOTE_PATH && docker compose down"
    ssh -t "$SERVER" "cd $REMOTE_PATH && docker compose build"
    ssh "$SERVER" "cd $REMOTE_PATH && docker compose up -d"

    echo -e "${GREEN}[5] Verifying containers...${NC}"
    sleep 5
    ssh "$SERVER" "cd $REMOTE_PATH && docker compose ps"
fi

echo -e "${GREEN}=== Deploy complete ===${NC}"
if [ "$DOCKER" = false ]; then
    echo -e "${YELLOW}Code pushed and pulled. Proxy cron picks up changes on next run.${NC}"
    echo -e "${YELLOW}Run with --docker to also rebuild the Docker stack.${NC}"
fi
