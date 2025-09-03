#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-Schofield90/atlas-fitness-onboarding}"
BRANCH="${2:-main}"

# Requires: gh auth login (with repo admin), and GitHub has enabled the new branch protection CLI.
# Fallback is the REST API call below if your gh version lacks the command.

if gh help api >/dev/null 2>&1; then
  echo "Setting protection on $REPO@$BRANCH"
  gh api \
    -X PUT \
    -H "Accept: application/vnd.github+json" \
    "/repos/$REPO/branches/$BRANCH/protection" \
    -f required_status_checks.strict=true \
    -f required_status_checks.contexts[]="CI" \
    -F enforce_admins=true \
    -F required_pull_request_reviews.dismiss_stale_reviews=true \
    -F required_pull_request_reviews.required_approving_review_count=1 \
    -F restrictions=
  echo "Done. Verify in GitHub → Settings → Branches."
else
  echo "Please install/update GitHub CLI (gh)."
  exit 1
fi