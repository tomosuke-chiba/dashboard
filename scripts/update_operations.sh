#!/bin/bash
# OPERATIONS.md の環境情報を自動更新するスクリプト

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OPERATIONS_FILE="$PROJECT_ROOT/OPERATIONS.md"

if [ ! -f "$OPERATIONS_FILE" ]; then
  echo "Error: OPERATIONS.md not found at $OPERATIONS_FILE"
  exit 1
fi

# 環境情報を取得
NODE_VERSION=$(node -v 2>/dev/null || echo "not installed")
NPM_VERSION=$(npm -v 2>/dev/null || echo "not installed")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "not a git repo")
LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "no commits")
UPDATED_AT=$(date "+%Y-%m-%d %H:%M:%S")

# 新しい環境情報ブロック
NEW_ENV_BLOCK="<!-- AUTO-UPDATED-START -->
| Key | Value |
|-----|-------|
| Node | $NODE_VERSION |
| npm | $NPM_VERSION |
| Branch | $GIT_BRANCH |
| Last Commit | $LAST_COMMIT |
| Updated | $UPDATED_AT |
<!-- AUTO-UPDATED-END -->"

# macOS (BSD sed) と Linux (GNU sed) の両方に対応
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' '/<!-- AUTO-UPDATED-START -->/,/<!-- AUTO-UPDATED-END -->/c\
'"$(echo "$NEW_ENV_BLOCK" | sed 's/$/\\/' | sed '$ s/\\$//')"'
' "$OPERATIONS_FILE"
else
  # Linux
  sed -i '/<!-- AUTO-UPDATED-START -->/,/<!-- AUTO-UPDATED-END -->/c\'"$NEW_ENV_BLOCK" "$OPERATIONS_FILE"
fi

echo "✓ OPERATIONS.md updated"
echo "  Node: $NODE_VERSION"
echo "  Branch: $GIT_BRANCH"
echo "  Commit: $LAST_COMMIT"
