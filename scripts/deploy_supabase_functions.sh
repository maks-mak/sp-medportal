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

project_ref="pgifephtehfyfzgpbelu"
functions=(
  submit-registration
  submit-password-reset
  admin-registration
  admin-profile
  admin-reset-password
)

for fn in "${functions[@]}"; do
  echo "Deploying ${fn}..."
  .tools/supabase functions deploy "$fn" --project-ref "$project_ref" --use-api
  echo "Done ${fn}"
  echo
done

unset SUPABASE_ACCESS_TOKEN

echo "All functions deployed."
