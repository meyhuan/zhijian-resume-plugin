#!/bin/sh
set -eu

plugin_dir=$(CDPATH= cd "$(dirname "$0")/.." && pwd)

# Desktop apps can have a shorter PATH than the user's interactive shell.
for node_path in "${CODEX_MCP_NODE_PATH:-}" "$(command -v node || true)" /opt/homebrew/bin/node /usr/local/bin/node; do
  if [ -n "$node_path" ] && [ -x "$node_path" ] &&
    "$node_path" -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)' </dev/null >/dev/null 2>&1; then
    exec "$node_path" "$plugin_dir/dist/cli.cjs"
  fi
done

printf '%s\n' '智简简历需要 Node.js 22.13+。请安装 Node.js 后重新启动桌面客户端。' >&2
exit 127
