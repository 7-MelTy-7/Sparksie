# Требования к развёртыванию SPARK

## Настройка для разработчика

1. **Фронтенд (браузер):** скопируйте `assets/js/config.example.js` → `assets/js/config.js`, укажите `SUPABASE_URL` и `SUPABASE_ANON_KEY` (publishable).
2. **Edge Functions:** скопируйте `.env.example` → `.env`, заполните секреты, выполните деплой (см. «Первый деплой Supabase»).
3. **Не коммитьте** `.env`, `config.js`, service role и API-ключи почты.

---

## Первый деплой Supabase (новый проект)

**Project ref:** `ppehttbtrlavnrytoweu`  
**URL:** `https://ppehttbtrlavnrytoweu.supabase.co`

### 1. Установить CLI

- Windows: `scoop install supabase` или `npm install -g supabase`
- Документация: https://supabase.com/docs/guides/cli

### 2. Миграции БД

В репозитории три миграции (применять все):

| Файл | Назначение |
|------|------------|
| `20260508_secure_invest_rpc.sql` | Безопасный RPC инвестиций |
| `20260508_client_events_optional.sql` | Опциональная телеметрия |
| `20260516_pending_registrations.sql` | Регистрация по 6-значному коду |

```bash
cd SPARK
supabase login
supabase link --project-ref ppehttbtrlavnrytoweu
supabase db push
```

### 3. Секреты edge functions

Скопируйте `.env.example` → `.env` и заполните минимум:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — Dashboard → **Project Settings** → **API** → **service_role** (secret)
- `REGISTRATION_PEPPER` — длинная случайная строка
- **Один из способов почты** (см. ниже): `BREVO_API_KEY` или SMTP-переменные

```bash
supabase secrets set --env-file .env
```

Или по одному:

```bash
supabase secrets set SUPABASE_URL=https://ppehttbtrlavnrytoweu.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set REGISTRATION_PEPPER=...
supabase secrets set BREVO_API_KEY=...
supabase secrets set BREVO_FROM_EMAIL="SPARK <noreply@yourdomain.com>"
```

### 4. Деплой функций

```bash
supabase functions deploy register-send-code --no-verify-jwt
supabase functions deploy register-verify --no-verify-jwt
```

Автоматически (Windows): `.\scripts\supabase-deploy.ps1` из папки `SPARK` (нужны CLI и файл `.env`).

### 5. Локальная отладка функций (опционально)

```bash
supabase functions serve register-send-code register-verify --env-file .env
```

---

## Регистрация: реальная почта без Resend

Поток: фронт → `register-send-code` (код в БД + письмо) → пользователь вводит код → `register-verify` (создание `auth.users` + `profiles`).

**Встроенная почта Supabase Auth** (подтверждение signUp) в этом потоке **не используется** — код свой, отправка из edge function.

### Рекомендуемый путь: Brevo (HTTP API)

Resend не обязателен. Brevo часто доступен, когда resend.com недоступен.

1. Регистрация на https://www.brevo.com  
2. **SMTP & API** → **API Keys** → создать ключ v3  
3. **Senders** → добавить и подтвердить адрес отправителя (`noreply@ваш-домен` или тестовый)  
4. В `.env` / secrets:

   ```
   BREVO_API_KEY=xkeysib-...
   BREVO_FROM_EMAIL=SPARK <noreply@yourdomain.com>
   ```

5. Передеплой: `supabase functions deploy register-send-code --no-verify-jwt`

Друзья на других устройствах получают письмо с 6-значным кодом; **`dev_code` в ответе API не возвращается** (если `ALLOW_DEV_REGISTRATION_CODES=false`).

### Альтернатива: SMTP в секретах функции

Те же учётные данные, что у провайдера для SMTP (можно совпасть с настройкой Auth в Dashboard):

| Переменная | Пример (Brevo SMTP) |
|------------|---------------------|
| `SMTP_HOSTNAME` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` или `2525` |
| `SMTP_SECURE` | `false` |
| `SMTP_USERNAME` | логин SMTP из Brevo |
| `SMTP_PASSWORD` | SMTP-ключ |
| `SMTP_FROM` | `SPARK <noreply@yourdomain.com>` |

**Ограничение:** на Supabase Edge Functions порты **25 / 465 / 587** могут быть заблокированы. Если SMTP падает с таймаутом — используйте **Brevo API** (`BREVO_API_KEY`) или порт **2525**, если провайдер поддерживает.

### Dashboard → Auth → SMTP (справка)

Путь: **Supabase Dashboard** → ваш проект → **Authentication** → **SMTP Settings** → включить **Custom SMTP**.

Это настраивает письма **Auth** (сброс пароля, magic link и т.д.), но **не подменяет** отправку кода регистрации из `register-send-code`. Для единого провайдера скопируйте host/user/password в секреты edge function (`SMTP_*` или `BREVO_API_KEY`).

### Порядок провайдеров в коде

1. Resend (`RESEND_API_KEY`) — если позже появится доступ  
2. Brevo API (`BREVO_API_KEY`)  
3. SMTP (`SMTP_HOSTNAME`, …)

### Режим разработки (не для друзей)

`ALLOW_DEV_REGISTRATION_CODES=true` — код в JSON (`dev_code`) и toast. **Только локально.** В проде: `false` или не задавать.

---

## Обязательно для безопасного режима инвестиций

1. Примените `supabase/migrations/20260508_secure_invest_rpc.sql`.
2. Убедитесь, что аутентифицированные пользователи могут вызывать `public.invest_in_idea`.
3. В проде после проверки миграции установите `ALLOW_LEGACY_INVEST_FALLBACK: false` в `config.js`.

## Опционально (рекомендуется)

1. Миграция `20260508_client_events_optional.sql` — телеметрия на клиенте.
2. `ENABLE_CLIENT_TELEMETRY: true` в `config.js` только после создания таблицы.

## Режим совместимости без миграции

Если RPC `invest_in_idea` недоступен и включён `ALLOW_LEGACY_INVEST_FALLBACK`:

- одноразовое предупреждение в UI;
- инвестиции через устаревший путь обновления баланса;
- приложение не падает.

## Значения по умолчанию

- `ALLOW_LEGACY_INVEST_FALLBACK` — `true` (чтобы не ломать запуск без миграции).
- `ENABLE_CLIENT_TELEMETRY` — `false` (чтобы не падать без таблицы).

## Проверка регистрации

1. `supabase db push` выполнен без ошибок.
2. Секреты заданы, функции задеплоены.
3. В приложении: регистрация → письмо с кодом → ввод кода → вход.
4. Dashboard → **Edge Functions** → **register-send-code** → **Logs** — нет `no email provider configured`.

## Ограничения до подключения Resend

| Тема | Статус |
|------|--------|
| Resend | Опционально; при появлении ключа достаточно `RESEND_API_KEY` + redeploy |
| Бесплатная почта Supabase без Custom SMTP | Только на email команды проекта — **не** для друзей |
| `dev_code` в API | Только при `ALLOW_DEV_REGISTRATION_CODES=true` |
| Подтверждённый отправитель | Обязателен у Brevo/SMTP-провайдера |
| CLI на машине пользователя | Если CLI не установлен — выполнить команды из раздела «Первый деплой» вручную |
