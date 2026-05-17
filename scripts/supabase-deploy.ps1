# Первый деплой Supabase для SPARK (Windows PowerShell).
# Запуск из корня репозитория: .\scripts\supabase-deploy.ps1
# Требуется: Supabase CLI (scoop install supabase / npm i -g supabase)

$ErrorActionPreference = "Stop"
$ProjectRef = "ykmtewsfkgduvkmguasv"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Host "Supabase CLI не найден. Установите: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
  Write-Host "  scoop install supabase   или   npm install -g supabase"
  exit 1
}

if (-not (Test-Path ".env")) {
  Write-Host "Создайте .env из .env.example и заполните секреты (без коммита)." -ForegroundColor Yellow
  exit 1
}

Write-Host "==> supabase login (если ещё не вошли)"
supabase login

Write-Host "==> supabase link --project-ref $ProjectRef"
supabase link --project-ref $ProjectRef

Write-Host "==> supabase db push"
supabase db push

Write-Host "==> supabase secrets set (из .env)"
supabase secrets set --env-file .env

Write-Host "==> deploy edge functions"
supabase functions deploy register-send-code --no-verify-jwt
supabase functions deploy register-verify --no-verify-jwt

Write-Host "Готово. Проверьте регистрацию в приложении с реальным email." -ForegroundColor Green
