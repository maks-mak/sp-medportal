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
trap 'unset SUPABASE_ACCESS_TOKEN PORTAL_DOCUMENTS_URL PORTAL_QUALITY_WORKBOOK_URL PORTAL_ADVERSE_EVENT_URL' EXIT

read -r -p "Ссылка на реестр документов: " PORTAL_DOCUMENTS_URL
read -r -p "Ссылка на реестр ОКК и БМД: " PORTAL_QUALITY_WORKBOOK_URL
read -r -p "Ссылка на форму подачи НС: " PORTAL_ADVERSE_EVENT_URL

.tools/supabase secrets set \
  --project-ref pgifephtehfyfzgpbelu \
  "PORTAL_DOCUMENTS_URL=${PORTAL_DOCUMENTS_URL}" \
  "PORTAL_QUALITY_WORKBOOK_URL=${PORTAL_QUALITY_WORKBOOK_URL}" \
  "PORTAL_ADVERSE_EVENT_URL=${PORTAL_ADVERSE_EVENT_URL}"

echo "Portal link secrets saved."
