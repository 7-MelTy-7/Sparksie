import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

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

    const body = await req.json().catch(() => ({}));
    const { code } = body;
    if (!code) return json({ error: 'Code is required' }, 400);

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

    const { data: pending, error: dbError } = await admin
      .from('pending_deletions')
      .select('*')
      .eq('email', email)
      .single();

    if (dbError || !pending) {
      return json({ error: 'No pending deletion found or expired' }, 404);
    }

    if (pending.attempts >= 5) {
      await admin.from('pending_deletions').delete().eq('email', email);
      return json({ error: 'Too many failed attempts. Request a new code.' }, 400);
    }

    if (pending.code !== code.toString().trim()) {
      await admin.from('pending_deletions').update({ attempts: pending.attempts + 1 }).eq('email', email);
      return json({ error: 'Invalid code' }, 400);
    }

    // Code is valid! Delete the user
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('delete user error:', deleteError);
      return json({ error: 'Failed to delete user' }, 500);
    }

    // Clean up
    await admin.from('pending_deletions').delete().eq('email', email);

    return json({ ok: true, message: 'Account successfully deleted' });
  } catch (error: any) {
    console.error('delete account error', error);
    return json({ error: 'Internal Server Error' }, 500);
  }
});
