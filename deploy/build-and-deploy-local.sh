#!/bin/sh
# Local variant of build-and-deploy.sh, for running directly on GISMO itself
# (Claude Code sessions in this project run on GISMO, not on the dev laptop,
# so the rsync-over-ssh in the original script doesn't apply here.)

set -e

# build the project, exit immediately on failure
npm run build || { echo "Build failed! Deployment aborted."; exit 1; }

echo
echo "Deploying LIQUIDO frontend from ./dist/ to /var/www/liquido-frontend (local copy)"
echo "Will also delete old asset files."
echo
rsync -avzh --delete-after ./dist/ /var/www/liquido-frontend

echo
echo "Successfully deployed frontend locally ✅"
