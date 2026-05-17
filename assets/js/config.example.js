/**

 * Шаблон конфигурации клиента SPARK.

 *

 * Настройка (один шаг):

 * 1. Скопируйте этот файл: assets/js/config.example.js → assets/js/config.js

 * 2. Укажите URL проекта и anon-ключ: Supabase Dashboard → Project Settings → API

 *

 * Никогда не помещайте SUPABASE_SERVICE_ROLE_KEY и RESEND_API_KEY в браузер —

 * только в секреты Edge Functions (см. .env.example и DEPLOYMENT_REQUIREMENTS.md).

 */

window.SPARK_CONFIG = {

  // Базовый URL Supabase (REST / Auth / Edge Functions)

  SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',



  // Anon (публичный) ключ — безопасен для браузера; не service_role

  SUPABASE_ANON_KEY: 'YOUR_ANON_KEY_HERE',



  // Устаревший путь инвестиций, если RPC invest_in_idea ещё не применён (в проде — false)

  ALLOW_LEGACY_INVEST_FALLBACK: true,



  // Телеметрия в public.client_events (нужна миграция 20260508_client_events_optional.sql)

  ENABLE_CLIENT_TELEMETRY: false

};

