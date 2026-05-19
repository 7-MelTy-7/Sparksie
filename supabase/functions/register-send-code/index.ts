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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function verificationEmailHtml(code: string) {
  return `<p>Your SPARK verification code is <strong>${code}</strong>.</p><p>It expires in 15 minutes.</p>`;
}

const VERIFICATION_SUBJECT = 'Your SPARK verification code';

async function checkRateLimit(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  maxHits: number,
  windowMinutes: number
) {
  const now = new Date();
  const { data } = await admin
    .from('registration_rate_limits')
    .select('hit_count, window_start')
    .eq('bucket_key', bucket)
    .maybeSingle();

  if (!data) {
    await admin.from('registration_rate_limits').upsert({
      bucket_key: bucket,
      hit_count: 1,
      window_start: now.toISOString(),
    });
    return false;
  }

  const windowStart = new Date(data.window_start);
  const elapsedMin = (now.getTime() - windowStart.getTime()) / 60000;
  if (elapsedMin > windowMinutes) {
    await admin.from('registration_rate_limits').upsert({
      bucket_key: bucket,
      hit_count: 1,
      window_start: now.toISOString(),
    });
    return false;
  }

  if (data.hit_count >= maxHits) return true;

  await admin
    .from('registration_rate_limits')
    .update({ hit_count: data.hit_count + 1 })
    .eq('bucket_key', bucket);
  return false;
}

function parseFromAddress(raw: string): { name: string; email: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: 'SPARK', email: trimmed };
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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: VERIFICATION_SUBJECT,
        html: verificationEmailHtml(code),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.error('[register-send-code] Resend error', res.status, errText);
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
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: [{ email: to }],
        subject: VERIFICATION_SUBJECT,
        htmlContent: verificationEmailHtml(code),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.error('[register-send-code] Brevo error', res.status, errText);
      throw new Error('email_delivery_failed');
    }
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function smtpConfigured(): boolean {
  return false;
}

async function sendViaSmtp(to: string, code: string): Promise<boolean> {
  return false;
}

async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const hasResend = Boolean(Deno.env.get('RESEND_API_KEY'));
  const hasBrevo = Boolean(Deno.env.get('BREVO_API_KEY'));
  const hasSmtp = smtpConfigured();

  if (!hasResend && !hasBrevo && !hasSmtp) {
    console.log('[register-send-code] no email provider configured');
    return false;
  }

  let lastError: unknown = null;

  if (hasResend) {
    try {
      if (await sendViaResend(to, code)) return true;
    } catch (e) {
      lastError = e;
      console.error('[register-send-code] Resend failed', e);
    }
  }
  if (hasBrevo) {
    try {
      if (await sendViaBrevo(to, code)) return true;
    } catch (e) {
      lastError = e;
      console.error('[register-send-code] Brevo failed', e);
    }
  }
  if (hasSmtp) {
    try {
      if (await sendViaSmtp(to, code)) return true;
    } catch (e) {
      lastError = e;
      console.error('[register-send-code] SMTP failed', e);
    }
  }

  if (lastError) throw lastError;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ message: 'Server configuration error' }, 500);
  }

  let payload: { email?: string; password?: string; nickname?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ message: 'Invalid request' }, 400);
  }

  const email = normalizeEmail(payload.email || '');
  const password = payload.password || '';
  const nickname = (payload.nickname || '').trim().replace(/^@/, '');

  if (!isValidEmail(email) || password.length < 8 || !nickname || nickname.length > 30) {
    return json({ message: 'Invalid registration details' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  
  // Параллельный запрос к БД для экономии времени
  const [emailLimited, ipLimited] = await Promise.all([
    checkRateLimit(admin, `email:${email}`, 5, 15),
    checkRateLimit(admin, `ip:${ip}`, 100, 60)
  ]);
  
  if (emailLimited || ipLimited) {
    return json({
      message: 'Слишком много попыток. Пожалуйста, подождите немного перед следующей отправкой.',
    }, 429);
  }

  const code = randomCode();
  const codeHash = await sha256(code + ':' + email);
  const pepper = Deno.env.get('REGISTRATION_PEPPER') || 'spark';
  const passwordHash = await sha256(password + ':' + pepper);

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: upsertError } = await admin.from('pending_registrations').upsert({
    email,
    password_hash: passwordHash,
    username: '@' + nickname,
    code_hash: codeHash,
    expires_at: expiresAt,
    attempts: 0,
    last_sent_at: new Date().toISOString(),
  });
  if (upsertError) {
    console.error('[register-send-code] upsert', upsertError.message);
    return json({ message: 'Could not start registration' }, 500);
  }

  const allowDev = Deno.env.get('ALLOW_DEV_REGISTRATION_CODES') === 'true';
  let emailSent = false;
  try {
    emailSent = await sendVerificationEmail(email, code);
  } catch (e) {
    console.error('[register-send-code] send', e);
    if (!allowDev) {
      return json({ message: 'Could not send verification email' }, 503);
    }
  }

  if (!emailSent && !allowDev) {
    console.error('[register-send-code] no email provider and dev codes disabled');
    return json({ message: 'Email delivery is not configured' }, 503);
  }

  return json({
    ok: true,
    message: 'If this email can be registered, a verification code was sent.',
    ...(allowDev ? { dev_code: code } : {}),
  });
});
