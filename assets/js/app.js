document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-auth-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchAuth(btn.dataset.authTab);
    });
  });
  var btnSI = document.getElementById('btnSI');
  if (btnSI) btnSI.addEventListener('click', doSignIn);
  var btnSU = document.getElementById('btnSU');
  if (btnSU) btnSU.addEventListener('click', doSignUp);
  var btnSUVerify = document.getElementById('btnSUVerify');
  if (btnSUVerify) btnSUVerify.addEventListener('click', doVerifyRegistration);
  var btnSUResend = document.getElementById('btnSUResend');
  if (btnSUResend) btnSUResend.addEventListener('click', resendRegistrationCode);
  var btnSUBack = document.getElementById('btnSUBack');
  if (btnSUBack) btnSUBack.addEventListener('click', backToRegistrationForm);
  var vmConfirmBtn = document.getElementById('vmConfirmBtn');
  if (vmConfirmBtn) vmConfirmBtn.addEventListener('click', checkEmailVerified);
  var vmResendBtn = document.getElementById('vmResendBtn');
  if (vmResendBtn) vmResendBtn.addEventListener('click', resendVerification);
  var btnProfDesk = document.getElementById('btnProfDesk');
  if (btnProfDesk) btnProfDesk.addEventListener('click', toggleDeskProf);
  var btnPostIdea = document.getElementById('btnPostIdea');
  if (btnPostIdea) btnPostIdea.addEventListener('click', openCreate);
  var dpOverlay = document.getElementById('dpOverlay');
  if (dpOverlay) dpOverlay.addEventListener('click', bgCloseDesk);
  var moCreate = document.getElementById('moCreate');
  if (moCreate) {
    moCreate.addEventListener('click', function (event) {
      if (event.target === moCreate) closeMo('moCreate');
    });
  }
  var moInvest = document.getElementById('moInvest');
  if (moInvest) {
    moInvest.addEventListener('click', function (event) {
      if (event.target === moInvest) closeMo('moInvest');
    });
  }
  document.querySelectorAll('.mob-tab[data-panel]').forEach(function (tabBtn) {
    tabBtn.addEventListener('click', function () {
      openPanel(tabBtn.dataset.panel);
    });
  });
  document.querySelectorAll('.chat-tab-btn[data-chat-tab]').forEach(function (chatBtn) {
    chatBtn.addEventListener('click', function () {
      switchChatTab(chatBtn.dataset.chatTab);
    });
  });
  document.querySelectorAll('[data-sort]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('[data-sort]').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      sort = b.dataset.sort;
      page = 1;
      renderFeed();
    });
  });

  document.querySelectorAll('[data-tag]').forEach(function (c) {
    c.addEventListener('click', function () {
      document.querySelectorAll('[data-tag]').forEach(function (x) { x.classList.remove('active'); });
      c.classList.add('active');
      ftag = c.dataset.tag;
      page = 1;
      renderFeed();
    });
  });

  var srchEl = document.getElementById('srchIn');
  if (srchEl) srchEl.addEventListener('input', function (e) {
    q = e.target.value.toLowerCase().trim();
    page = 1;
    renderFeed();
  });

  var durGrid = document.getElementById('durGrid');
  if (durGrid) durGrid.addEventListener('click', function (e) {
    var b = e.target.closest('.dur-btn');
    if (!b || b.classList.contains('locked')) return;
    document.querySelectorAll('.dur-btn:not(.locked)').forEach(function (x) { x.classList.remove('sel'); });
    b.classList.add('sel');
    selDur = b.dataset.dur;
  });

  document.addEventListener('click', function () {
    document.querySelectorAll('.lang-dd').forEach(function (d) { d.classList.remove('open'); });
  });
  var cardsList = document.getElementById('cardsList');
  if (cardsList) {
    cardsList.addEventListener('click', function (event) {
      var investBtn = event.target.closest('[data-invest-id]');
      if (investBtn) {
        openInvest(parseInt(investBtn.dataset.investId, 10));
        return;
      }
      var reactBtn = event.target.closest('.rbbl[data-id][data-e]');
      if (reactBtn) {
        react(parseInt(reactBtn.dataset.id, 10), reactBtn.dataset.e, reactBtn);
      }
    });
  }
  var invPresets = document.getElementById('invPresets');
  if (invPresets) {
    invPresets.addEventListener('click', function (event) {
      var presetBtn = event.target.closest('[data-set-amt]');
      if (!presetBtn || presetBtn.disabled) return;
      setAmt(parseInt(presetBtn.dataset.setAmt, 10));
    });
  }
  ['dpPanel', 'mobProfInner'].forEach(function (containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('click', function (event) {
      var langOpt = event.target.closest('[data-set-lang]');
      if (langOpt) {
        setLang(langOpt.dataset.setLang, event);
        return;
      }
      var ddToggle = event.target.closest('[data-dd-id]');
      if (ddToggle) {
        toggleDD(event, ddToggle.dataset.ddId);
        return;
      }
      var pulseBtn = event.target.closest('[data-pulse]');
      if (pulseBtn) {
        pulse(pulseBtn);
        return;
      }
      var logoutBtn = event.target.closest('[data-logout]');
      if (logoutBtn) doLogout();
    });
  });
  initObservatory();

  bootApp();
});

function escapeHTML(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeCssBackground(value) {
  var raw = String(value || '').trim();
  if (!raw) return 'linear-gradient(135deg,#e8c55a,#5ae8c5)';
  var safeGradient = /^linear-gradient\([#(),.%\sa-zA-Z0-9-]+\)$/;
  var safeHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  if (safeGradient.test(raw) || safeHex.test(raw)) return raw;
  return 'linear-gradient(135deg,#e8c55a,#5ae8c5)';
}

function safeAvatar(value) {
  var text = String(value || '').trim();
  if (!text) return '?';
  return escapeHTML(text.charAt(0).toUpperCase());
}

function clampAmount(raw, min, max) {
  var n = Number(raw);
  if (!Number.isFinite(n)) return min;
  var normalized = Math.floor(n);
  if (normalized < min) return min;
  if (normalized > max) return max;
  return normalized;
}

function switchAuth(tab) {
  var isSI = (tab === 'signin');
  var fmSI = document.getElementById('fmSI');
  var fmSU = document.getElementById('fmSU');
  if (fmSI) fmSI.style.display = isSI ? '' : 'none';
  if (fmSU) fmSU.style.display = isSI ? 'none' : '';
  if (!isSI) showRegistrationForm();
  var tabSI = document.getElementById('tabSI');
  var tabSU = document.getElementById('tabSU');
  if (tabSI) tabSI.classList.toggle('on', isSI);
  if (tabSU) tabSU.classList.toggle('on', !isSI);
  setAuthErr('');
}

function showRegistrationForm() {
  REGISTRATION_STEP = 1;
  var fmSU = document.getElementById('fmSU');
  var fmSUCode = document.getElementById('fmSUCode');
  if (fmSU) fmSU.style.display = '';
  if (fmSUCode) fmSUCode.style.display = 'none';
  var codeEl = document.getElementById('suCode');
  if (codeEl) codeEl.value = '';
}

function showRegistrationCodeStep(email) {
  REGISTRATION_STEP = 2;
  var fmSU = document.getElementById('fmSU');
  var fmSUCode = document.getElementById('fmSUCode');
  if (fmSU) fmSU.style.display = 'none';
  if (fmSUCode) fmSUCode.style.display = '';
  var emailEl = document.getElementById('suCodeEmail');
  if (emailEl) emailEl.textContent = email;
  var codeEl = document.getElementById('suCode');
  if (codeEl) {
    codeEl.value = '';
    codeEl.focus();
  }
  setAuthErr('');
}

function backToRegistrationForm() {
  showRegistrationForm();
  setAuthErr('');
}

function setAuthErr(m) {
  var el = document.getElementById('authErr');
  if (el) el.textContent = m;
}

function setBtnState(id, dis) {
  var b = document.getElementById(id);
  if (b) b.disabled = dis;
}

async function doSignIn() {
  var emailEl = document.getElementById('siEmail');
  var passEl = document.getElementById('siPass');
  if (!emailEl || !passEl) { setAuthErr('Form error'); return; }
  var email = emailEl.value.trim();
  var pass = passEl.value;
  if (!email || !pass) { setAuthErr('Please fill all fields'); return; }
  setBtnState('btnSI', true);
  setAuthErr('');

  if (!supa) { PROFILE.username = '@demo'; enterApp(); setBtnState('btnSI', false); return; }

  try {
    var r = await supa.auth.signInWithPassword({ email: email, password: pass });
    if (r.error) throw r.error;
    ME = r.data.user;
    if (ME && !ME.email_confirmed_at) {
      PENDING_EMAIL = email;
      showVerify(email, '');
      setAuthErr(T('verifyTitle'));
      setBtnState('btnSI', false);
      return;
    }
    await fetchProfile();
    enterApp();
  } catch (e) {
    console.error(e);
    var msg = isAuthError(e) ? integrationMessage('auth') : (e.message || 'Sign in failed');
    toast(msg, 'var(--red)');
    setAuthErr(msg);
  } finally {
    setBtnState('btnSI', false);
  }
}

async function doSignUp() {
  var nickEl = document.getElementById('suNick');
  var emailEl = document.getElementById('suEmail');
  var passEl = document.getElementById('suPass');
  var pass2El = document.getElementById('suPass2');
  if (!nickEl || !emailEl || !passEl || !pass2El) { setAuthErr('Form error'); return; }

  var nick = nickEl.value.trim().replace(/^@/, '');
  var email = emailEl.value.trim().toLowerCase();
  var pass = passEl.value;
  var pass2 = pass2El.value;

  if (!nick || !email || !pass || !pass2) { setAuthErr('Fill all fields'); return; }
  if (pass.length < 8) { setAuthErr('Password min 8 chars'); return; }
  if (pass !== pass2) { setAuthErr('Passwords do not match'); return; }

  setBtnState('btnSU', true);
  setAuthErr('');

  if (!supa) { PROFILE.username = '@' + nick; enterApp(); setBtnState('btnSU', false); return; }

  PENDING_EMAIL = email;
  PENDING_NICK = nick;
  PENDING_REG_PASSWORD = pass;

  try {
    var sent = await callEdgeFunction('register-send-code', {
      email: email,
      password: pass,
      nickname: nick
    });
    if (!sent.ok) {
      var regMsg = registrationErrorMessage(sent);
      setAuthErr(regMsg);
      toast(regMsg, 'var(--red)');
      return;
    }
    toast(T('regCodeSent'), 'var(--ac2)');
    if (sent.data && sent.data.dev_code) {
      console.info('[dev] registration code:', sent.data.dev_code);
      toast('Dev code: ' + sent.data.dev_code, 'var(--ac)');
    }
    showRegistrationCodeStep(email);
  } catch (e) {
    console.error('SignUp exception:', e.message);
    featureToast('registration', e);
    setAuthErr(integrationMessage('registration'));
  } finally {
    setBtnState('btnSU', false);
  }
}

async function doVerifyRegistration() {
  var codeEl = document.getElementById('suCode');
  var code = codeEl ? codeEl.value.trim() : '';
  if (!/^\d{6}$/.test(code)) {
    setAuthErr(T('regInvalidCode'));
    return;
  }
  if (!PENDING_EMAIL || !PENDING_REG_PASSWORD) {
    setAuthErr(T('regInvalidCode'));
    backToRegistrationForm();
    return;
  }

  setBtnState('btnSUVerify', true);
  setAuthErr('');

  try {
    var verified = await callEdgeFunction('register-verify', {
      email: PENDING_EMAIL,
      code: code,
      password: PENDING_REG_PASSWORD
    });
    if (!verified.ok) {
      var vMsg = verified.body && verified.body.message
        ? verified.body.message
        : T('regInvalidCode');
      setAuthErr(vMsg);
      toast(vMsg, 'var(--red)');
      return;
    }

    toast(T('regComplete'), 'var(--ac2)');
    var signIn = await supa.auth.signInWithPassword({
      email: PENDING_EMAIL,
      password: PENDING_REG_PASSWORD
    });
    if (signIn.error) throw signIn.error;
    ME = signIn.data.user;
    PROFILE.username = '@' + PENDING_NICK;
    PROFILE.spk_balance = 4520; // Устанавливаем баланс напрямую, так как мы точно знаем его при создании
    PENDING_REG_PASSWORD = '';
    showRegistrationForm();
    enterApp();
  } catch (e) {
    console.error('verify registration', e);
    var msg = isAuthError(e) ? integrationMessage('auth') : (e.message || T('regInvalidCode'));
    setAuthErr(msg);
    toast(msg, 'var(--red)');
  } finally {
    setBtnState('btnSUVerify', false);
  }
}

async function resendRegistrationCode() {
  if (!PENDING_EMAIL || !PENDING_REG_PASSWORD || !PENDING_NICK) {
    backToRegistrationForm();
    return;
  }
  setAuthErr('');
  var sent = await callEdgeFunction('register-send-code', {
    email: PENDING_EMAIL,
    password: PENDING_REG_PASSWORD,
    nickname: PENDING_NICK
  });
  if (!sent.ok) {
    var resendMsg = registrationErrorMessage(sent);
    toast(resendMsg, 'var(--red)');
    setAuthErr(resendMsg);
    return;
  }
  toast(T('regCodeSent'), 'var(--ac2)');
  if (sent.data && sent.data.dev_code) {
    console.info('[dev] registration code:', sent.data.dev_code);
  }
}

async function fetchProfile() {
  if (!supa || !ME) return;
  var r = await safeSupabaseCall('database', function () {
    return supa.from('profiles').select('*').eq('id', ME.id).single();
  }, { silent: true });
  if (r.ok && r.data && r.data.data) {
    var row = r.data.data;
    PROFILE.username = row.username || '@user';
    PROFILE.spk_balance = row.spk_balance || 4520;
  }
}

async function doLogout() {
  if (supa) await supa.auth.signOut();
  location.reload();
}

function enterApp() {
  if (appEntered) return;
  appEntered = true;
  document.documentElement.classList.remove('auth-active');
  hideVerify();
  var authScreen = document.getElementById('authScreen');
  if (authScreen) authScreen.classList.add('gone');
  var launchOverlay = document.getElementById('launchOverlay');
  if (launchOverlay) launchOverlay.classList.add('gone');
  updateHeader();
  renderProfile();
  initRealtime();
  applyLang();
}

function updateHeader() {
  var letter = PROFILE.username.replace('@', '').charAt(0).toUpperCase();
  var av = document.getElementById('hdrAv');
  var un = document.getElementById('hdrUn');
  var spk = document.getElementById('hdrSpk');
  var bal = document.getElementById('invBal');
  if (av) av.textContent = letter;
  if (un) un.textContent = PROFILE.username;
  if (spk) spk.textContent = PROFILE.spk_balance.toLocaleString() + ' SPK';
  if (bal) bal.textContent = PROFILE.spk_balance.toLocaleString() + ' SPK';
}

function showVerify(email, nick) {
  PENDING_EMAIL = email;
  if (nick) PENDING_NICK = nick;
  document.documentElement.classList.add('auth-active');
  var el = document.getElementById('vmEmailDisplay');
  if (el) el.textContent = email;
  setVmErr('');
  var modal = document.getElementById('verify-modal');
  if (modal) modal.classList.add('show', 'open');
}

function hideVerify() {
  var modal = document.getElementById('verify-modal');
  if (modal) modal.classList.remove('show', 'open');
}

function setVmErr(m) {
  var el = document.getElementById('vmErr');
  if (el) el.textContent = m;
}

async function checkEmailVerified() {
  var btn = document.getElementById('vmConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Проверяем…'; }
  setVmErr('');

  if (!supa) { hideVerify(); enterApp(); return; }

  var confirmed = false;

  try {
    var refresh = await supa.auth.refreshSession();
    if (!refresh.error && refresh.data && refresh.data.user) {
      confirmed = !!refresh.data.user.email_confirmed_at;
      if (confirmed) ME = refresh.data.user;
    }

    if (!confirmed) {
      var gu = await supa.auth.getUser();
      if (!gu.error && gu.data && gu.data.user) {
        confirmed = !!gu.data.user.email_confirmed_at;
        if (confirmed) ME = gu.data.user;
      }
    }
  } catch (e) {
    setVmErr('Ошибка сети. Попробуйте ещё раз.');
    console.warn('checkEmailVerified error', e);
    if (btn) { btn.disabled = false; btn.textContent = '✅ Я подтвердил(а)'; }
    return;
  }

  if (confirmed) {
    await fetchProfile();
    hideVerify();
    enterApp();
  } else {
    setVmErr('Почта ещё не подтверждена. Проверьте папку «Спам».');
    if (btn) { btn.disabled = false; btn.textContent = '✅ Я подтвердил(а)'; }
  }
}

async function resendVerification() {
  if (!supa || !PENDING_EMAIL) return;
  setVmErr('');
  try {
    var r = await supa.auth.resend({
      type: 'signup',
      email: PENDING_EMAIL,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    setVmErr(r.error ? 'Не удалось: ' + r.error.message : '✉️ Письмо отправлено!');
  } catch (e) {
    setVmErr('Ошибка отправки.');
  }
}

function applyLang() {
  document.querySelectorAll('.lang-opt').forEach(function (o) {
    o.classList.toggle('sel', o.dataset.lang === LANG);
  });
  document.querySelectorAll('[id^="lc"]').forEach(function (e) {
    if (e) e.textContent = LANG.toUpperCase();
  });
  applyStaticI18n();
  renderProfile();
  renderFeed();
}

function setText(selector, value) {
  var el = document.querySelector(selector);
  if (el && typeof value === 'string') el.textContent = value;
}

function setPlaceholder(selector, value) {
  var el = document.querySelector(selector);
  if (el && typeof value === 'string') el.placeholder = value;
}

function applyStaticI18n() {
  setText('#tabSI', T('signIn'));
  setText('#tabSU', T('register'));
  setText('#btnSI', T('signInBtn'));
  setText('#btnSU', T('createAccount'));
  setText('#suCodeHint', T('regEnterCode'));
  setText('#suCodeLabel', T('regCodeLabel'));
  setText('#btnSUVerify', T('regVerifyBtn'));
  setText('#btnSUResend', T('regResendCode'));
  setText('#btnSUBack', T('regBack'));
  var authRem = document.querySelector('.auth-rem');
  if (authRem) {
    var remInput = authRem.querySelector('input');
    authRem.textContent = '';
    if (remInput) authRem.appendChild(remInput);
    authRem.appendChild(document.createTextNode(' ' + T('rememberMe')));
  }
  setText('#fmSI .af:nth-of-type(1) label', T('email'));
  setText('#fmSI .af:nth-of-type(2) label', T('password'));
  setText('#fmSU .af:nth-of-type(1) label', T('nickname'));
  setText('#fmSU .af:nth-of-type(2) label', T('email'));
  setText('#fmSU .af:nth-of-type(3) label', T('passMin'));
  setText('#fmSU .af:nth-of-type(4) label', T('repeatPassword'));
  setPlaceholder('#suNick', '@your_name');
  setPlaceholder('#siEmail', 'you@spark.app');
  setPlaceholder('#suEmail', 'you@spark.app');

  setText('#vmTitleText', T('verifyTitle'));
  setText('#vmConfirmBtn', T('verifyDone'));
  setText('#vmResendBtn', T('resendMail'));
  var vmText = document.querySelector('.vm-text');
  var vmMail = document.getElementById('vmEmailDisplay');
  if (vmText && vmMail) {
    vmText.innerHTML = escapeHTML(T('verifyText')) + '<br>'
      + escapeHTML(T('verifyText2')) + ': <span class="vm-email" id="vmEmailDisplay">' + escapeHTML(vmMail.textContent || '') + '</span> '
      + escapeHTML(T('verifyText3'));
  }

  setText('#btnProfDesk span', T('profile'));
  setText('#btnPostIdea', T('postIdea'));
  setText('.wallet-badge .wlabel', T('wallet'));
  setText('.layout > .sidebar:first-child .stitle', T('trendingNow'));
  setText('#obsTitleDesk', T('marketObservatory'));
  setText('#obsTitleMob', T('marketObservatory'));
  document.querySelectorAll('[data-obs-label="tech"]').forEach(function (el) { el.textContent = T('obsTech'); });
  document.querySelectorAll('[data-obs-label="eco"]').forEach(function (el) { el.textContent = T('obsEco'); });
  document.querySelectorAll('[data-obs-label="social"]').forEach(function (el) { el.textContent = T('obsSocial'); });
  setText('.layout > .sidebar:last-child .stitle', T('leaderboard'));
  setText('.layout > .sidebar:last-child .divider + .stitle', T('liveActivity'));
  applyLiveActivityI18n();

  setText('.frow .flabel', T('sortLabel'));
  setText('.frow [data-sort="new"]', T('newSort'));
  setText('.frow [data-sort="popular"]', T('popularSort'));
  setText('.frow [data-sort="profit"]', T('profitSort'));
  setText('.frow [data-sort="ending"]', T('endingSort'));
  setText('.trow .flabel', T('tagLabel'));
  setText('.trow [data-tag="all"]', T('all'));
  setPlaceholder('#srchIn', LANG === 'ru' ? 'Поиск идей...' : 'Search ideas...');

  setText('.mob-tab[data-panel="feed"] span', T('feed'));
  setText('.mob-tab[data-panel="leaders"] span', T('leaders'));
  setText('.mob-tab[data-panel="chats"] span', T('chats'));
  setText('.mob-tab[data-panel="trends"] span', T('trends'));
  setText('.mob-tab[data-panel="profile"] span', T('profile'));
  setText('#panel-trends .stitle', T('trendingNow'));
  setText('#panel-leaders .stitle', T('leaders'));
  setText('[data-chat-tab="dms"]', T('chatDms'));
  setText('[data-chat-tab="topics"]', T('chatTopics'));

  setText('#moCreate .mo-title', T('newIdea'));
  setText('#moCreate .mf:nth-of-type(1) label', T('title'));
  setText('#moCreate .mf:nth-of-type(2) label', T('description'));
  setText('#moCreate .row2 .mf:nth-of-type(1) label', T('minBet'));
  setText('#moCreate .row2 .mf:nth-of-type(2) label', T('targetOpt'));
  setText('#moCreate .mf:nth-of-type(3) label', T('duration'));
  setText('#btnPub', T('holdPublish'));
  setText('#moCreate .hbtn-hint', T('holdHint'));
  setPlaceholder('#ciTitle', LANG === 'ru' ? 'В чем идея?' : "What's the idea?");
  setPlaceholder('#ciDesc', LANG === 'ru' ? 'Опишите...' : 'Describe it...');

  setText('#invTitle', T('investModal'));
  setText('#moInvest .inv-bal span', T('yourBalance'));
  setText('#btnInv', T('holdInvest'));
  setText('#moInvest .hbtn-hint', T('holdHint'));
}

function initObservatory() {
  document.querySelectorAll('.obs-shell').forEach(function (shell) {
    var systems = shell.querySelectorAll('[data-obs-system]');
    systems.forEach(function (system) {
      system.addEventListener('click', function (event) {
        event.stopPropagation();
        var alreadyFocused = system.classList.contains('focused');
        systems.forEach(function (s) { s.classList.remove('focused'); });
        if (alreadyFocused) {
          shell.classList.remove('has-focus');
          return;
        }
        shell.classList.add('has-focus');
        system.classList.add('focused');
      });
    });

    var dimmer = shell.querySelector('.obs-dimmer');
    if (dimmer) {
      dimmer.addEventListener('click', function () {
        shell.classList.remove('has-focus');
        systems.forEach(function (s) { s.classList.remove('focused'); });
      });
    }
  });
  renderObservatoryData();
}

function parsePoolAmount(raw) {
  var normalized = String(raw == null ? '' : raw).replace(/[^0-9]/g, '');
  var n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function compactSpk(value) {
  var n = Number(value) || 0;
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k SPK';
  return Math.round(n) + ' SPK';
}

function shortTopic(idea) {
  if (!idea) return 'N/A';
  var source = String(idea.title || idea.tag || '').trim();
  if (!source) return 'N/A';
  return source.length > 14 ? source.slice(0, 14) + '…' : source;
}

function topByCategory(tags, maxItems) {
  var list = LIVE.filter(function (x) {
    return tags.includes(String(x.tag || '').toLowerCase());
  }).sort(function (a, b) {
    return (parsePoolAmount(b.pool) + (b.investors || 0) * 20) - (parsePoolAmount(a.pool) + (a.investors || 0) * 20);
  });
  return list.slice(0, maxItems);
}

function renderObservatoryData() {
  var tech = topByCategory(['ai tools', 'b2b saas', 'web3', 'defi'], 3);
  var eco = topByCategory(['cleanenergy'], 2);
  var social = topByCategory(['hardware'], 3);
  var fallback = LIVE.slice().sort(function (a, b) { return (b.investors || 0) - (a.investors || 0); });
  while (tech.length < 3 && fallback[tech.length]) tech.push(fallback[tech.length]);
  while (eco.length < 2 && fallback[eco.length]) eco.push(fallback[eco.length]);
  while (social.length < 3 && fallback[social.length]) social.push(fallback[social.length]);

  document.querySelectorAll('.obs-shell').forEach(function (shell) {
    var systems = shell.querySelectorAll('[data-obs-system]');
    var groups = [tech, eco, social];
    systems.forEach(function (system, index) {
      var infos = system.querySelectorAll('.obs-info');
      var group = groups[index] || [];
      infos.forEach(function (info, infoIndex) {
        var item = group[infoIndex] || null;
        var n = info.querySelector('.obs-n');
        var v = info.querySelector('.obs-v');
        if (!n || !v) return;
        n.textContent = shortTopic(item);
        v.textContent = item ? compactSpk(parsePoolAmount(item.pool)) : '0 SPK';
      });
    });
  });
}

function applyLiveActivityI18n() {
  var row1 = document.getElementById('actRow1');
  var row2 = document.getElementById('actRow2');
  var row3 = document.getElementById('actRow3');
  if (row1) {
    row1.innerHTML = LANG === 'ru'
      ? '<span style="color:var(--ac2)">@sarah_angel</span> вложил(а) <strong style="color:var(--tx)">50 SPK</strong> в AI code review<div style="font-size:10px;margin-top:1px">2 мин назад</div>'
      : '<span style="color:var(--ac2)">@sarah_angel</span> invested <strong style="color:var(--tx)">50 SPK</strong> in AI code review<div style="font-size:10px;margin-top:1px">2 min ago</div>';
  }
  if (row2) {
    row2.innerHTML = LANG === 'ru'
      ? '<span style="color:var(--red)">@dima_builds</span> раскритиковал(а) Solar Leasing<div style="font-size:10px;margin-top:1px">7 мин назад</div>'
      : '<span style="color:var(--red)">@dima_builds</span> critiqued Solar Leasing<div style="font-size:10px;margin-top:1px">7 min ago</div>';
  }
  if (row3) {
    row3.innerHTML = LANG === 'ru'
      ? 'Опубликована новая идея: <strong style="color:var(--tx)">#DeFi lending for SMEs</strong><div style="font-size:10px;margin-top:1px">12 мин назад</div>'
      : 'New idea posted: <strong style="color:var(--tx)">#DeFi lending for SMEs</strong><div style="font-size:10px;margin-top:1px">12 min ago</div>';
  }
}

function setLang(l, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  LANG = l;
  localStorage.setItem('spark_lang', l);
  document.querySelectorAll('.lang-dd').forEach(function (d) { d.classList.remove('open'); });
  applyLang();
}

function toggleDD(e, id) {
  e.stopPropagation();
  document.querySelectorAll('.lang-dd').forEach(function (d) { if (d.id !== id) d.classList.remove('open'); });
  var dd = document.getElementById(id);
  if (dd) dd.classList.toggle('open');
}

function profileHTML(sfx) {
  var L = PROFILE.username.replace('@', '').charAt(0).toUpperCase();
  var safeUser = escapeHTML(PROFILE.username);
  return '<div class="phero">'
    + '<div class="pav-lg">' + L + '</div>'
    + '<div class="pname">' + safeUser + '</div>'
    + '<span class="pbadge">' + T('verifiedInvestor') + '</span></div>'
    + '<div class="srow" style="margin-bottom:18px">'
    + '<div class="sbox"><span class="sval">12</span><span class="skey">' + T('ideas') + '</span></div>'
    + '<div class="sbox"><span class="sval">+84%</span><span class="skey">' + T('profit') + '</span></div>'
    + '<div class="sbox"><span class="sval">38</span><span class="skey">' + T('invested') + '</span></div>'
    + '<div class="sbox"><span class="sval">#41</span><span class="skey">' + T('rank') + '</span></div></div>'
    + '<div class="divider"></div>'
    + '<div class="stitle" style="margin-top:14px">' + T('wallet') + '</div>'
    + '<div class="wcrd"><div><div class="wamt">' + PROFILE.spk_balance.toLocaleString() + ' <small>SPK</small></div><div class="wsub">' + T('availableBalance') + '</div></div>'
    + '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--ac);opacity:.55"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L2 7h20l-6-4z"/></svg></div>'
    + '<div class="divider"></div>'
    + '<div class="stitle" style="margin-top:14px">' + T('settings') + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:2px">'
    + '<div class="lang-row" data-dd-id="ldd-' + sfx + '">'
    + '<span style="font-size:13px">' + T('language') + '</span>'
    + '<span class="lang-cur" id="lc' + sfx + '">' + LANG.toUpperCase() + '</span>'
    + '<div class="lang-dd" id="ldd-' + sfx + '">'
    + '<div class="lang-opt' + (LANG === 'en' ? ' sel' : '') + '" data-lang="en" data-set-lang="en"><span style="font-size:11px; font-weight:bold; color:var(--mu);">EN</span> English</div>'
    + '<div class="lang-opt' + (LANG === 'ru' ? ' sel' : '') + '" data-lang="ru" data-set-lang="ru"><span style="font-size:11px; font-weight:bold; color:var(--mu);">RU</span> Русский</div>'
    + '</div></div>'
    + '<div class="sset" data-pulse="1"><span>' + T('notifications') + '</span>'
    + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--mu)"><polyline points="9 18 15 12 9 6"/></svg></div>'
    + '<div class="sset" data-pulse="1"><span>' + T('privacy') + '</span>'
    + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--mu)"><polyline points="9 18 15 12 9 6"/></svg></div>'
    + '<a class="sset" href="about.html" style="text-decoration:none;color:inherit"><span>' + (typeof T === 'function' && T('aboutUs') !== 'aboutUs' ? T('aboutUs') : (window.LANG === 'ru' ? 'О нас' : 'About us')) + '</span>'
    + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--mu)"><polyline points="9 18 15 12 9 6"/></svg></a>'
    + '<div class="sset" data-logout="1"><span style="color:var(--red)">' + T('logout') + '</span>'
    + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><polyline points="9 18 15 12 9 6"/></svg></div>'
    + '</div>';
}

function renderProfile() {
  var dp = document.getElementById('dpPanel');
  if (dp) dp.innerHTML = profileHTML('D');
  var mb = document.getElementById('mobProfInner');
  if (mb) mb.innerHTML = profileHTML('M');
}

function toggleDeskProf() {
  var o = document.getElementById('dpOverlay');
  var b = document.getElementById('btnProfDesk');
  if (o) o.classList.toggle('open');
  if (b) b.classList.toggle('active', o && o.classList.contains('open'));
}

function bgCloseDesk(e) {
  if (e.target === document.getElementById('dpOverlay')) {
    var o = document.getElementById('dpOverlay');
    var b = document.getElementById('btnProfDesk');
    if (o) o.classList.remove('open');
    if (b) b.classList.remove('active');
  }
}

var GW = 400, GH = 68, GPX = 8, GPY = 8;

function synthesiseHistory(investors) {
  var total = investors * 10;
  if (total === 0) return [0, 0];
  var weights = [0, 0.02, 0.06, 0.14, 0.28, 0.48, 0.72, 1.0];
  return weights.map(function (w) { return Math.round(w * total); });
}

function buildGraphPath(history) {
  var safe = history.reduce(function (acc, v, i) {
    acc.push(i === 0 ? v : Math.max(v, acc[i - 1]));
    return acc;
  }, []);
  var minV = safe[0];
  var maxV = safe[safe.length - 1];
  var range = (maxV - minV) || 1;
  var drawW = GW - GPX * 2;
  var drawH = GH - GPY * 2;
  var n = safe.length;
  var pts = safe.map(function (v, i) {
    return { x: GPX + (i / (n - 1 || 1)) * drawW, y: GPY + drawH - ((v - minV) / range) * drawH };
  });
  if (maxV === minV) pts = pts.map(function (p) { return { x: p.x, y: GPY + drawH }; });
  var d = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
  return { d: d, lastPt: pts[pts.length - 1] };
}

function investGraphHTML(x) {
  var history = x.investment_history || synthesiseHistory(x.investors, x.pct);
  var histJSON = JSON.stringify(history).replace(/"/g, '&quot;');
  return '<div class="igraph-wrap">'
    + '<div class="igraph-header"><span>' + T('iot') + '</span><span class="igraph-label-right">&#8593; +' + x.pct + '%</span></div>'
    + '<svg class="igsvg" viewBox="0 0 ' + GW + ' ' + GH + '" preserveAspectRatio="none" data-history="' + histJSON + '"></svg>'
    + '<div class="igraph-footer"><div class="ig-investors">'
    + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    + '<span>' + x.investors + '</span>&nbsp;' + T('cinv') + ' &middot; <span class="ig-pool">' + x.pool + ' SPK</span>&nbsp;' + T('cpool')
    + '</div><div class="ig-cd">&#8987; ' + x.cd + 'h ' + T('cleft') + '</div></div></div>';
}

function drawInvestmentGraph(svgEl, history, dur) {
  if (!svgEl) return;
  dur = dur || 1.6;
  history = (history && history.length >= 2) ? history : [0, 0];
  var gid = 'g' + (Math.random().toString(36).slice(2));
  svgEl.dataset.gid = gid;
  var gp = buildGraphPath(history);
  var NS = 'http://www.w3.org/2000/svg';
  svgEl.innerHTML = '';
  var defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = '<linearGradient id="igf-' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8c55a" stop-opacity="0.22"/><stop offset="100%" stop-color="#e8c55a" stop-opacity="0"/></linearGradient>';
  svgEl.appendChild(defs);
  var fill = document.createElementNS(NS, 'path');
  fill.setAttribute('d', gp.d + ' L' + (GW - GPX) + ',' + GH + ' L' + GPX + ',' + GH + ' Z');
  fill.setAttribute('fill', 'url(#igf-' + gid + ')');
  fill.classList.add('ig-fill');
  svgEl.appendChild(fill);
  var line = document.createElementNS(NS, 'path');
  line.setAttribute('d', gp.d);
  line.classList.add('ig-line');
  svgEl.appendChild(line);
  var dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('cx', gp.lastPt.x.toFixed(1));
  dot.setAttribute('cy', gp.lastPt.y.toFixed(1));
  dot.setAttribute('r', '3.5');
  dot.classList.add('ig-dot');
  svgEl.appendChild(dot);
  requestAnimationFrame(function () {
    var len = line.getTotalLength();
    if (!len) { line.style.strokeDasharray = 'none'; return; }
    line.style.setProperty('--ig-len', String(len));
    line.style.setProperty('--ig-dur', dur + 's');
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = len;
    requestAnimationFrame(function () {
      line.classList.add('animated');
      setTimeout(function () { dot.classList.add('show'); }, dur * 800);
    });
  });
}

function animateAllGraphs(container) {
  if (!container) return;
  var svgs = container.querySelectorAll('svg.igsvg[data-history]');
  if (!('IntersectionObserver' in window)) {
    svgs.forEach(function (svg) { try { drawInvestmentGraph(svg, JSON.parse(svg.dataset.history)); } catch (e) {} });
    return;
  }
  var obs = new IntersectionObserver(function (entries, o) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var svg = entry.target;
        try { drawInvestmentGraph(svg, JSON.parse(svg.dataset.history)); } catch (e) { drawInvestmentGraph(svg, [0, 0]); }
        o.unobserve(svg);
      }
    });
  }, { threshold: 0.2 });
  svgs.forEach(function (svg) { obs.observe(svg); });
}

var page = 1, sort = 'new', ftag = 'all', q = '';
var PER = 5;

function filtered() {
  var a = LIVE.slice();
  if (ftag !== 'all') a = a.filter(function (x) { return x.tag === ftag; });
  if (q) a = a.filter(function (x) {
    return x.title.toLowerCase().includes(q) || x.body.toLowerCase().includes(q) || x.tag.toLowerCase().includes(q) || x.u.toLowerCase().includes(q);
  });
  if (sort === 'popular') a.sort(function (a1, b1) { return b1.investors - a1.investors; });
  if (sort === 'profit') a.sort(function (a2, b2) { return b2.pct - a2.pct; });
  if (sort === 'ending') a.sort(function (a3, b3) { return parseInt(a3.cd, 10) - parseInt(b3.cd, 10); });
  return a;
}

function reactHTML(id) {
  var rs = getRS(id);
  var sorted = EMOJIS.slice().sort(function (a, b) { return (rs.counts[b] || 0) - (rs.counts[a] || 0); });
  return sorted.map(function (e) {
    var cnt = rs.counts[e] || 0;
    var on = rs.pick === e ? 'on' : '';
    return '<button class="rbbl ' + on + '" data-id="' + id + '" data-e="' + e + '"><span class="rem">' + e + '</span><span class="rct">' + cnt + '</span></button>';
  }).join('');
}

function cardHTML(x) {
  var fire = (getRS(x.id).counts['🔥'] || 0) >= FIRE_T;
  var safeUser = escapeHTML(x.u);
  var safeTag = escapeHTML(x.tag);
  var safeTitle = escapeHTML(x.title);
  var safeBody = escapeHTML(x.body);
  var safeTime = escapeHTML(x.tm);
  var safeBg = sanitizeCssBackground(x.bg);
  var safeAv = safeAvatar(x.av);
  return '<div class="card' + (fire ? ' fire' : '') + '" data-cid="' + x.id + '">'
    + '<div class="ch"><div class="cav" style="background:' + safeBg + '">' + safeAv + '</div>'
    + '<div class="cm"><div class="cu">' + safeUser + '</div><div class="ct">' + safeTime + ' · #' + safeTag + '</div></div>'
    + '<div class="cmen"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></div></div>'
    + '<div class="ctitle">' + safeTitle + '</div><div class="cbody">' + safeBody + '</div>'
    + investGraphHTML(x)
    + '<div class="cact"><button class="binv" data-invest-id="' + x.id + '">' + T('binv') + '</button><button class="bcrit">' + T('bcrit') + '</button></div>'
    + '<div class="creact" id="rc-' + x.id + '">' + reactHTML(x.id) + '</div></div>';
}

function renderFeed() {
  var list = filtered();
  var tp = Math.max(1, Math.ceil(list.length / PER));
  if (page > tp) page = tp;
  var sl = list.slice((page - 1) * PER, page * PER);
  var cl = document.getElementById('cardsList');
  if (!cl) return;
  cl.innerHTML = sl.length ? sl.map(cardHTML).join('') : '<div style="text-align:center;padding:48px 0;color:var(--mu);font-size:13px">' + T('noResults') + '</div>';
  renderPgn(tp);
  renderObservatoryData();
  var f = document.querySelector('.feed');
  if (f) f.scrollTop = 0;
  setTimeout(function () { animateAllGraphs(cl); }, 60);
}

function renderPgn(tp) {
  var pg = document.getElementById('pgn');
  if (!pg) return;
  if (tp <= 1) { pg.innerHTML = ''; return; }
  function mkbtn(lbl, p, dis, act) {
    return '<button class="pbtn' + (act ? ' active' : '') + '" data-p="' + p + '" ' + (dis ? 'disabled' : '') + '>' + lbl + '</button>';
  }
  var ps = [];
  if (tp <= 5) { for (var i = 1; i <= tp; i++) ps.push(i); } else {
    var l = Math.max(1, page - 1), r = Math.min(tp, page + 1);
    if (l > 2) ps.push('…l');
    for (var p2 = l; p2 <= r; p2++) ps.push(p2);
    if (r < tp - 1) ps.push('…r');
  }
  var h = mkbtn('«', 1, page === 1, false) + mkbtn('‹', page - 1, page === 1, false);
  if (!ps.includes(1)) { h += mkbtn('1', 1, false, false); if (ps[0] !== '…l') h += '<span class="psep">…</span>'; }
  ps.forEach(function (p) {
    if (p === '…l' || p === '…r') h += '<span class="psep">…</span>';
    else h += mkbtn(p, p, false, p === page);
  });
  if (!ps.includes(tp)) { if (ps[ps.length - 1] !== '…r') h += '<span class="psep">…</span>'; h += mkbtn(tp, tp, false, false); }
  h += mkbtn('›', page + 1, page === tp, false) + mkbtn('»', tp, page === tp, false);
  pg.innerHTML = h;
  pg.querySelectorAll('.pbtn:not([disabled])').forEach(function (b) {
    b.addEventListener('click', function () { page = parseInt(b.dataset.p, 10); renderFeed(); });
  });
}

function react(ideaId, emoji, btn) {
  var rs = getRS(ideaId);
  var prev = rs.pick;
  if (prev === emoji) { rs.counts[emoji] = Math.max(0, (rs.counts[emoji] || 0) - 1); rs.pick = null; } else {
    if (prev) rs.counts[prev] = Math.max(0, (rs.counts[prev] || 0) - 1);
    rs.counts[emoji] = (rs.counts[emoji] || 0) + 1;
    rs.pick = emoji;
  }
  btn.classList.add('pop');
  setTimeout(function () { btn.classList.remove('pop'); }, 300);
  var container = document.getElementById('rc-' + ideaId);
  if (!container) return;
  var oldPos = {};
  container.querySelectorAll('.rbbl').forEach(function (b) { oldPos[b.dataset.e] = b.getBoundingClientRect().left; });
  container.innerHTML = reactHTML(ideaId);
  container.querySelectorAll('.rbbl').forEach(function (b2) {
    var e = b2.dataset.e;
    if (oldPos[e] === undefined) return;
    var dx = oldPos[e] - b2.getBoundingClientRect().left;
    if (Math.abs(dx) < 2) return;
    b2.style.transition = 'none';
    b2.style.transform = 'translateX(' + dx + 'px)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        b2.style.transition = 'transform .32s cubic-bezier(.34,1.56,.64,1)';
        b2.style.transform = 'translateX(0)';
      });
    });
  });
  var card = document.querySelector('.card[data-cid="' + ideaId + '"]');
  if (card) card.classList.toggle('fire', (rs.counts['🔥'] || 0) >= FIRE_T);
}

var CUR_IDEA = null;
var realtimeIdeasChannel = null;
var realtimeBalanceChannel = null;
var usingLegacyInvestFallback = false;
var investFallbackNoticeShown = false;

function openInvest(id) {
  var idea = LIVE.filter(function (x) { return x.id === id; })[0];
  if (!idea) return;
  CUR_IDEA = idea;
  var min = idea.minBet || 10;
  var maxAllowed = Math.max(min, PROFILE.spk_balance);
  var invTitle = document.getElementById('invTitle');
  if (invTitle) {
    var titlePrefix = LANG === 'ru' ? 'Инвестировать в "' : 'Invest in "';
    invTitle.textContent = titlePrefix + String(idea.title || '').slice(0, 28) + '…" 🚀';
  }
  var invBal = document.getElementById('invBal');
  if (invBal) invBal.textContent = PROFILE.spk_balance.toLocaleString() + ' SPK';
  var aEl = document.getElementById('invAmt'), sEl = document.getElementById('invSl');
  if (aEl) { aEl.min = String(min); aEl.max = String(maxAllowed); aEl.value = String(min); }
  if (sEl) { sEl.min = String(min); sEl.max = String(maxAllowed); sEl.value = String(min); }
  var presets = [min, 50, 100, 250, 500, 1000];
  var presetsEl = document.getElementById('invPresets');
  if (presetsEl) {
    presetsEl.innerHTML = presets.map(function (v) {
      var dis = v < min && v !== min;
      return '<button class="prs-btn' + (v === min ? ' on' : '') + '" data-set-amt="' + v + '" ' + (dis ? 'disabled' : '') + '>' + (v === min ? 'Min(' + v + ')' : v) + '</button>';
    }).join('');
  }
  syncInv();
  openMo('moInvest');
  attachHold('btnInv', 2000, doInvest);
  if (aEl) aEl.oninput = function () { if (sEl) sEl.value = aEl.value; syncInv(); };
  if (sEl) sEl.oninput = function () { if (aEl) aEl.value = sEl.value; syncInv(); };
}

function setAmt(v) {
  var aEl = document.getElementById('invAmt');
  var sEl = document.getElementById('invSl');
  if (!CUR_IDEA) return;
  var min = CUR_IDEA.minBet || 10;
  var max = Math.max(min, PROFILE.spk_balance);
  var clamped = clampAmount(v, min, max);
  if (aEl) aEl.value = String(clamped);
  if (sEl) sEl.value = String(clamped);
  syncInv();
  document.querySelectorAll('.prs-btn').forEach(function (b) { b.classList.remove('on'); });
  var m = [].slice.call(document.querySelectorAll('.prs-btn')).find(function (b2) {
    return b2.textContent === String(clamped) || b2.textContent === 'Min(' + clamped + ')';
  });
  if (m) m.classList.add('on');
}

function syncInv() {
  if (!CUR_IDEA) return;
  var aEl = document.getElementById('invAmt');
  var min = CUR_IDEA.minBet || 10;
  var max = Math.max(min, PROFILE.spk_balance);
  var amt = aEl ? clampAmount(aEl.value, min, max) : min;
  if (aEl) aEl.value = String(amt);
  var sEl = document.getElementById('invSl');
  if (sEl) sEl.value = String(amt);
  var btn = document.getElementById('btnInv');
  var warn = document.getElementById('invWarn');
  if (amt < min) { if (warn) warn.textContent = 'Min bet: ' + min + ' SPK'; if (btn) btn.disabled = true; }
  else if (amt > PROFILE.spk_balance) { if (warn) warn.textContent = 'Insufficient balance'; if (btn) btn.disabled = true; }
  else { if (warn) warn.textContent = ''; if (btn) btn.disabled = false; }
}

async function doInvest() {
  var btn = document.getElementById('btnInv');
  if (btn) btn.disabled = true;
  var aEl = document.getElementById('invAmt');
  var min = CUR_IDEA ? (CUR_IDEA.minBet || 10) : 10;
  var amt = aEl ? clampAmount(aEl.value, min, Math.max(min, PROFILE.spk_balance)) : 0;
  if (!CUR_IDEA || amt < (CUR_IDEA.minBet || 10)) {
    if (btn) btn.disabled = false;
    return;
  }
  if (amt > PROFILE.spk_balance) {
    toast('❌ ' + T('insufficientBalance'), 'var(--red)');
    if (btn) btn.disabled = false;
    return;
  }
  try {
    if (supa && ME) {
      var rpc = await supa.rpc('invest_in_idea', {
        p_idea_id: CUR_IDEA.id,
        p_amount: amt
      });
      if (rpc.error) {
        var rpcMsg = String(rpc.error.message || '').toLowerCase();
        var rpcMissing = rpcMsg.includes('function') && rpcMsg.includes('invest_in_idea');
        if (ALLOW_LEGACY_INVEST_FALLBACK && rpcMissing) {
          usingLegacyInvestFallback = true;
          if (!investFallbackNoticeShown) {
            investFallbackNoticeShown = true;
            toast('⚠️ ' + T('legacyInvestMode'), 'var(--ac2)');
          }
          var currentBalance = Number(PROFILE.spk_balance || 0);
          var nextBalance = currentBalance - amt;
          if (nextBalance < 0) throw new Error('insufficient_balance');
          var upd = await supa.from('profiles').update({ spk_balance: nextBalance }).eq('id', ME.id);
          if (upd.error) throw upd.error;
          PROFILE.spk_balance = nextBalance;
        } else {
          throw rpc.error;
        }
      }
      var payload = rpc.data;
      var newBalance = null;
      if (!usingLegacyInvestFallback && Array.isArray(payload) && payload[0] && Number.isFinite(Number(payload[0].new_balance))) {
        newBalance = Number(payload[0].new_balance);
      } else if (!usingLegacyInvestFallback && payload && Number.isFinite(Number(payload.new_balance))) {
        newBalance = Number(payload.new_balance);
      }
      if (newBalance === null) {
        await fetchProfile();
      } else {
        PROFILE.spk_balance = newBalance;
      }
      updateHeader();
    } else {
      PROFILE.spk_balance -= amt;
      updateHeader();
    }
    closeMo('moInvest');
    toast('✅ Invested ' + amt + ' SPK!', 'var(--ac)');
    renderFeed();
  } catch (e) {
    reportClientError('invest_failed', {
      message: e && e.message ? e.message : String(e),
      amount: amt,
      ideaId: CUR_IDEA ? CUR_IDEA.id : null
    });
    console.warn(e);
    var msg = String((e && e.message) || '').toLowerCase();
    if (msg.includes('insufficient_balance')) toast('❌ ' + T('insufficientBalance'), 'var(--red)');
    else if (msg.includes('amount_below_min_bet')) toast('❌ ' + T('amountBelowMinBet'), 'var(--red)');
    else if (msg.includes('idea_not_found')) toast('❌ ' + T('ideaNotFound'), 'var(--red)');
    else if (msg.includes('auth_required')) toast('❌ ' + T('signInRequired'), 'var(--red)');
    else toast('❌ ' + T('secureInvestFailed'), 'var(--red)');
  } finally {
    if (btn) btn.disabled = false;
  }
}

var selDur = '24h';

function openCreate() {
  ['ciTitle', 'ciDesc', 'ciTarget'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
  var ciMin = document.getElementById('ciMin');
  if (ciMin) ciMin.value = '10';
  selDur = '24h';
  document.querySelectorAll('.dur-btn:not(.locked)').forEach(function (b) {
    b.classList.toggle('sel', b.dataset.dur === '24h');
  });
  openMo('moCreate');
  attachHold('btnPub', 2000, doPublish);
}

async function doPublish() {
  var ciTitle = document.getElementById('ciTitle');
  var ciDesc = document.getElementById('ciDesc');
  var ciMin = document.getElementById('ciMin');
  var ciTarget = document.getElementById('ciTarget');
  if (!ciTitle) return;
  var title = ciTitle.value.trim();
  var desc = ciDesc ? ciDesc.value.trim() : '';
  var min = ciMin ? clampAmount(ciMin.value, 1, 1000000) : 10;
  if (!title) { toast('❗ Add a title', 'var(--red)'); return; }
  var secs = { '24h': 86400, '7d': 604800 }[selDur] || 86400;
  var exp = new Date(Date.now() + secs * 1000).toISOString();
  var uname = PROFILE.username;
  var letter = uname.replace('@', '').charAt(0).toUpperCase();
  if (supa) {
    try {
      var r = await supa.from('ideas').insert({
        title: title,
        desc: desc,
        min_bet: min,
        target: ciTarget ? (parseInt(ciTarget.value, 10) || null) : null,
        expires_at: exp,
        created_at: new Date().toISOString(),
        author_id: ME ? ME.id : null,
        author_username: uname
      }).select().single();
      if (r.error) throw r.error;
      if (r.data) insertLive(r.data, uname, letter);
    } catch (e) {
      console.warn('insert error', e);
      toast('❌ Publish failed. Try again.', 'var(--red)');
      return;
    }
  } else {
    insertLive({ id: Date.now(), title: title, desc: desc, min_bet: min, expires_at: exp }, uname, letter);
  }
  closeMo('moCreate');
  toast('🚀 Idea published!', 'var(--ac)');
}

function insertLive(row, uname, letter) {
  if (LIVE.filter(function (x) { return x.id === row.id; }).length) return;
  LIVE.unshift({
    id: row.id, u: uname, av: letter, bg: 'linear-gradient(135deg,#e8c55a,#5ae8c5)', tm: 'just now', tag: 'AI Tools', minBet: row.min_bet || 10,
    title: row.title, body: row.desc || '', investors: 0, pool: '0', cd: '24', pct: 0
  });
  renderFeed();
}

function attachHold(id, ms, cb) {
  var el = document.getElementById(id);
  if (!el) return;
  var fresh = el.cloneNode(true);
  el.parentNode.replaceChild(fresh, el);
  el = fresh;
  el.style.setProperty('--hms', ms / 1000 + 's');
  var t = null, on = false;
  function start(e) {
    if ((e.button !== undefined && e.button !== 0) || on) return;
    on = true;
    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
    el.classList.add('holding');
    t = setTimeout(function () { cb(); reset(); }, ms);
  }
  function reset() {
    clearTimeout(t); t = null; on = false; el.classList.remove('holding');
  }
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', reset);
  el.addEventListener('mouseleave', reset);
  el.addEventListener('touchstart', function (e) { e.preventDefault(); start(e); }, { passive: false });
  el.addEventListener('touchend', function (e) { e.preventDefault(); reset(); }, { passive: false });
  el.addEventListener('touchcancel', reset);
}

function initRealtime() {
  if (!supa) return;
  try {
    if (realtimeIdeasChannel) supa.removeChannel(realtimeIdeasChannel);
    if (realtimeBalanceChannel) supa.removeChannel(realtimeBalanceChannel);
    realtimeIdeasChannel = supa.channel('ideas-rt');
    realtimeIdeasChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ideas' }, function (p) {
        var r = p.new;
        if (!LIVE.filter(function (x) { return x.id === r.id; }).length) {
          insertLive(r, r.author_username || '@anon', (r.author_username || 'A').charAt(1) || 'A');
        }
        toast('✨ New: ' + (r.title || '').slice(0, 26), 'var(--ac2)');
      }).subscribe();
    if (ME) {
      realtimeBalanceChannel = supa.channel('bal-rt');
      realtimeBalanceChannel
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.' + ME.id }, function (p2) {
          PROFILE.spk_balance = p2.new.spk_balance;
          updateHeader();
        }).subscribe();
    }
  } catch (e) {
    console.warn('Realtime error', e);
    featureToast('realtime', e);
  }
}

function openPanel(name) {
  document.querySelectorAll('.mob-tab').forEach(function (t) { t.classList.remove('active'); });
  var tab = document.querySelector('.mob-tab[data-panel="' + name + '"]');
  if (tab) tab.classList.add('active');
  var feed = document.querySelector('.feed');
  ['trends', 'leaders', 'chats', 'profile'].forEach(function (id) {
    var p = document.getElementById('panel-' + id);
    if (p) p.classList.remove('open');
  });
  if (name === 'feed') { if (feed) feed.style.display = ''; }
  else { if (feed) feed.style.display = 'none'; var t2 = document.getElementById('panel-' + name); if (t2) t2.classList.add('open'); }
}

function switchChatTab(tab) {
  document.querySelectorAll('.chat-tab-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.chatTab === tab); });
  var dms = document.getElementById('chat-dms');
  var topics = document.getElementById('chat-topics');
  if (dms) dms.classList.toggle('active', tab === 'dms');
  if (topics) topics.classList.toggle('active', tab === 'topics');
}

function openMo(id) { var el = document.getElementById(id); if (el) el.classList.add('open'); }
function closeMo(id) { var el = document.getElementById(id); if (el) el.classList.remove('open'); }

function toast(msg, color) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = color;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._t);
  t._t = setTimeout(function () {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(14px)';
  }, 2200);
}

async function reportClientError(kind, details) {
  var payload = {
    kind: kind,
    details: details || {},
    ts: new Date().toISOString(),
    lang: LANG
  };
  console.warn('[telemetry]', payload);
  if (!supa || !ENABLE_CLIENT_TELEMETRY) return;
  try {
    await supa.from('client_events').insert({
      user_id: ME ? ME.id : null,
      event_type: kind,
      payload: payload
    });
  } catch (e) {
    console.warn('telemetry skipped', e && e.message ? e.message : e);
  }
}

function pulse(el) {
  el.style.background = 'var(--sf2)';
  setTimeout(function () { el.style.background = ''; }, 180);
}

function bindAuthListener() {
  if (!supa || authListenerBound) return;
  authListenerBound = true;
  supa.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_OUT') {
      ME = null;
      appEntered = false;
      return;
    }
    if (!session || !session.user) return;
    ME = session.user;
    if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      return;
    }
    if (appEntered) return;
    if (!session.user.email_confirmed_at) {
      PENDING_EMAIL = session.user.email || PENDING_EMAIL;
      showVerify(PENDING_EMAIL, PENDING_NICK);
      return;
    }
    setTimeout(function () {
      fetchProfile().then(function () {
        enterApp();
      }).catch(function (e) {
        console.warn('profile on auth change', e);
        enterApp();
      });
    }, 100);
  });
}

async function restoreSession() {
  if (!supa) return false;
  try {
    if (window.location.hash.includes('access_token')) {
      var hashSession = await supa.auth.getSession();
      if (hashSession.data && hashSession.data.session && hashSession.data.session.user) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        ME = hashSession.data.session.user;
        if (!ME.email_confirmed_at) {
          showVerify(ME.email || '', PENDING_NICK);
          return true;
        }
        await fetchProfile();
        enterApp();
        return true;
      }
    }
    var r = await supa.auth.getSession();
    if (r.error) {
      console.warn('getSession error', r.error.message);
      return false;
    }
    if (r.data && r.data.session && r.data.session.user) {
      ME = r.data.session.user;
      if (!ME.email_confirmed_at) {
        showVerify(ME.email || '', PENDING_NICK);
        return true;
      }
      await fetchProfile();
      enterApp();
      return true;
    }
  } catch (e2) {
    console.warn('restoreSession error', e2);
  }
  return false;
}

function showConfigSetupMessage() {
  var msg = T('configSetup');
  console.warn('[SPARK]', msg);
  setAuthErr(msg);
}

async function bootApp() {
  if (!SUPABASE_CONFIGURED) {
    showConfigSetupMessage();
  }
  bindAuthListener();
  if (supa) {
    var restored = await restoreSession();
    if (restored) {
      applyLang();
      return;
    }
  }
  // Сессия не восстановлена — снимаем presession-класс, показываем экран входа
  document.documentElement.classList.remove('spark-presession');
  document.documentElement.classList.add('auth-active');
  var authScreen = document.getElementById('authScreen');
  if (authScreen) authScreen.classList.remove('gone');
  var launchOverlay = document.getElementById('launchOverlay');
  if (launchOverlay) launchOverlay.classList.add('gone');
  applyLang();
}

window.addEventListener('error', function (event) {
  reportClientError('window_error', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    col: event.colno
  });
});

window.addEventListener('unhandledrejection', function (event) {
  var reason = event && event.reason;
  reportClientError('unhandled_rejection', {
    message: reason && reason.message ? reason.message : String(reason)
  });
});
