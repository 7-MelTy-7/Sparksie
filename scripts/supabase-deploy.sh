#!/usr/bin/env bash
# Первый деплой Supabase для SPARK. Запуск из папки SPARK: ./scripts/supabase-deploy.sh
set -euo pipefail
PROJECT_REF="ykmtewsfkgduvkmguasv"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI не найден: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Создайте .env из .env.example"
  exit 1
fi

supabase login
supabase link --project-ref "$PROJECT_REF"
supabase db push
supabase secrets set --env-file .env
supabase functions deploy register-send-code --no-verify-jwt
supabase functions deploy register-verify --no-verify-jwt

echo "Готово."
