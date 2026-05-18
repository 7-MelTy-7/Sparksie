/**
 * Мягкая обработка ошибок опциональных и внешних интеграций.
 */
function integrationMessage(feature) {
  var key = 'integration_' + feature;
  if (typeof T === 'function') {
    var msg = T(key);
    if (msg && msg !== key) return msg;
  }
  var fallback = {
    auth: 'Sign-in and registration are unavailable. Check Supabase configuration.',
    database: 'Live data is unavailable. You can still browse demo content.',
    realtime: 'Live updates are temporarily unavailable.',
    invest: 'Investing is temporarily unavailable.',
    publish: 'Publishing is temporarily unavailable.',
    registration: 'Email verification is temporarily unavailable. Try again later.'
  };
  return fallback[feature] || 'This feature is temporarily unavailable.';
}

function isAuthError(err) {
  if (!err) return false;
  var status = err.status || err.statusCode;
  if (status === 401 || status === 403) return true;
  var msg = String(err.message || err).toLowerCase();
  return msg.indexOf('invalid api key') !== -1 || msg.indexOf('jwt') !== -1;
}

function registrationErrorMessage(result) {
  if (!result) return integrationMessage('registration');
  if (result.error && !result.status) {
    return typeof T === 'function' ? T('reg_err_network') : 'Network error. Check your connection.';
  }
  var status = result.status;
  var msg = (result.body && result.body.message) || (result.error && result.error.message) || '';
  if (status === 404) {
    return typeof T === 'function' ? T('reg_err_functions') : integrationMessage('registration');
  }
  if (
    status === 503 ||
    msg.indexOf('Email delivery') !== -1 ||
    msg.indexOf('verification email') !== -1
  ) {
    return typeof T === 'function' ? T('reg_err_email') : msg || integrationMessage('registration');
  }
  if (
    status === 500 &&
    (msg.indexOf('Could not start') !== -1 || msg.indexOf('Server configuration') !== -1)
  ) {
    return typeof T === 'function' ? T('reg_err_migration') : msg;
  }
  if (status === 400 && msg.indexOf('Invalid registration') !== -1) {
    return typeof T === 'function' ? T('reg_err_invalid') : msg;
  }
  if (status === 429) {
    return typeof T === 'function' ? T('reg_err_rate_limit') : msg;
  }
  if (msg) return msg;
  return integrationMessage('registration');
}

function featureToast(feature, err, color) {
  var msg = integrationMessage(feature);
  if (err && isAuthError(err)) {
    msg = integrationMessage('auth');
  }
  if (typeof toast === 'function') {
    toast(msg, color || 'var(--red)');
  } else {
    console.warn('[integration]', feature, err || '');
  }
  return msg;
}

async function safeSupabaseCall(feature, fn, options) {
  options = options || {};
  if (!supa && !options.allowDemo) {
    if (!options.silent) featureToast(feature);
    return { ok: false, error: new Error('supabase_unavailable'), demo: true };
  }
  try {
    var result = await fn();
    if (result && result.error) {
      if (!options.silent) featureToast(feature, result.error);
      return { ok: false, error: result.error, data: result.data };
    }
    return { ok: true, data: result };
  } catch (e) {
    if (!options.silent) featureToast(feature, e);
    return { ok: false, error: e };
  }
}

async function callEdgeFunction(name, body) {
  if (!supa || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: new Error('supabase_unavailable') };
  }
  var url = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/' + name;
  var token = SUPABASE_ANON_KEY;
  try {
    var { data: { session } } = await supa.auth.getSession();
    if (session && session.access_token) token = session.access_token;
  } catch (e) {}
  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        apikey: SUPABASE_ANON_KEY
      },
      body: JSON.stringify(body || {})
    });
    var json = {};
    try {
      json = await res.json();
    } catch (parseErr) {
      json = { message: 'Invalid server response' };
    }
    if (!res.ok) {
      return { ok: false, error: new Error(json.message || json.error || 'request_failed'), status: res.status, body: json };
    }
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: e };
  }
}
