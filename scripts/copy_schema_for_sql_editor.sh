#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if command -v pbcopy >/dev/null 2>&1; then
  pbcopy < supabase/schema_v1.sql
  echo "SQL copied to clipboard."
else
  echo "pbcopy not found. Open supabase/schema_v1.sql and copy it manually." >&2
  exit 1
fi

open "https://supabase.com/dashboard/project/pgifephtehfyfzgpbelu/sql/new" >/dev/null 2>&1 || true

echo "SQL Editor opened. Paste with Cmd+V and click Run."
