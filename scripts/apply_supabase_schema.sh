#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -x .tools/supabase ]]; then
  echo "Supabase CLI not found at .tools/supabase" >&2
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  read -r -s -p "Вставь Supabase access token: " SUPABASE_ACCESS_TOKEN
  echo
  export SUPABASE_ACCESS_TOKEN
fi

.tools/supabase db query --linked --file supabase/schema_v1.sql
unset SUPABASE_ACCESS_TOKEN

echo "Schema applied."
