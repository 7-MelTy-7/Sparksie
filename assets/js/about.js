/**
 * SPARK — О нас | script.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Модули:
 *  1. StarfieldEngine   — Canvas звёздное небо с мерцанием
 *  2. PathLineEngine    — SVG маршрут через центры планет
 *  3. ScrollActivation  — Intersection Observer: активация секций
 *  4. ParallaxEngine    — Параллакс активной планеты за мышью / тачем
 *  5. Init              — Запуск всего
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   1. STARFIELD ENGINE
   Canvas-слой с мерцающими звёздами.
   Каждая звезда — конечный автомат: BORN → BRIGHT → DIM → DEAD → (respawn)
   ═══════════════════════════════════════════════════════════════════════════ */

const StarfieldEngine = (() => {
  const STAR_COUNT  = 320;   // Количество звёзд
  const FPS_TARGET  = 40;    // Целевой FPS (экономим батарею)
  const FRAME_MS    = 1000 / FPS_TARGET;

  // Состояния жизненного цикла звезды
  const STATE = { BORN: 0, BRIGHT: 1, DIM: 2, DEAD: 3 };

  let canvas, ctx, stars = [], lastFrame = 0, raf = null;
  let W = 0, H = 0;

  /** Создать одну звезду в случайной позиции */
  function createStar(x, y) {
    const size     = Math.random() * 1.6 + 0.2;          // 0.2–1.8 px
    const maxAlpha = Math.random() * 0.55 + 0.2;         // 0.2–0.75
    const speed    = Math.random() * 0.004 + 0.001;      // скорость мерцания
    const phase    = Math.random() * Math.PI * 2;        // начальная фаза sin

    return {
      x:  x  ?? Math.random() * W,
      y:  y  ?? Math.random() * H,
      size,
      maxAlpha,
      alpha:     0,
      state:     STATE.BORN,
      speed,
      phase,
      phaseStep: speed,
      // Иногда звезда тёплая (слегка желтоватая), чаще холодная
      warm: Math.random() < 0.25,
    };
  }

  /** Обновить состояние одной звезды */
  function tickStar(s) {
    s.phase += s.phaseStep;

    switch (s.state) {
      case STATE.BORN:
        s.alpha += s.speed * 1.5;
        if (s.alpha >= s.maxAlpha) {
          s.alpha = s.maxAlpha;
          // Случайно: сразу гаснуть или немного побыть яркой
          s.state = Math.random() < 0.4 ? STATE.DIM : STATE.BRIGHT;
          s.brightTicks = Math.floor(Math.random() * 200 + 60);
        }
        break;

      case STATE.BRIGHT:
        // Лёгкое дыхание вокруг maxAlpha
        s.alpha = s.maxAlpha + Math.sin(s.phase) * (s.maxAlpha * 0.18);
        s.brightTicks--;
        if (s.brightTicks <= 0) s.state = STATE.DIM;
        break;

      case STATE.DIM:
        s.alpha -= s.speed * 0.8;
        if (s.alpha <= 0) {
          s.alpha = 0;
          s.state = STATE.DEAD;
        }
        break;

      case STATE.DEAD:
        // Respawn в случайной позиции с небольшой задержкой
        if (Math.random() < 0.008) {
          Object.assign(s, createStar());
        }
        break;
    }
  }

  /** Нарисовать одну звезду */
  function drawStar(s) {
    if (s.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));

    // Тёплые звёзды чуть желтоватые
    const color = s.warm ? `255,240,200` : `220,230,255`;
    ctx.fillStyle = `rgba(${color}, 1)`;

    // Небольшой glow для крупных звёзд
    if (s.size > 1.0 && s.alpha > 0.3) {
      ctx.shadowBlur  = s.size * 3.5;
      ctx.shadowColor = s.warm ? `rgba(255,220,120,0.6)` : `rgba(160,190,255,0.5)`;
    }

    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Главный цикл */
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (ts - lastFrame < FRAME_MS) return;
    lastFrame = ts;

    // Мягкий trail вместо полного clear — создаёт «хвосты» у ярких звёзд
    ctx.fillStyle = 'rgba(5,7,10,0.55)';
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => { tickStar(s); drawStar(s); });
  }

  /** Пересчитать размер canvas под экран */
  function resize() {
    W = window.innerWidth;
    H = document.documentElement.scrollHeight;
    // DPR для чёткости на ретина-экранах (ограничим 2x)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
  }

  function init() {
    canvas = document.getElementById('starfield');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    // Создаём звёзды сразу по всей высоте
    stars = Array.from({ length: STAR_COUNT }, () => {
      const s = createStar();
      // Начинаем в случайном состоянии жизненного цикла
      s.alpha = Math.random() * s.maxAlpha;
      s.state = Math.random() < 0.5 ? STATE.BRIGHT : STATE.DIM;
      s.brightTicks = Math.floor(Math.random() * 200);
      return s;
    });

    raf = requestAnimationFrame(loop);

    // Пересчёт при ресайзе (дебаунс 200ms)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); }, 200);
    });
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
  }

  return { init, destroy };
})();


/* ═══════════════════════════════════════════════════════════════════════════
   2. PATH LINE ENGINE
   SVG-маршрут, соединяющий центры всех планет.
   Кривая Безье через все точки + анимированная искра при скролле.
   ═══════════════════════════════════════════════════════════════════════════ */

const PathLineEngine = (() => {
  let svg, track, spark;
  let points   = [];   // [{x,y}] — центры планет в координатах страницы
  let totalLen = 0;

  /** Собрать координаты центров планет */
  function collectPoints() {
    const planets = document.querySelectorAll('[data-planet]');
    points = [];

    planets.forEach(wrap => {
      const planet = wrap.querySelector('.stop__planet');
      if (!planet) return;
      const r = planet.getBoundingClientRect();
      points.push({
        x: r.left + r.width  / 2,
        y: r.top  + r.height / 2 + window.scrollY,
      });
    });
  }

  /** Построить SVG path через все точки (кривые Безье) */
  function buildPath() {
    if (points.length < 2) return;

    // SVG занимает всю страницу
    const W = window.innerWidth;
    const H = document.documentElement.scrollHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.width  = W + 'px';
    svg.style.height = H + 'px';

    // Строим smooth path через все точки
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      // Контрольные точки — по горизонтали между prev и curr
      const cpY = (prev.y + curr.y) / 2;
      d += ` C ${prev.x} ${cpY}, ${curr.x} ${cpY}, ${curr.x} ${curr.y}`;
    }

    track.setAttribute('d', d);
    totalLen = track.getTotalLength();

    // Dash-offset: линия "рисуется" при скролле
    track.style.strokeDasharray  = totalLen;
    track.style.strokeDashoffset = totalLen;
  }

  /** Обновить прогресс линии (0–1) при скролле */
  function updateProgress() {
    if (!totalLen || points.length < 2) return;

    const scrollTop = window.scrollY;
    const vh        = window.innerHeight;

    // Начало: когда первая планета входит в центр вьюпорта
    // Конец:  когда последняя планета оказывается в центре вьюпорта
    // Формула: planet.y == scrollTop + vh/2  →  scrollTop == planet.y - vh/2
    const firstY = points[0].y               - vh * 0.5;
    const lastY  = points[points.length - 1].y - vh * 0.5;
    const range  = lastY - firstY;

    // Защита от деления на ноль (если все планеты на одной высоте)
    if (range <= 0) return;

    const progress = Math.min(1, Math.max(0, (scrollTop - firstY) / range));
    const offset   = totalLen * (1 - progress);

    track.style.strokeDashoffset = offset;

    // Двигаем искру по маршруту
    if (spark && totalLen > 0) {
      const pt = track.getPointAtLength(totalLen * progress);
      spark.setAttribute('cx', pt.x);
      spark.setAttribute('cy', pt.y);
      spark.style.opacity = progress > 0.01 && progress < 0.99 ? '1' : '0';
    }
  }

  function init() {
    svg   = document.getElementById('pathLine');
    track = document.getElementById('pathTrack');
    spark = document.getElementById('pathSpark');
    if (!svg || !track) return;

    // Небольшая задержка — дать CSS отрендерить планеты
    setTimeout(() => {
      collectPoints();
      buildPath();
      updateProgress();
    }, 300);

    window.addEventListener('scroll', updateProgress, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        collectPoints();
        buildPath();
        updateProgress();
      }, 250);
    });
  }

  return {
    init,
    rebuild: () => {
      collectPoints();
      buildPath();
      updateProgress(); // синхронизируем искру сразу после пересчёта
    },
  };
})();


/* ═══════════════════════════════════════════════════════════════════════════
   3. SCROLL ACTIVATION
   Intersection Observer: когда планета входит в центральную зону вьюпорта —
   секция получает класс .is-active (CSS делает всё остальное).
   ═══════════════════════════════════════════════════════════════════════════ */

const ScrollActivation = (() => {
  let observer;
  let activeSection = null;

  function activate(section) {
    if (activeSection === section) return;

    // Снимаем с предыдущей
    if (activeSection) {
      activeSection.classList.remove('is-active');
      activeSection.classList.add('was-active');
    }

    activeSection = section;
    section.classList.add('is-active');
    section.classList.remove('was-active');

    // Обновляем цвет акцента в header (если есть)
    const color = section.dataset.color;
    document.documentElement.style.setProperty('--accent-live', color || '#7dd3fc');
  }

  function deactivate(section) {
    if (activeSection === section) {
      section.classList.remove('is-active');
      section.classList.add('was-active');
      activeSection = null;
      document.documentElement.style.setProperty('--accent-live', 'transparent');
    }
  }

  function init() {
    const sections = document.querySelectorAll('.stop');
    if (!sections.length) return;

    // Зона срабатывания: центральные 30% вьюпорта
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          activate(entry.target);
        } else {
          // Деактивируем только если это текущая активная
          if (entry.target === activeSection) {
            deactivate(entry.target);
          }
        }
      });
    }, {
      rootMargin: '-28% 0px -28% 0px',
      threshold:  0,
    });

    sections.forEach(s => observer.observe(s));

    // Активируем первую секцию сразу если она видна
    const firstStop = document.getElementById('stop-01');
    if (firstStop) {
      const rect = firstStop.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setTimeout(() => activate(firstStop), 400);
      }
    }
  }

  function destroy() {
    if (observer) observer.disconnect();
  }

  return { init, destroy };
})();


/* ═══════════════════════════════════════════════════════════════════════════
   4. PARALLAX ENGINE
   Активная планета слегка смещается к курсору мыши (или к гироскопу).
   Эффект глубины — как будто сфера "притягивается" взглядом.
   ═══════════════════════════════════════════════════════════════════════════ */

const ParallaxEngine = (() => {
  const MAX_SHIFT  = 18;   // px — максимальное смещение
  const LERP_SPEED = 0.08; // скорость интерполяции (меньше = плавнее)

  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let raf = null;
  let active = false;

  function getActivePlanet() {
    const activeSection = document.querySelector('.stop.is-active');
    return activeSection ? activeSection.querySelector('[data-planet]') : null;
  }

  function tick() {
    raf = requestAnimationFrame(tick);

    const planet = getActivePlanet();
    if (!planet) {
      // Плавно возвращаем в 0
      currentX += (0 - currentX) * LERP_SPEED;
      currentY += (0 - currentY) * LERP_SPEED;
    } else {
      // Интерполяция к целевой позиции
      currentX += (targetX - currentX) * LERP_SPEED;
      currentY += (targetY - currentY) * LERP_SPEED;
      planet.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }

    // Сбрасываем предыдущую активную планету
    document.querySelectorAll('[data-planet]').forEach(p => {
      if (p !== planet) {
        p.style.transform = '';
      }
    });
  }

  function onMouseMove(e) {
    // Нормализуем позицию мыши (-1 до 1)
    const nx = (e.clientX / window.innerWidth  - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    targetX  =  nx * MAX_SHIFT;
    targetY  =  ny * MAX_SHIFT;
  }

  // Поддержка гироскопа на мобильных
  function onDeviceOrientation(e) {
    if (e.gamma == null || e.beta == null) return;
    const nx = Math.max(-1, Math.min(1, e.gamma / 20));
    const ny = Math.max(-1, Math.min(1, (e.beta - 40) / 20));
    targetX  =  nx * MAX_SHIFT;
    targetY  =  ny * MAX_SHIFT;
  }

  // Touch parallax
  function onTouchMove(e) {
    if (!e.touches.length) return;
    const t  = e.touches[0];
    const nx = (t.clientX / window.innerWidth  - 0.5) * 2;
    const ny = (t.clientY / window.innerHeight - 0.5) * 2;
    targetX  =  nx * (MAX_SHIFT * 0.6);
    targetY  =  ny * (MAX_SHIFT * 0.6);
  }

  function init() {
    window.addEventListener('mousemove',  onMouseMove,  { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
    }

    raf = requestAnimationFrame(tick);
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('mousemove',     onMouseMove);
    window.removeEventListener('touchmove',     onTouchMove);
    window.removeEventListener('deviceorientation', onDeviceOrientation);
  }

  return { init, destroy };
})();


/* ═══════════════════════════════════════════════════════════════════════════
   5. HERO SCROLL HINT
   Анимация «стрелки вниз» в hero-секции исчезает при скролле.
   ═══════════════════════════════════════════════════════════════════════════ */

const HeroEngine = (() => {
  function init() {
    const hint = document.querySelector('.hero-scroll-hint');
    if (!hint) return;

    const hide = () => {
      if (window.scrollY > 80) {
        hint.style.opacity = '0';
        hint.style.pointerEvents = 'none';
      } else {
        hint.style.opacity = '1';
      }
    };

    window.addEventListener('scroll', hide, { passive: true });
  }

  return { init };
})();


/* ═══════════════════════════════════════════════════════════════════════════
   6. SMOOTH SCROLL — якорные ссылки
   ═══════════════════════════════════════════════════════════════════════════ */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}


/* ═══════════════════════════════════════════════════════════════════════════
   7. REDUCED MOTION — уважаем системные настройки
   ═══════════════════════════════════════════════════════════════════════════ */

function respectReducedMotion() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) {
    // Отключаем тяжёлые анимации: звёзды и параллакс
    document.documentElement.classList.add('reduced-motion');
    const canvas = document.getElementById('starfield');
    if (canvas) canvas.style.display = 'none';
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   8. PLANET HOVER — усиленное свечение при hover (дополнение к CSS)
   Добавляем небольшой scale transform при наведении через JS,
   чтобы работало плавнее вместе с параллаксом.
   ═══════════════════════════════════════════════════════════════════════════ */

function initPlanetHover() {
  document.querySelectorAll('.stop__planet-wrap').forEach(wrap => {
    wrap.addEventListener('mouseenter', () => {
      wrap.classList.add('is-hovered');
    });
    wrap.addEventListener('mouseleave', () => {
      wrap.classList.remove('is-hovered');
    });
  });
}


/* ═══════════════════════════════════════════════════════════════════════════
   9. TEXT REVEAL — дополнительный контроль fade-in текста
   CSS делает основную работу, JS только добавляет класс .text-ready
   когда секция становится активной — это позволяет сбросить анимацию
   при повторном входе.
   ═══════════════════════════════════════════════════════════════════════════ */

function initTextReveal() {
  // Observer для текстовых блоков — чуть более широкая зона
  const textObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('text-visible');
      }
      // Опционально: сбрасывать при выходе для повторной анимации
      // else { entry.target.classList.remove('text-visible'); }
    });
  }, {
    rootMargin: '-15% 0px -15% 0px',
    threshold: 0.1,
  });

  document.querySelectorAll('.stop__text').forEach(el => {
    textObserver.observe(el);
  });
}


/* ═══════════════════════════════════════════════════════════════════════════
   10. HEADER SCROLL BEHAVIOR — прячем хедер при быстром скролле вниз
   ═══════════════════════════════════════════════════════════════════════════ */

function initHeaderBehavior() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let lastScroll = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const curr  = window.scrollY;
      const delta = curr - lastScroll;

      if (curr < 80) {
        // Всегда показываем у самого верха
        header.classList.remove('header--hidden');
      } else if (delta > 8) {
        // Скролл вниз — прячем
        header.classList.add('header--hidden');
      } else if (delta < -8) {
        // Скролл вверх — показываем
        header.classList.remove('header--hidden');
      }

      lastScroll = curr;
      ticking = false;
    });
  }, { passive: true });
}


/* ═══════════════════════════════════════════════════════════════════════════
   INIT — точка входа
   ═══════════════════════════════════════════════════════════════════════════ */

function init() {
  // Сначала проверяем reduced motion
  respectReducedMotion();

  // Запускаем все модули
  StarfieldEngine.init();
  PathLineEngine.init();
  ScrollActivation.init();
  ParallaxEngine.init();
  HeroEngine.init();
  initSmoothScroll();
  initPlanetHover();
  initTextReveal();
  initHeaderBehavior();

  // Пересчитываем линию после полной загрузки шрифтов и изображений
  window.addEventListener('load', () => {
    setTimeout(() => PathLineEngine.rebuild(), 200);
  });
}

// Запуск после готовности DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
