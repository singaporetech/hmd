#!/bin/sh

# Check if a title was provided
if [ -z "$1" ]; then
  echo "Usage: $0 \"Your PR title here\""
  exit 1
fi

PR_TITLE="$1"

# Create and immediately merge the PR
gh pr create \
  --title "$PR_TITLE" \
  --body "" \
  --base main \
  --fill

gh pr merge --admin --merge
