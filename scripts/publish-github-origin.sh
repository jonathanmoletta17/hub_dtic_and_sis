#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ORIGIN_URL="git@github.com:jonathanmoletta17/hub-operacional-web.git"
SSH_KEY="${HOME}/.ssh/id_ed25519_github_hub_operacional"
BACKUP_BRANCH="codex/backup-consolidate-hub-worktree-2026-05-04"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Missing SSH key: $SSH_KEY" >&2
  exit 1
fi

if [[ -n "$(git status --short)" ]]; then
  echo "Worktree is dirty. Commit or stash changes before publishing." >&2
  git status --short
  exit 1
fi

git remote set-url origin "$ORIGIN_URL"
git config core.sshCommand "ssh -i $SSH_KEY -o IdentitiesOnly=yes"

echo "Checking GitHub SSH authentication..."
ssh_output="$(ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -T git@github.com 2>&1 || true)"
echo "$ssh_output"
if [[ "$ssh_output" != *"successfully authenticated"* ]]; then
  echo "GitHub SSH authentication failed. Add the public key to the GitHub account first." >&2
  exit 1
fi

echo "Checking repository availability: $ORIGIN_URL"
if ! git ls-remote --heads origin >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Repository is not available yet.

Create an empty GitHub repository first:
  owner: jonathanmoletta17
  name:  hub-operacional-web

Then rerun:
  scripts/publish-github-origin.sh
EOF
  exit 1
fi

echo "Publishing main..."
git push -u origin main

if git show-ref --verify --quiet "refs/heads/${BACKUP_BRANCH}"; then
  echo "Publishing backup branch..."
  git push origin "$BACKUP_BRANCH"
else
  echo "Backup branch not found locally: $BACKUP_BRANCH" >&2
fi

echo "Published successfully."
