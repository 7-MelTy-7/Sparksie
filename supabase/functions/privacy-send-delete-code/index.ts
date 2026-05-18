import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing auth header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const admin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    
    if (authError || !user || !user.email) {
      return json({ error: 'Invalid token or missing email' }, 401);
    }

    const email = user.email;

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any existing pending deletions for this email
    await admin.from('pending_deletions').delete().eq('email', email);

    // Insert new pending deletion
    const { error: dbError } = await admin.from('pending_deletions').insert({
      email,
      code,
      attempts: 0
    });

    if (dbError) {
      console.error('DB Error:', dbError);
      return json({ error: 'Failed to create request' }, 500);
    }

    // Send email
    const smtpClient = new SmtpClient();
    await smtpClient.connectTLS({
      hostname: Deno.env.get('SMTP_HOSTNAME') || '',
      port: parseInt(Deno.env.get('SMTP_PORT') || '465', 10),
      username: Deno.env.get('SMTP_USERNAME') || '',
      password: Deno.env.get('SMTP_PASSWORD') || '',
    });

    const fromAddress = Deno.env.get('SMTP_FROM') || 'SPARK <noreply@spark.app>';
    
    await smtpClient.send({
      from: fromAddress,
      to: email,
      subject: 'Код подтверждения для удаления аккаунта SPARK',
      content: `Вы запросили удаление вашего терминала (аккаунта) в SPARK.\n\nВаш 6-значный код подтверждения: ${code}\n\nЕсли это были не вы, срочно обновите пароль в настройках приватности.`,
      html: `<div style="font-family:sans-serif;color:#111;">
               <h2 style="color:#e25c5c;">КРИТИЧЕСКОЕ ДЕЙСТВИЕ</h2>
               <p>Вы запросили удаление вашего терминала (аккаунта) в SPARK.</p>
               <p>Ваш секретный код подтверждения:</p>
               <h3 style="font-size:24px;letter-spacing:4px;color:#e25c5c;">${code}</h3>
               <p>Если это были не вы, срочно обновите пароль в настройках приватности!</p>
             </div>`
    });

    await smtpClient.close();

    return json({ ok: true, message: 'Code sent successfully' });
  } catch (error: any) {
    console.error('send code error', error);
    return json({ error: 'Internal Server Error' }, 500);
  }
});
