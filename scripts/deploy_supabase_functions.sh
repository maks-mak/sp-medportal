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
trap 'unset SUPABASE_ACCESS_TOKEN' EXIT

project_ref="pgifephtehfyfzgpbelu"
if [[ "$#" -gt 0 ]]; then
  functions=("$@")
else
  functions=(
    submit-registration
    submit-password-reset
    admin-registration
    admin-profile
    admin-reset-password
    portal-links
  )
fi

for fn in "${functions[@]}"; do
  echo "Deploying ${fn}..."
  .tools/supabase functions deploy "$fn" --project-ref "$project_ref" --use-api
  echo "Done ${fn}"
  echo
done

echo "All functions deployed."
