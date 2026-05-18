/**
 * Загрузчик конфигурации SPARK (браузер).
 * Читает window.SPARK_CONFIG из config.js и применяет значения по умолчанию.
 */
(function (global) {
  var DEFAULTS = {
    SUPABASE_URL: 'https://ppehttbtrlavnrytoweu.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_9uAFLjS4AaElHus4hiUuQQ_PMSFNkb8',
    ALLOW_LEGACY_INVEST_FALLBACK: true,
    ENABLE_CLIENT_TELEMETRY: false
  };

  var raw = global.SPARK_CONFIG || {};
  var cfg = {};
  Object.keys(DEFAULTS).forEach(function (key) {
    if (raw[key] !== undefined && raw[key] !== null) {
      cfg[key] = raw[key];
    } else {
      cfg[key] = DEFAULTS[key];
    }
  });

  function isPlaceholder(value) {
    if (!value || typeof value !== 'string') return true;
    var v = value.trim();
    if (!v) return true;
    return (
      v.indexOf('your-') === 0 ||
      v.indexOf('YOUR_') === 0 ||
      v === 'https://your-project-ref.supabase.co'
    );
  }

  function isValidSupabaseUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      var u = new URL(url.trim());
      return u.protocol === 'https:' && u.hostname.endsWith('.supabase.co');
    } catch (e) {
      return false;
    }
  }

  function isValidAnonKey(key) {
    if (!key || typeof key !== 'string') return false;
    var k = key.trim();
    if (isPlaceholder(k)) return false;
    if (k.indexOf('sb_publishable_') === 0) return k.length > 24;
    var parts = k.split('.');
    return parts.length === 3 && parts[2].length > 20;
  }

  var supabaseReady = isValidSupabaseUrl(cfg.SUPABASE_URL) && isValidAnonKey(cfg.SUPABASE_ANON_KEY);

  global.SPARK_RUNTIME = {
    get: function (key) {
      return cfg[key];
    },
    all: function () {
      return Object.assign({}, cfg);
    },
    isSupabaseConfigured: function () {
      return supabaseReady;
    },
    integrationStatus: function () {
      return {
        supabase: supabaseReady ? 'ready' : 'unconfigured',
        telemetry: supabaseReady && cfg.ENABLE_CLIENT_TELEMETRY ? 'enabled' : 'disabled',
        legacyInvest: !!cfg.ALLOW_LEGACY_INVEST_FALLBACK
      };
    },
    supabaseAuthOptions: function () {
      return {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'spark_auth',
        flowType: 'pkce'
      };
    }
  };
})(window);

var supa = null;
var SUPABASE_URL = '';
var SUPABASE_ANON_KEY = '';
var ALLOW_LEGACY_INVEST_FALLBACK = true;
var ENABLE_CLIENT_TELEMETRY = false;
var SUPABASE_CONFIGURED = false;

var runtime = window.SPARK_RUNTIME;
if (runtime) {
  SUPABASE_URL = runtime.get('SUPABASE_URL') || '';
  SUPABASE_ANON_KEY = runtime.get('SUPABASE_ANON_KEY') || '';
  ALLOW_LEGACY_INVEST_FALLBACK = runtime.get('ALLOW_LEGACY_INVEST_FALLBACK') !== false;
  ENABLE_CLIENT_TELEMETRY = !!runtime.get('ENABLE_CLIENT_TELEMETRY');
  SUPABASE_CONFIGURED = runtime.isSupabaseConfigured();
}

try {
  if (SUPABASE_CONFIGURED && typeof supabase !== 'undefined') {
    supa = supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { auth: runtime ? runtime.supabaseAuthOptions() : { persistSession: true, storageKey: 'spark_auth' } }
    );
  } else if (!SUPABASE_CONFIGURED) {
    console.warn('Supabase config is missing or invalid. Running in demo mode.');
  }
} catch (e) {
  console.warn('Supabase init failed - demo mode', e);
  supa = null;
}
var db = supa;

var ME = null;
var PROFILE = { username: '@user123', spk_balance: 4520 };
var PENDING_EMAIL = '';
var PENDING_NICK = '';
var PENDING_REG_PASSWORD = '';
var REGISTRATION_STEP = 1;
var appEntered = false;
var authListenerBound = false;

var CC = '#e8c55a';
var EMOJIS = ['💀', '🗿', '🔥', '💎', '🚀'];
var FIRE_T = 100;
var RS = {};

function getRS(id) {
  if (!RS[id]) RS[id] = { counts: Object.fromEntries(EMOJIS.map(function (e) { return [e, 0]; })), pick: null };
  return RS[id];
}
getRS(1).counts['🔥'] = 99;
getRS(1).counts['💎'] = 44;

var SEEDS = [
  { id: 1, u: '@alex_ventures', av: 'A', bg: 'linear-gradient(135deg,#e8c55a,#e87a5a)', tm: '2h', tag: 'AI Tools', minBet: 10, title: 'AI-powered code review for solo devs', body: 'Automated PR review that learns your codebase style. Catches bugs, suggests refactors, and writes commit messages - all in under 10 seconds.', investors: 320, pool: '12,500', cd: '24', pct: 34 },
  { id: 2, u: '@maria_builds', av: 'M', bg: 'linear-gradient(135deg,#5ae8c5,#5a90e8)', tm: '5h', tag: 'CleanEnergy', minBet: 25, title: 'Rooftop solar leasing - zero upfront cost', body: 'Homeowners lease their roof space, we install panels, they get 15% energy bill reduction instantly. Revenue from grid surplus.', investors: 184, pool: '7,200', cd: '11', pct: 18 },
  { id: 3, u: '@kirill_vc', av: 'K', bg: 'linear-gradient(135deg,#e85a7a,#c55ae8)', tm: '8h', tag: 'B2B SaaS', minBet: 10, title: 'Async meeting summaries for Slack-heavy teams', body: 'Records voice memos in Slack, transcribes + summarises with action points, posts back to thread. No Zoom needed.', investors: 97, pool: '3,400', cd: '6', pct: 9 },
  { id: 4, u: '@dima_builds', av: 'D', bg: 'linear-gradient(135deg,#cd7f32,#aa5a22)', tm: '10h', tag: 'DeFi', minBet: 50, title: 'DeFi micro-lending for SME supply chains', body: 'Businesses unlock liquidity from unpaid invoices. Smart contracts settle in 48h. No credit check, no bank.', investors: 241, pool: '9,800', cd: '18', pct: 27 },
  { id: 5, u: '@sarah_angel', av: 'S', bg: 'linear-gradient(135deg,#c0c0c0,#8888aa)', tm: '13h', tag: 'Hardware', minBet: 10, title: 'Modular keyboard with swappable OS chips', body: 'Each chip runs a different OS profile. Swap from dev mode to design mode in seconds. MagSafe-style attachment.', investors: 156, pool: '5,100', cd: '32', pct: 41 },
  { id: 6, u: '@leo_founder', av: 'L', bg: 'linear-gradient(135deg,#5a90e8,#5ae8c5)', tm: '16h', tag: 'AI Tools', minBet: 10, title: 'Voice journal that auto-detects your mood trends', body: 'Record 30-second voice notes. AI extracts sentiment, energy, stress. Weekly report shows your emotional patterns.', investors: 88, pool: '2,900', cd: '40', pct: 15 },
  { id: 7, u: '@nina_builds', av: 'N', bg: 'linear-gradient(135deg,#e8a55a,#e8c55a)', tm: '20h', tag: 'Web3', minBet: 10, title: 'On-chain reputation score for freelancers', body: 'Client reviews stored on-chain, portable across platforms. No more starting from zero on every marketplace.', investors: 203, pool: '7,700', cd: '22', pct: 31 },
  { id: 8, u: '@tom_ideas', av: 'T', bg: 'linear-gradient(135deg,#c55ae8,#e85a7a)', tm: '1d', tag: 'B2B SaaS', minBet: 10, title: 'CRM built for indie consultants - single person', body: 'Full pipeline, invoicing, and follow-up automation. No seats, no bloat. Syncs with Gmail and Notion.', investors: 67, pool: '1,800', cd: '48', pct: 7 },
  { id: 9, u: '@vera_eco', av: 'V', bg: 'linear-gradient(135deg,#5ae8c5,#5a90e8)', tm: '1d', tag: 'CleanEnergy', minBet: 10, title: 'Community EV charging co-ops for apartment blocks', body: 'Residents collectively own charging infra in their parking lot. Monthly earnings split by share.', investors: 119, pool: '4,200', cd: '36', pct: 22 },
  { id: 10, u: '@boris_vc', av: 'B', bg: 'linear-gradient(135deg,#e8c55a,#5ae8c5)', tm: '2d', tag: 'DeFi', minBet: 100, title: 'Yield optimizer that auto-rebalances between chains', body: 'Set risk profile once. Smart contract moves your liquidity to highest-yield pools across 6 chains every 12h.', investors: 178, pool: '6,500', cd: '15', pct: 38 },
  { id: 11, u: '@kat_design', av: 'K', bg: 'linear-gradient(135deg,#e85a7a,#e8a55a)', tm: '2d', tag: 'AI Tools', minBet: 10, title: 'AI brand identity kit from a single mood board', body: 'Upload 5 images. Get logo options, color palette, font pair, and brand guide PDF in 2 minutes.', investors: 144, pool: '5,500', cd: '28', pct: 29 },
  { id: 12, u: '@pete_saas', av: 'P', bg: 'linear-gradient(135deg,#5a90e8,#c55ae8)', tm: '2d', tag: 'Hardware', minBet: 10, title: 'Posture sensor clip for remote workers', body: 'Attaches to shirt collar. Vibrates when you hunch. Weekly report shows posture score. $29 device, $0 subscription.', investors: 92, pool: '3,100', cd: '52', pct: 12 },
  { id: 13, u: '@mira_web3', av: 'M', bg: 'linear-gradient(135deg,#c55ae8,#5a90e8)', tm: '3d', tag: 'Web3', minBet: 10, title: 'Token-gated coworking memberships in 40 cities', body: 'Hold 100 $WORK tokens, access any partner coworking space worldwide.', investors: 231, pool: '8,900', cd: '10', pct: 44 },
  { id: 14, u: '@sam_builds', av: 'S', bg: 'linear-gradient(135deg,#e8c55a,#e87a5a)', tm: '3d', tag: 'B2B SaaS', minBet: 10, title: 'One-click privacy audit for SaaS companies', body: 'Scans your app, finds GDPR/CCPA gaps, generates remediation plan with priority order.', investors: 55, pool: '1,500', cd: '60', pct: 6 },
  { id: 15, u: '@olga_impact', av: 'O', bg: 'linear-gradient(135deg,#5ae8c5,#e8c55a)', tm: '3d', tag: 'CleanEnergy', minBet: 10, title: 'Carbon credit marketplace for urban gardeners', body: "Measure your garden's CO2 absorption. Sell certified credits to corporates.", investors: 109, pool: '3,800', cd: '44', pct: 20 }
];
var LIVE = SEEDS.slice();

var I18N = {
  en: {
    iot: 'Interest over time', cinv: 'investors', cpool: 'pool', cleft: 'left', binv: 'Invest', bcrit: 'Critique', noResults: 'No ideas match',
    launchCheckingSession: 'Syncing market signals...',
    launchPreparingWorkspace: 'Preparing your workspace...',
    signIn: 'Sign In', register: 'Register', rememberMe: 'Remember me', createAccount: 'Create Account →', signInBtn: 'Sign In →',
    nickname: 'Nickname', email: 'Email', password: 'Password', repeatPassword: 'Repeat Password', passMin: 'Password (8+ chars)',
    verifyTitle: 'Verify your email', verifyText: 'Registration is almost complete. Open',
    verifyText2: 'your inbox', verifyText3: 'and click the confirmation link.',
    verifyDone: '✅ I confirmed', resendMail: 'Send email again',
    profile: 'Profile', postIdea: '+ Post Idea', wallet: 'Wallet', trendingNow: 'Trending Now', leaderboard: 'Prophet Leaderboard',
    liveActivity: 'Live Activity', sortLabel: 'Sort:', tagLabel: 'Tag:', all: 'All', newSort: '🕐 New', popularSort: '🔥 Popular',
    profitSort: '📈 Profitable', endingSort: '⏱ Ending soon', feed: 'Explore', leaders: 'Leaders', chats: 'Chats', trends: 'Trends',
    chatDms: '💬 DMs', chatTopics: '🗂 Topics', newIdea: 'New Idea 💡', title: 'Title', description: 'Description',
    minBet: 'Min. bet (SPK)', targetOpt: 'Target (optional)', duration: 'Duration', holdPublish: 'Hold to Publish',
    holdInvest: 'Hold to Invest', holdHint: 'Hold 2 seconds to confirm', investModal: 'Invest 🚀', yourBalance: 'Your balance',
    language: 'Language', notifications: 'Notifications', privacy: 'Privacy', logout: 'Log out', availableBalance: 'Available balance',
    authVisualKicker: 'Premium Access', authVisualTitle: 'SPARK Market Intelligence',
    authVisualText: 'Trade ideas, follow momentum, and invest with high-signal insights in a secure environment.',
    ideas: 'Ideas', profit: 'Profit', invested: 'Invested', rank: 'Rank', settings: 'Settings', verifiedInvestor: '✓ Verified Investor',
    marketObservatory: 'Market Observatory', obsTech: 'Technology', obsEco: 'Ecology', obsSocial: 'Society',
    insufficientBalance: 'Insufficient balance',
    amountBelowMinBet: 'Amount is below minimum bet',
    ideaNotFound: 'Idea no longer exists',
    signInRequired: 'Sign in required',
    secureInvestFailed: 'Secure invest failed. Contact support.',
    legacyInvestMode: 'Server migration is missing. Running compatibility mode.',
    integration_auth: 'Sign-in is unavailable. Check Supabase keys in config.js.',
    integration_database: 'Live data unavailable. Demo content is still available.',
    integration_realtime: 'Live updates are temporarily unavailable.',
    integration_invest: 'Investing is temporarily unavailable.',
    integration_publish: 'Publishing is temporarily unavailable.',
    integration_registration: 'Email verification is unavailable. Deploy register-* edge functions.',
    regCodeSent: 'Verification code sent. Check your inbox and Spam folder.',
    regEnterCode: 'Enter the 6-digit code from your email',
    regVerifyBtn: 'Complete registration →',
    regBack: '← Back',
    regResendCode: 'Send code again',
    regCodeLabel: 'Verification code',
    regInvalidCode: 'Invalid or expired code',
    regComplete: 'Account created. Signing you in…',
    reg_err_migration: 'Registration database is not ready. Run: supabase db push (migration 20260516_pending_registrations).',
    reg_err_email: 'Email is not configured on the server. Set SMTP credentials in Edge Function secrets.',
    reg_err_functions: 'Registration service not found. Deploy register-send-code and register-verify edge functions.',
    reg_err_network: 'Cannot reach the server. Check your connection or site CSP (connect-src must allow *.supabase.co).',
    reg_err_invalid: 'Check email format, password (8+ chars), and nickname (1–30 characters).',
    reg_err_rate_limit: 'Too many attempts. Please wait 15 minutes.',
    configSetup: 'Supabase is not configured. Copy assets/js/config.example.js to config.js and set your project URL and anon key.',
    aboutUs: 'About Us',
    pwdUpdated: 'Password successfully updated',
    pwdErr: 'Error updating password',
    delCodeSent: 'Verification code for deletion sent to your email',
    delSuccess: 'Account permanently deleted',
    delErr: 'Error during account deletion'
  },
  ru: {
    iot: 'Интерес орбиты', cinv: 'инвесторов', cpool: 'пул', cleft: 'осталось', binv: 'Вложить', bcrit: 'Критика', noResults: 'Идеи не найдены',
    launchCheckingSession: 'Синхронизация рыночных сигналов...',
    launchPreparingWorkspace: 'Подготовка рабочего пространства...',
    signIn: 'Войти', register: 'Регистрация', rememberMe: 'Запомнить меня', createAccount: 'Создать аккаунт →', signInBtn: 'Войти →',
    nickname: 'Никнейм', email: 'Почта', password: 'Пароль', repeatPassword: 'Повторите пароль', passMin: 'Пароль (8+ символов)',
    verifyTitle: 'Подтвердите почту', verifyText: 'Регистрация почти завершена. Перейдите на',
    verifyText2: 'вашу почту', verifyText3: 'и нажмите на ссылку для подтверждения.',
    verifyDone: '✅ Я подтвердил(а)', resendMail: 'Отправить письмо повторно',
    profile: 'Профиль', postIdea: '+ Опубликовать идею', wallet: 'Кошелек', trendingNow: 'В тренде', leaderboard: 'Топ Пророков',
    liveActivity: 'Активность', sortLabel: 'Сортировка:', tagLabel: 'Тег:', all: 'Все', newSort: '🕐 Новые', popularSort: '🔥 Популярные',
    profitSort: '📈 Выгодные', endingSort: '⏱ Скоро конец', feed: 'Лента', leaders: 'Лидеры', chats: 'Чаты', trends: 'Тренды',
    chatDms: '💬 ЛС', chatTopics: '🗂 Темы', newIdea: 'Новая идея 💡', title: 'Заголовок', description: 'Описание',
    minBet: 'Мин. ставка (SPK)', targetOpt: 'Цель (опц.)', duration: 'Длительность', holdPublish: 'Удерживайте для публикации',
    holdInvest: 'Удерживайте для вложения', holdHint: 'Удерживайте 2 секунды для подтверждения', investModal: 'Инвестировать 🚀', yourBalance: 'Ваш баланс',
    language: 'Язык', notifications: 'Уведомления', privacy: 'Приватность', logout: 'Выйти', availableBalance: 'Доступный баланс',
    authVisualKicker: 'Премиальный доступ', authVisualTitle: 'SPARK Рыночная аналитика',
    authVisualText: 'Публикуйте идеи, отслеживайте импульс рынка и инвестируйте в защищенной среде.',
    ideas: 'Идеи', profit: 'Прибыль', invested: 'Инвестировано', rank: 'Ранг', settings: 'Настройки', verifiedInvestor: '✓ Проверенный инвестор',
    marketObservatory: 'Обсерватория рынка', obsTech: 'Технологии', obsEco: 'Экология', obsSocial: 'Социум',
    insufficientBalance: 'Недостаточно средств',
    amountBelowMinBet: 'Сумма ниже минимальной ставки',
    ideaNotFound: 'Идея больше не доступна',
    signInRequired: 'Требуется вход в аккаунт',
    secureInvestFailed: 'Безопасное инвестирование не выполнено. Обратитесь в поддержку.',
    legacyInvestMode: 'Серверная миграция не применена. Включен режим совместимости.',
    integration_auth: 'Вход недоступен. Проверьте ключи Supabase в config.js.',
    integration_database: 'Живые данные недоступны. Демо-контент доступен.',
    integration_realtime: 'Обновления в реальном времени временно недоступны.',
    integration_invest: 'Инвестирование временно недоступно.',
    integration_publish: 'Публикация временно недоступна.',
    integration_registration: 'Подтверждение почты недоступно. Разверните edge functions register-*.',
    regCodeSent: 'Код отправлен. Проверьте почту (и папку Спам).',
    regEnterCode: 'Введите 6-значный код из письма',
    regVerifyBtn: 'Завершить регистрацию →',
    regBack: '← Назад',
    regResendCode: 'Отправить код снова',
    regCodeLabel: 'Код подтверждения',
    regInvalidCode: 'Неверный или просроченный код',
    regComplete: 'Аккаунт создан. Выполняем вход…',
    reg_err_migration: 'База для регистрации не настроена. Выполните: supabase db push (миграция pending_registrations).',
    reg_err_email: 'Почта на сервере не настроена. Укажите параметры SMTP в секретах Edge Functions.',
    reg_err_functions: 'Сервис регистрации не найден. Разверните edge functions register-send-code и register-verify.',
    reg_err_network: 'Нет связи с сервером. Проверьте интернет или CSP сайта (connect-src должен разрешать *.supabase.co).',
    reg_err_invalid: 'Проверьте почту, пароль (от 8 символов) и ник (1–30 символов).',
    reg_err_rate_limit: 'Слишком много попыток. Пожалуйста, подождите 15 минут.',
    configSetup: 'Supabase не настроен. Скопируйте assets/js/config.example.js в config.js и укажите URL проекта и anon-ключ.',
    aboutUs: 'О нас',
    pwdUpdated: 'Пароль успешно обновлен',
    pwdErr: 'Ошибка обновления пароля',
    delCodeSent: 'Код для удаления отправлен на вашу почту',
    delSuccess: 'Аккаунт безвозвратно удален',
    delErr: 'Ошибка удаления аккаунта'
  }
};
var LANG = localStorage.getItem('spark_lang') || 'ru';
function T(k) { return (I18N[LANG] || I18N.en)[k] || I18N.en[k] || k; }
