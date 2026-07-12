#!/usr/bin/env bash
# Rebuild the app and publish it to GitHub Pages (the gh-pages branch).
#
#   GH_TOKEN=ghp_xxxxx ./deploy.sh
#
# The token needs the classic 'repo' scope (or a fine-grained token with Contents: read/write).
# It is read from the environment and never written to disk or committed.
set -euo pipefail

REPO="grigorysolomatov/graph-game"
SITE="https://grigorysolomatov.github.io/graph-game/"

# Load GH_TOKEN from a gitignored .env next to this script, if present.
ENV_FILE="$(dirname "$0")/.env"
if [ -f "$ENV_FILE" ]; then set -a; . "$ENV_FILE"; set +a; fi

: "${GH_TOKEN:?Set GH_TOKEN (in .env or the environment) to a GitHub token with 'repo' scope}"

npm run build

cd dist
touch .nojekyll                     # serve as-is; don't run Jekyll
rm -rf .git
git init -q
git add -A
git -c user.name="$(git -C .. config user.name)" \
    -c user.email="$(git -C .. config user.email)" \
    commit -qm "Deploy $(date -u +%FT%TZ)"
git push -f "https://${GH_TOKEN}@github.com/${REPO}.git" HEAD:gh-pages
rm -rf .git

echo "Deployed -> ${SITE}"
