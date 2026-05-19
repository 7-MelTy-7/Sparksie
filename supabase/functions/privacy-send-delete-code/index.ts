import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function deleteEmailHtml(code: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d1118;color:#e8e8f0;padding:32px;border-radius:12px;border:1px solid #2a2a3a;">
      <h2 style="color:#e25c5c;letter-spacing:2px;margin:0 0 16px">⚠️ КРИТИЧЕСКОЕ ДЕЙСТВИЕ</h2>
      <p style="color:#a0a0b0;margin:0 0 12px">Вы запросили <strong style="color:#e8e8f0">удаление аккаунта</strong> на платформе SPARK.</p>
      <p style="color:#a0a0b0;margin:0 0 20px">Ваш код подтверждения:</p>
      <div style="background:#1a1a2e;border:1px solid #e25c5c;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px;">
        <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#e25c5c;">${code}</span>
      </div>
      <p style="color:#626270;font-size:13px;margin:0">Код действителен 15 минут. Если это были не вы — срочно смените пароль в настройках приватности.</p>
    </div>`;
}

const DELETE_EMAIL_SUBJECT = 'Код подтверждения удаления аккаунта SPARK';

function parseFromAddress(raw: string): { name: string; email: string } {
  const match = raw.trim().match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: 'SPARK', email: raw.trim() };
}

async function sendViaResend(to: string, code: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return false;

  const from = Deno.env.get('RESEND_FROM_EMAIL') || 'SPARK <onboarding@resend.dev>';
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: DELETE_EMAIL_SUBJECT, html: deleteEmailHtml(code) }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const err = await res.text();
      console.error('[privacy-send-delete-code] Resend error', res.status, err);
      throw new Error('email_delivery_failed');
    }
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function sendViaBrevo(to: string, code: string): Promise<boolean> {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) return false;

  const fromRaw =
    Deno.env.get('BREVO_FROM_EMAIL') ||
    Deno.env.get('SMTP_FROM') ||
    Deno.env.get('RESEND_FROM_EMAIL') ||
    'SPARK <noreply@example.com>';
  const from = parseFromAddress(fromRaw);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: [{ email: to }],
        subject: DELETE_EMAIL_SUBJECT,
        htmlContent: deleteEmailHtml(code),
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.text();
      console.error('[privacy-send-delete-code] Brevo error', res.status, err);
      throw new Error('email_delivery_failed');
    }
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function smtpConfigured(): boolean {
  return Boolean(Deno.env.get('GMAIL_SCRIPT_URL'));
}

async function sendViaSmtp(to: string, code: string): Promise<boolean> {
  const scriptUrl = Deno.env.get('GMAIL_SCRIPT_URL');
  if (!scriptUrl) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject: DELETE_EMAIL_SUBJECT,
        html: deleteEmailHtml(code),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.error('[privacy-send-delete-code] Gmail Script error:', res.status, errText);
      throw new Error('gmail_script_failed');
    }

    const data = await res.json();
    return Boolean(data && data.ok);
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[privacy-send-delete-code] Gmail Script fetch failed:', err);
    throw err;
  }
}

async function sendDeleteCode(to: string, code: string): Promise<boolean> {
  const hasSmtp = smtpConfigured();
  const hasResend = Boolean(Deno.env.get('RESEND_API_KEY'));
  const hasBrevo = Boolean(Deno.env.get('BREVO_API_KEY'));

  if (!hasResend && !hasBrevo && !hasSmtp) {
    console.warn('[privacy-send-delete-code] no email provider configured');
    return false;
  }

  let lastError: unknown = null;

  if (hasSmtp) {
    try {
      if (await sendViaSmtp(to, code)) return true;
    } catch (e) {
      lastError = e;
      console.error('[privacy-send-delete-code] SMTP failed', e);
    }
  }
  if (hasResend) {
    try {
      if (await sendViaResend(to, code)) return true;
    } catch (e) {
      lastError = e;
    }
  }
  if (hasBrevo) {
    try {
      if (await sendViaBrevo(to, code)) return true;
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError) throw lastError;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server configuration error' }, 500);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing auth header' }, 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data, error: authError } = await admin.auth.getUser(token);
  const user = data?.user;

  if (authError || !user || !user.email) {
    return json({ error: 'Invalid token or missing email' }, 401);
  }

  const email = user.email;

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Upsert pending deletion (replace any existing)
  const { error: dbError } = await admin.from('pending_deletions').upsert({
    email,
    code,
    attempts: 0,
    expires_at: expiresAt,
  }, { onConflict: 'email' });

  if (dbError) {
    console.error('[privacy-send-delete-code] DB error:', dbError.message);
    return json({ error: 'Failed to create deletion request. DB Error: ' + dbError.message }, 500);
  }

  try {
    const sent = await sendDeleteCode(email, code);
    if (!sent) {
      const allowDev = Deno.env.get('ALLOW_DEV_REGISTRATION_CODES') === 'true';
      if (allowDev) {
        return json({ ok: true, message: 'Code created (no email provider)', dev_code: code });
      }
      return json({ error: 'Email delivery is not configured' }, 503);
    }
  } catch (e: any) {
    console.error('[privacy-send-delete-code] send error:', e?.message || e);
    return json({ error: 'Failed to send confirmation email' }, 503);
  }

  return json({ ok: true, message: 'Confirmation code sent to your email' });
});
