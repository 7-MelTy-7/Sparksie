-- Таблица для временного хранения кодов подтверждения при удалении аккаунта
CREATE TABLE IF NOT EXISTS public.pending_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS (но так как доступ только через Service Role, политики не требуются)
ALTER TABLE public.pending_deletions ENABLE ROW LEVEL SECURITY;

-- Периодическая очистка устаревших записей (например, старше 1 часа)
-- (здесь мы просто полагаемся на логику Edge Function или cron-джоб)
