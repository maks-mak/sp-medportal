#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

project_ref="pgifephtehfyfzgpbelu"
migration_name="sp_medportal_schema_hardening_$(date +%Y%m%d%H%M%S)"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  read -r -s -p "Вставь Supabase access token: " SUPABASE_ACCESS_TOKEN
  echo
  export SUPABASE_ACCESS_TOKEN
fi
trap 'unset SUPABASE_ACCESS_TOKEN' EXIT

MIGRATION_NAME="$migration_name" python3 - <<'PY' > /tmp/sp_medportal_schema_payload.json
from pathlib import Path
import json, os
payload = {
    "name": os.environ.get("MIGRATION_NAME", "sp_medportal_schema_hardening"),
    "query": Path("supabase/schema_v1.sql").read_text(),
}
print(json.dumps(payload, ensure_ascii=False))
PY

http_code=$(curl -sS -o /tmp/sp_medportal_schema_response.json -w "%{http_code}" \
  "https://api.supabase.com/v1/projects/${project_ref}/database/migrations" \
  --request POST \
  --header "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  --header "Content-Type: application/json" \
  --data-binary @/tmp/sp_medportal_schema_payload.json)

cat /tmp/sp_medportal_schema_response.json
printf '\nHTTP %s\n' "$http_code"

if [[ "$http_code" != 2* ]]; then
  exit 1
fi

printf 'Schema migration applied via Management API.\n'
