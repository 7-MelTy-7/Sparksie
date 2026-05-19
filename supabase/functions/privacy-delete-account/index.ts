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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server configuration error' }, 500);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing auth header' }, 401);

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const code = String(body.code || '').trim();
  if (!code) return json({ error: 'Code is required' }, 400);

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

  const { data: pending, error: fetchError } = await admin
    .from('pending_deletions')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (fetchError || !pending) {
    return json({ error: 'No pending deletion found. Please request a new code.' }, 404);
  }

  // Check TTL (expires_at column — added in updated send function)
  if (pending.expires_at && new Date(pending.expires_at).getTime() < Date.now()) {
    await admin.from('pending_deletions').delete().eq('email', email);
    return json({ error: 'Code has expired. Please request a new one.' }, 400);
  }

  // Check attempt limit
  if (pending.attempts >= 5) {
    await admin.from('pending_deletions').delete().eq('email', email);
    return json({ error: 'Too many failed attempts. Please request a new code.' }, 429);
  }

  // Validate code
  if (pending.code !== code) {
    await admin
      .from('pending_deletions')
      .update({ attempts: (pending.attempts || 0) + 1 })
      .eq('email', email);
    return json({ error: 'Invalid code' }, 400);
  }

  // Code is valid — delete the user account
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('[privacy-delete-account] deleteUser error:', deleteError.message);
    return json({ error: 'Failed to delete account. Please try again.' }, 500);
  }

  // Clean up pending deletion record
  await admin.from('pending_deletions').delete().eq('email', email);

  return json({ ok: true, message: 'Account successfully deleted' });
});
