/* =========================================================
   ARTUR // portfolio script
   ========================================================= */

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- console easter egg ---------- */
console.log(
  '%cVocê abriu o console. Curioso(a), hein?',
  'color:#39ff8c;font-family:monospace;font-size:14px;font-weight:bold;'
);
console.log(
  '%cSe você é dev e está lendo isso: vamos trocar uma ideia -> arturtmelo1@gmail.com',
  'color:#00e0ff;font-family:monospace;font-size:12px;'
);

/* ---------- shared scroll-lock helper (reference-counted: several overlays can hold it at once) ----------
   plain `overflow: hidden` on body doesn't reliably block touch-drag
   scrolling on mobile — pinning body with position:fixed does, so the
   background page can't move at all while a modal/overlay is open */
let scrollLockCount = 0;
let lockedScrollY = 0;
function lockScroll() {
  scrollLockCount++;
  if (scrollLockCount > 1) return;
  lockedScrollY = window.scrollY;
  document.body.classList.add('no-scroll');
  document.body.style.top = `-${lockedScrollY}px`;
}
function unlockScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount > 0) return;
  document.body.classList.remove('no-scroll');
  document.body.style.top = '';
  // an instant jump, not the site's global smooth-scroll — this just puts
  // the page back where it visually already was, so it must not animate
  window.scrollTo({ top: lockedScrollY, left: 0, behavior: 'instant' });
}
function scrollToId(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

/* ---------- theme engine ---------- */
const THEMES = {
  matrix: { label: 'Matrix (verde)' },
  amber: { label: 'Amber CRT' },
  dracula: { label: 'Dracula' },
  nord: { label: 'Nord' },
  synthwave: { label: 'Synthwave' },
};

function applyTheme(name) {
  if (!THEMES[name]) name = 'matrix';
  if (name === 'matrix') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', name);
  try { localStorage.setItem('artur-theme', name); } catch (e) {}
}

(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('artur-theme'); } catch (e) {}
  if (saved && THEMES[saved]) applyTheme(saved);
})();

/* ---------- performance helpers ---------- */

// The canvases read theme colors every frame; getComputedStyle() several times
// per frame at 60fps is needless style work, since the theme only changes on an
// explicit switch. Cache the reads and drop the cache when data-theme changes.
let themeVarCache = {};
const themeChangeListeners = [];
function getThemeVar(name, fallback) {
  if (!(name in themeVarCache)) {
    themeVarCache[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  return themeVarCache[name] || fallback;
}
function onThemeChange(fn) { themeChangeListeners.push(fn); }
new MutationObserver(() => {
  themeVarCache = {};
  themeChangeListeners.forEach((fn) => fn());
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// requestAnimationFrame loop that idles while its element is scrolled out of
// view (or the tab is hidden) and resumes on its own when it comes back.
// `minIntervalMs` caps the redraw rate for purely decorative animation.
function visibleLoop(el, step, minIntervalMs = 0) {
  let onScreen = true;
  let rafId = 0;
  let lastRun = 0;
  function frame(t) {
    rafId = 0;
    if (!onScreen || document.hidden) return;
    if (t - lastRun >= minIntervalMs) {
      lastRun = t;
      step(t);
    }
    rafId = requestAnimationFrame(frame);
  }
  function kick() {
    if (!rafId && onScreen && !document.hidden) rafId = requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      kick();
    }).observe(el);
  }
  document.addEventListener('visibilitychange', kick);
  kick();
}

/* ---------- sound (synthesized, no audio files needed) ---------- */
let audioCtx = null;
let soundEnabled = true;
try { soundEnabled = localStorage.getItem('artur-sound') !== 'off'; } catch (e) {}

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration = 0.08, type = 'square', gain = 0.05, delay = 0) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const startAt = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ctx.destination);
    g.gain.setValueAtTime(gain, startAt);
    g.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  } catch (e) {}
}

function playClick() { playTone(550 + Math.random() * 200, 0.03, 'square', 0.025); }
function playEat() { playTone(880, 0.06, 'sine', 0.05); playTone(1320, 0.08, 'sine', 0.04, 0.05); }
function playGameOver() { playTone(220, 0.35, 'sawtooth', 0.045); }
function playMaximize() { playTone(440, 0.06, 'triangle', 0.04); playTone(880, 0.09, 'triangle', 0.04, 0.06); }
function playRestore() { playTone(880, 0.06, 'triangle', 0.04); playTone(440, 0.09, 'triangle', 0.04, 0.06); }
function playAchievementSound() {
  playTone(523.25, 0.1, 'triangle', 0.05);
  playTone(659.25, 0.1, 'triangle', 0.05, 0.1);
  playTone(783.99, 0.18, 'triangle', 0.05, 0.2);
}

/* ---------- achievements + toasts ---------- */
const ACHIEVEMENTS = {
  terminal: { label: 'Hacker Casual', desc: 'Rodou um comando no terminal.' },
  konami: { label: 'Código Konami', desc: 'Digitou (ou tocou) o código secreto do joystick.' },
  logo5x: { label: 'Dedo Rápido', desc: 'Clicou 5x no logo em menos de um segundo.' },
  palette: { label: 'Power User', desc: 'Abriu a paleta de comandos (Ctrl+K).' },
  theme: { label: 'Decorador de Terminal', desc: 'Trocou o esquema de cores do site.' },
  arcade: { label: 'Modo Arcade', desc: 'Comeu a primeira maçã no Snake, lá no playground.' },
  hacker: { label: 'Script Kiddie', desc: 'Tentou invadir o mainframe com o comando hack.' },
  speedtyper: { label: 'Dedos de Fibra Óptica', desc: 'Bateu 60+ WPM na corrida de digitação.' },
  maze: { label: 'Rato de Labirinto', desc: 'Resolveu 3 labirintos de palavras no playground.' },
};

// UI icons are masked SVGs filled with the site palette (see .ui-icon in the CSS)
const uiIcon = (name) => `<span class="ui-icon ui-icon--${name}" aria-hidden="true"></span>`;

let unlocked = new Set();
try { unlocked = new Set(JSON.parse(localStorage.getItem('artur-achievements') || '[]')); } catch (e) {}
// drop ids of achievements that no longer exist (a retired game, say) so the counter stays honest
unlocked = new Set([...unlocked].filter((id) => ACHIEVEMENTS[id]));

let trophyBtn = null;
function updateTrophyBadge() {
  if (!trophyBtn) return;
  trophyBtn.querySelector('.trophy__count').textContent = `${unlocked.size}/${Object.keys(ACHIEVEMENTS).length}`;
  trophyBtn.classList.toggle('is-complete', unlocked.size === Object.keys(ACHIEVEMENTS).length);
}

let toastStack = null;
function ensureToastStack() {
  if (toastStack) return toastStack;
  toastStack = document.createElement('div');
  toastStack.className = 'toast-stack';
  document.body.appendChild(toastStack);
  return toastStack;
}

function copyToClipboard(text, { icon, successLabel, successDesc } = {}) {
  const onFail = () => showToast({
    icon: 'warn',
    label: 'Não copiou automaticamente',
    desc: 'Seu navegador bloqueou a área de transferência — selecione e copie o texto manualmente.'
  });
  if (!navigator.clipboard?.writeText) { onFail(); return; }
  navigator.clipboard.writeText(text)
    .then(() => showToast({ icon: icon || 'clipboard', label: successLabel || 'Copiado!', desc: successDesc || 'Já está na sua área de transferência.' }))
    .catch(onFail);
}

function showToast({ label, desc, icon }) {
  const stack = ensureToastStack();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast__icon">${uiIcon(icon || 'trophy')}</span><span class="toast__body"><strong>${label}</strong><br>${desc}</span>`;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => {
    el.classList.remove('in');
    setTimeout(() => el.remove(), 350);
  }, 4200);
}

function unlockAchievement(id) {
  if (unlocked.has(id) || !ACHIEVEMENTS[id]) return;
  unlocked.add(id);
  try { localStorage.setItem('artur-achievements', JSON.stringify([...unlocked])); } catch (e) {}
  showToast(ACHIEVEMENTS[id]);
  playAchievementSound();
  updateTrophyBadge();
  if (unlocked.size === Object.keys(ACHIEVEMENTS).length) {
    setTimeout(() => showToast({
      icon: 'medal',
      label: 'Sistema Totalmente Explorado',
      desc: 'Você encontrou todas as conquistas escondidas. Impressionante.'
    }), 900);
  }
}

let achModalEl = null;
function openAchievementsModal() {
  if (!achModalEl) {
    achModalEl = document.createElement('div');
    achModalEl.className = 'palette-backdrop achievements-modal';
    document.body.appendChild(achModalEl);
    achModalEl.addEventListener('click', (e) => { if (e.target === achModalEl) closeAchievementsModal(); });
  }
  achModalEl.innerHTML = `
    <div class="palette achievements-panel">
      <h3>Conquistas <span class="tabular">${unlocked.size}/${Object.keys(ACHIEVEMENTS).length}</span></h3>
      <ul class="achievements-list">
        ${Object.entries(ACHIEVEMENTS).map(([id, a]) => `
          <li class="${unlocked.has(id) ? 'unlocked' : 'locked'}">
            <span class="achievements-list__icon">${uiIcon(unlocked.has(id) ? 'trophy' : 'lock')}</span>
            <span><strong>${a.label}</strong><br><span class="muted">${unlocked.has(id) ? a.desc : '???'}</span></span>
          </li>`).join('')}
      </ul>
      <button type="button" class="btn btn--ghost" id="achModalClose">fechar_(x)</button>
    </div>`;
  achModalEl.classList.add('open');
  lockScroll();
  achModalEl.querySelector('#achModalClose').addEventListener('click', closeAchievementsModal);
}
function closeAchievementsModal() {
  if (achModalEl) achModalEl.classList.remove('open');
  unlockScroll();
}

/* ---------- keyboard shortcuts modal ---------- */
let shortcutsModalEl = null;
const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], alt: '⌘K', desc: 'abrir a paleta de comandos' },
  { keys: ['?'], desc: 'abrir esta lista de atalhos' },
  { keys: ['Esc'], desc: 'fechar modais ou restaurar uma janela maximizada' },
  { keys: ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A'], desc: 'código Konami — no celular, toque em ↑↑↓↓←→←→BA no rodapé' },
  { keys: ['WASD'], alt: 'setas', desc: 'controlar o Snake, no playground' },
];
function openShortcutsModal() {
  if (!shortcutsModalEl) {
    shortcutsModalEl = document.createElement('div');
    shortcutsModalEl.className = 'palette-backdrop shortcuts-modal';
    document.body.appendChild(shortcutsModalEl);
    shortcutsModalEl.addEventListener('click', (e) => { if (e.target === shortcutsModalEl) closeShortcutsModal(); });
  }
  shortcutsModalEl.innerHTML = `
    <div class="palette achievements-panel">
      <h3>Atalhos</h3>
      <ul class="shortcuts-list">
        ${SHORTCUTS.map(s => `
          <li>
            <span class="shortcuts-list__keys">${s.keys.map(k => `<kbd>${k}</kbd>`).join('')}${s.alt ? ` <span class="muted">ou</span> <kbd>${s.alt}</kbd>` : ''}</span>
            <span class="shortcuts-list__desc">${s.desc}</span>
          </li>`).join('')}
      </ul>
      <button type="button" class="btn btn--ghost" id="shortcutsModalClose">fechar_(x)</button>
    </div>`;
  shortcutsModalEl.classList.add('open');
  lockScroll();
  shortcutsModalEl.querySelector('#shortcutsModalClose').addEventListener('click', closeShortcutsModal);
}
function closeShortcutsModal() {
  if (shortcutsModalEl) shortcutsModalEl.classList.remove('open');
  unlockScroll();
}

/* ---------- boot sequence ---------- */
(function boot() {
  const boot = document.getElementById('boot');
  const linesEl = document.getElementById('bootLines');
  const lines = [
    'iniciando sistema...',
    'não bugou!',
    'seja bem-vindo(a), visitante.'
  ];
  let i = 0;

  function typeLine() {
    if (i >= lines.length) {
      setTimeout(hideBoot, 180);
      return;
    }
    const p = document.createElement('p');
    p.className = i === lines.length - 1 ? 'ok' : '';
    linesEl.appendChild(p);
    const text = (i < lines.length - 1 ? '> ' : '$ ') + lines[i];
    let c = 0;
    const iv = setInterval(() => {
      p.textContent = text.slice(0, c + 1);
      c++;
      if (c >= text.length) {
        clearInterval(iv);
        i++;
        setTimeout(typeLine, 40);
      }
    }, 8);
  }

  function hideBoot() {
    boot.classList.add('hidden');
    setTimeout(() => boot.remove(), 300);
  }

  boot.addEventListener('click', hideBoot);
  typeLine();
})();

/* ---------- custom cursor (event delegation so it covers dynamically-added UI too) ---------- */
(function cursor() {
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;
  let mx = 0, my = 0, rx = 0, ry = 0;
  let rafId = 0;

  // The ring eases toward the pointer. It only needs frames while it's still
  // catching up — an always-on loop kept the page waking every frame even
  // with a still mouse (or no mouse at all, on touch devices).
  function loop() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    rafId = (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) ? requestAnimationFrame(loop) : 0;
  }

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    if (!rafId) rafId = requestAnimationFrame(loop);
  });

  const HOVER_SELECTOR = 'a, button, input, select, .project-card, .fact-card, .palette__result';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(HOVER_SELECTOR)) ring.classList.add('is-active');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(HOVER_SELECTOR)) ring.classList.remove('is-active');
  });
})();

/* ---------- hero glow follows mouse ---------- */
(function heroGlow() {
  const glow = document.getElementById('heroGlow');
  const hero = document.getElementById('hero');
  if (!glow || !hero) return;
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glow.style.transform = `translate(${x - 250}px, ${y - 250}px)`;
  });
})();

/* ---------- matrix rain (recolors live with the active theme) ---------- */
(function matrix() {
  const canvas = document.getElementById('matrix-canvas');
  const ctx = canvas.getContext('2d');
  let w, h, cols, drops, accent;
  const chars = 'アイウエオカキクケコサシスセソ01アルツールデコード{}<>/;#$%&*ARTUR'.split('');

  function readAccent() {
    accent = getThemeVar('--green', '#39ff8c');
  }
  readAccent();
  onThemeChange(readAccent); // repaint color the moment the theme switches

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    cols = Math.floor(w / 16);
    drops = new Array(cols).fill(1);
  }
  window.addEventListener('resize', resize);
  resize();

  // Runs at ~30fps instead of once per display refresh: the full-viewport fade
  // fill is the expensive part, and it was being repeated 60-144x a second (so
  // the rain also ran faster on high-refresh screens). Each tick now steps two
  // rows and stamps both, with the fade strength doubled to match, so the speed
  // and trail length look the same as before at 60Hz.
  const TICK_MS = 30;
  const STEPS_PER_TICK = 2;
  function draw() {
    ctx.fillStyle = 'rgba(5,6,10,0.117)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.font = '14px monospace';
    for (let i = 0; i < drops.length; i++) {
      for (let s = 0; s < STEPS_PER_TICK; s++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * 16, drops[i] * 16);
        if (drops[i] * 16 > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
  }
  // prefers-reduced-motion: the rest of the site drops its decorative motion,
  // so the rain freezes into a single sparse still instead of falling
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    const paintStill = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = '14px monospace';
      ctx.fillStyle = accent;
      const rows = Math.floor(h / 16);
      for (let i = 0; i < cols; i++) {
        if (Math.random() > 0.35) continue;
        const head = Math.floor(Math.random() * rows);
        for (let k = 0; k < 7 && head - k >= 0; k++) {
          ctx.globalAlpha = 0.5 * (1 - k / 7);
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 16, (head - k) * 16);
        }
      }
      ctx.globalAlpha = 1;
    };
    paintStill();
    window.addEventListener('resize', paintStill);
    onThemeChange(paintStill);
    return;
  }

  visibleLoop(canvas, draw, TICK_MS);
})();

/* ---------- typewriter roles ---------- */
(function typewriter() {
  const el = document.getElementById('typewriter');
  if (!el) return;
  const roles = [
    'Desenvolvedor Full-Stack',
    'C# & .NET',
    'Cloud & Azure',
    'Python',
  ];
  let ri = 0, ci = 0, deleting = false, timeoutId = null;

  function tick() {
    const word = roles[ri];
    if (!deleting) {
      ci++;
      el.textContent = word.slice(0, ci);
      if (ci === word.length) {
        deleting = true;
        timeoutId = setTimeout(tick, 1400);
        return;
      }
    } else {
      ci--;
      el.textContent = word.slice(0, ci);
      if (ci === 0) {
        deleting = false;
        ri = (ri + 1) % roles.length;
      }
    }
    timeoutId = setTimeout(tick, deleting ? 35 : 65);
  }
  tick();

  // printing mid-type/mid-erase would otherwise freeze on a half-typed word
  window.addEventListener('beforeprint', () => {
    clearTimeout(timeoutId);
    el.textContent = roles[0];
  });
  // ...and pick the animation back up afterwards instead of leaving it frozen
  window.addEventListener('afterprint', () => {
    ri = 0;
    ci = roles[0].length;
    deleting = true;
    timeoutId = setTimeout(tick, 1400);
  });
})();

/* ---------- live stats (lifetime / cpu) ---------- */
(function stats() {
  const uptimeEl = document.getElementById('statUptime');
  const cpuEl = document.getElementById('statCpu');

  // nascimento de Artur — o stat vira um "lifetime uptime" mesmo
  const START = new Date('2002-06-07T13:00:00');

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateUptime() {
    const diff = Date.now() - START.getTime();
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    uptimeEl.textContent = `${days}d ${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  function updateFakeStats() {
    cpuEl.textContent = (20 + Math.random() * 60).toFixed(0) + '%';
  }

  updateUptime();
  updateFakeStats();
  setInterval(updateUptime, 1000);
  setInterval(updateFakeStats, 2500);
})();

/* ---------- status stat: mostly ONLINE, occasionally glitches into a slow-blinking ERROR ---------- */
(function statusGlitch() {
  const statusEl = document.getElementById('statStatus');
  if (!statusEl) return;

  function goError() {
    statusEl.textContent = 'ERROR !';
    statusEl.classList.remove('stat__value--online');
    statusEl.classList.add('stat__value--error');
    setTimeout(goOnline, 3000);
  }
  function goOnline() {
    statusEl.textContent = 'ONLINE';
    statusEl.classList.remove('stat__value--error');
    statusEl.classList.add('stat__value--online');
    scheduleGlitch();
  }
  function scheduleGlitch() {
    setTimeout(goError, 20000 + Math.random() * 25000);
  }
  scheduleGlitch();
})();

/* ---------- scroll reveal ---------- */
(function reveal() {
  const items = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(el => io.observe(el));
})();

/* ---------- scramble/decode reveal for section titles ---------- */
function scrambleText(el, finalText, duration = 650) {
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*<>/\\';
  const totalFrames = 16;
  let frame = 0;
  clearInterval(el._scrambleIv); // a still-running scramble must never fight the new one
  el._scrambleIv = setInterval(() => {
    frame++;
    const revealCount = Math.floor((frame / totalFrames) * finalText.length);
    el.textContent = finalText.split('').map((ch, i) => {
      if (ch === ' ') return ' ';
      return i < revealCount ? ch : glyphs[Math.floor(Math.random() * glyphs.length)];
    }).join('');
    if (frame >= totalFrames) {
      clearInterval(el._scrambleIv);
      el._scrambleIv = null;
      el.textContent = finalText;
    }
  }, duration / totalFrames);
}

(function scrambleTitles() {
  const titles = document.querySelectorAll('.section__title');
  const seen = new WeakSet();
  titles.forEach(t => { t.dataset.final = t.textContent.trim(); });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !seen.has(entry.target)) {
        seen.add(entry.target);
        scrambleText(entry.target, entry.target.dataset.final);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  titles.forEach(t => io.observe(t));

  // printing (Ctrl+P) can happen mid-scramble, before a below-the-fold title
  // has ever animated, or even retrigger one — print layout has no bounded
  // viewport, so the observer can fire (or re-fire) titles right as we print.
  // Disconnect it for good so nothing can re-scramble the text afterward.
  window.addEventListener('beforeprint', () => {
    io.disconnect();
    titles.forEach(t => {
      clearInterval(t._scrambleIv);
      t._scrambleIv = null;
      t.textContent = t.dataset.final;
    });
  });
})();

/* ---------- functional window controls (yellow = minimize, red = close) ---------- */
let maxBackdrop = null;
let currentMaximized = null;
let maxOriginalParent = null;
let maxOriginalNextSibling = null;

function ensureMaxBackdrop() {
  if (maxBackdrop) return maxBackdrop;
  maxBackdrop = document.createElement('div');
  maxBackdrop.className = 'terminal-window-max-backdrop';
  document.body.appendChild(maxBackdrop);
  // only restore when the backdrop itself is clicked, not the window it now contains
  maxBackdrop.addEventListener('click', (e) => { if (e.target === maxBackdrop) restoreMaximized(); });

  return maxBackdrop;
}

function restoreMaximized() {
  if (!currentMaximized) return;
  currentMaximized.classList.remove('terminal-window--maximized');
  if (maxOriginalNextSibling) {
    maxOriginalParent.insertBefore(currentMaximized, maxOriginalNextSibling);
  } else if (maxOriginalParent) {
    maxOriginalParent.appendChild(currentMaximized);
  }
  currentMaximized = null;
  maxOriginalParent = null;
  maxOriginalNextSibling = null;
  maxBackdrop?.classList.remove('open');
  unlockScroll();
  playRestore();
}

(function windowControls() {
  document.querySelectorAll('.terminal-window').forEach(win => {
    const bar = win.querySelector('.terminal-window__bar');
    const yellow = bar?.querySelector('.dot--yellow');
    const red = bar?.querySelector('.dot--red');
    const green = bar?.querySelector('.dot--green');
    if (!bar || !yellow || !red) return;

    // mousedown's native "focus the clicked target" default action would
    // otherwise steal focus back from wherever the click handler sends it
    // (e.g. maximize handing focus to the terminal input) — tabindex="0" is
    // only here for keyboard activation, not mouse focus, so suppress that
    const preventMouseFocus = (e) => e.preventDefault();

    yellow.setAttribute('role', 'button');
    yellow.setAttribute('tabindex', '0');
    yellow.setAttribute('aria-label', 'minimizar janela');
    yellow.addEventListener('mousedown', preventMouseFocus);
    red.setAttribute('role', 'button');
    red.setAttribute('tabindex', '0');
    red.setAttribute('aria-label', 'fechar janela');
    red.addEventListener('mousedown', preventMouseFocus);

    function toggleMinimize(e) {
      e.stopPropagation();
      if (win === currentMaximized) restoreMaximized(); // can't be minimized and maximized at once
      win.classList.toggle('terminal-window--minimized');
    }
    yellow.addEventListener('click', toggleMinimize);
    yellow.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMinimize(e); } });

    // clicking the bar itself while minimized restores the window
    bar.addEventListener('click', () => {
      if (win.classList.contains('terminal-window--minimized')) win.classList.remove('terminal-window--minimized');
    });

    if (green) {
      green.setAttribute('role', 'button');
      green.setAttribute('tabindex', '0');
      green.setAttribute('aria-label', 'maximizar janela');
      green.addEventListener('mousedown', preventMouseFocus);

      function toggleMaximize(e) {
        e.stopPropagation();
        if (win === currentMaximized) { restoreMaximized(); return; }
        if (currentMaximized) restoreMaximized(); // only one window maximized at a time
        win.classList.remove('terminal-window--minimized'); // can't be minimized and maximized at once
        win.classList.add('terminal-window--maximized');
        currentMaximized = win;
        maxOriginalParent = win.parentElement;
        maxOriginalNextSibling = win.nextElementSibling;
        const backdrop = ensureMaxBackdrop();
        backdrop.appendChild(win);
        backdrop.classList.add('open');
        lockScroll();
        playMaximize();
        // maximizing is an explicit "let me use this" action — jump straight
        // into any text input it has (real terminal, typing game) instead of
        // making people click again to start typing
        const focusable = win.querySelector('input[type="text"], textarea');
        if (focusable) {
          // On a scrolled page, Chromium can silently drop this focus a beat
          // later while it settles the fixed-position backdrop into place —
          // reassert a few times over the next half second so it sticks
          // without waiting on any one event that may or may not fire first
          [0, 60, 150, 300, 500].forEach((delay) => {
            setTimeout(() => {
              if (win.classList.contains('terminal-window--maximized') && document.activeElement !== focusable) {
                focusable.focus({ preventScroll: true });
              }
            }, delay);
          });
        }
      }
      green.addEventListener('click', toggleMaximize);
      green.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMaximize(e); } });
    }

    function closeWindow(e) {
      e.stopPropagation();
      // a window must always reopen in its normal state, never stuck minimized/maximized
      if (win === currentMaximized) restoreMaximized();
      win.classList.remove('terminal-window--minimized');
      const title = win.querySelector('.terminal-window__title')?.textContent.trim() || 'janela';
      const restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'terminal-window__restore';
      restore.innerHTML = `<span class="terminal-window__restore-icon" aria-hidden="true"></span> <strong>${title}</strong> <span class="terminal-window__restore-status">— fechada, clique para reabrir</span>`;
      restore.addEventListener('click', () => restore.replaceWith(win));
      win.replaceWith(restore);
    }
    red.addEventListener('click', closeWindow);
    red.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeWindow(e); } });
  });
})();

document.addEventListener('keydown', (e) => {
  // only close the topmost thing: leave a maximized window (or the zoomed Snake) alone if the
  // command palette, achievements, or shortcuts modal is still open above it
  // (defaultPrevented: the palette's own input already used this Esc to close itself)
  if (e.key !== 'Escape' || e.defaultPrevented || !(currentMaximized || closeSnakeZoom || closeKonamiPad || closeSecretOverlay)) return;
  const paletteOpen = paletteEl?.classList.contains('open');
  const achModalOpen = achModalEl?.classList.contains('open');
  const shortcutsOpen = shortcutsModalEl?.classList.contains('open');
  if (paletteOpen || achModalOpen || shortcutsOpen) return;
  // from the top of the stack down: the easter-egg screen, the Konami controller, the zoomed Snake (which
  // sits above a maximized window), and last the maximized window itself
  if (closeSecretOverlay) closeSecretOverlay();
  else if (closeKonamiPad) closeKonamiPad();
  else if (closeSnakeZoom) closeSnakeZoom();
  else restoreMaximized();
});

/* ---------- skills: interactive graph (replaces plain progress bars) ---------- */
(function skillGraph() {
  const canvas = document.getElementById('skillGraphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;

  // x/y = where each node sits on wide screens (fractions of the canvas).
  // slot = where it sits inside its category's cluster on narrow screens
  // (0 upper-left, 1 upper-right, 2 lower-right, 3 lower-left) — chosen by
  // searching every arrangement for the fewest, shortest cross-category links.
  const CATEGORIES = [
    { id: 'lang', label: 'Linguagens', x: 0.16, y: 0.5 },
    { id: 'front', label: 'Frontend', x: 0.5, y: 0.14 },
    { id: 'cloud', label: 'Cloud & Ferramentas', x: 0.84, y: 0.5 },
  ];
  const SKILLS = [
    { id: 'cs', label: 'C#', cat: 'lang', level: .90, x: .08, y: .30, slot: 2 },
    { id: 'js', label: 'JavaScript', cat: 'lang', level: .80, x: .08, y: .72, slot: 3 },
    { id: 'java', label: 'Java', cat: 'lang', level: .70, x: .24, y: .86, slot: 0 },
    { id: 'py', label: 'Python', cat: 'lang', level: .75, x: .24, y: .16, slot: 1 },
    { id: 'dotnet', label: '.NET', cat: 'front', level: .90, x: .28, y: .06, slot: 3 },
    { id: 'react', label: 'React', cat: 'front', level: .75, x: .57, y: .31, slot: 0 },
    { id: 'vue', label: 'Vue/Angular', cat: 'front', level: .65, x: .74, y: .05, slot: 1 },
    { id: 'node', label: 'Node.js', cat: 'front', level: .70, x: .46, y: .34, slot: 2 },
    { id: 'azure', label: 'Azure', cat: 'cloud', level: .80, x: .94, y: .28, slot: 0 },
    { id: 'docker', label: 'Docker', cat: 'cloud', level: .70, x: .96, y: .58, slot: 1 },
    { id: 'sql', label: 'SQL / MySQL', cat: 'cloud', level: .80, x: .84, y: .84, slot: 3 },
    { id: 'git', label: 'Git / CI-CD', cat: 'cloud', level: .85, x: .66, y: .90, slot: 2 },
  ];
  const EXTRA_EDGES = [
    ['cs', 'dotnet'], ['dotnet', 'azure'], ['dotnet', 'git'],
    ['js', 'react'], ['js', 'node'], ['node', 'docker'],
  ];
  const BY_ID = {};
  CATEGORIES.forEach((c) => { BY_ID[c.id] = c; });
  SKILLS.forEach((s) => { BY_ID[s.id] = s; });

  const NARROW_MAX = 620; // canvas width below which the clusters stack vertically
  const BAND = 196;       // height of one stacked cluster
  const SLOT_DIR = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const FONT = '"JetBrains Mono", "JetBrains Mono Fallback", monospace';

  function themeColor(varName, fallback) {
    return getThemeVar(varName, fallback);
  }
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`;
  }
  const radius = (level) => 5 + level * 9;
  const skillText = (s) => `${s.label} ${Math.round(s.level * 100)}%`;

  let w = 0, h = 0, narrow = false, hovered = null;
  let layout = {};
  let staticLayer = null;   // offscreen copy of everything that isn't animating
  let staticCtx = null;
  let staticDirty = true;

  /* ---- layout ---------------------------------------------------------
     Every node is treated as one box: the dot plus its label. A relaxation
     pass then pushes any overlapping boxes apart and keeps them on the canvas,
     so no label can ever sit on top of another, at any width. */
  function rectOf(n) {
    const half = Math.max(n.r, n.w / 2);
    if (n.kind === 'hub') return { l: n.x - half, r: n.x + half, t: n.y - 34, b: n.y + n.r };
    return n.above
      ? { l: n.x - half, r: n.x + half, t: n.y - n.r - 17, b: n.y + n.r }
      : { l: n.x - half, r: n.x + half, t: n.y - n.r, b: n.y + n.r + 17 };
  }
  function overlap(a, b, pad) {
    const ra = rectOf(a), rb = rectOf(b);
    return {
      ox: Math.min(ra.r, rb.r) - Math.max(ra.l, rb.l) + pad,
      oy: Math.min(ra.b, rb.b) - Math.max(ra.t, rb.t) + pad,
    };
  }
  function relax() {
    const nodes = Object.values(layout);
    const keepInside = (n) => {
      const rc = rectOf(n);
      if (rc.l < 4) n.x += 4 - rc.l;
      if (rc.r > w - 4) n.x -= rc.r - (w - 4);
      if (rc.t < 4) n.y += 4 - rc.t;
      if (rc.b > h - 4) n.y -= rc.b - (h - 4);
    };
    const separate = (pad) => {
      let moved = false;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          if (a.fixed && b.fixed) continue;
          const { ox, oy } = overlap(a, b, pad);
          if (ox <= 0 || oy <= 0) continue;
          moved = true;
          const alongX = ox < oy;
          const dir = Math.sign(alongX ? (a.x - b.x) || (a.hx - b.hx) || 1 : (a.y - b.y) || (a.hy - b.hy) || 1);
          const push = alongX ? ox : oy;
          const wa = a.fixed ? 0 : b.fixed ? 1 : 0.5;
          const wb = b.fixed ? 0 : a.fixed ? 1 : 0.5;
          if (alongX) { a.x += dir * push * wa; b.x -= dir * push * wb; }
          else { a.y += dir * push * wa; b.y -= dir * push * wb; }
        }
      }
      return moved;
    };
    // pass 1: settle, drifting back toward the intended spots so the shape survives
    for (let i = 0; i < 120; i++) {
      const moved = separate(6);
      nodes.forEach((n) => {
        if (n.fixed) return;
        n.x += (n.hx - n.x) * 0.03;
        n.y += (n.hy - n.y) * 0.03;
        keepInside(n);
      });
      if (!moved && i > 8) break;
    }
    // pass 2: no drift — guarantee the result is genuinely overlap-free
    for (let i = 0; i < 80; i++) {
      const moved = separate(4);
      nodes.forEach((n) => { if (!n.fixed) keepInside(n); });
      if (!moved) break;
    }
  }
  function findOverlaps() {
    const ids = Object.keys(layout);
    const pairs = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const { ox, oy } = overlap(layout[ids[i]], layout[ids[j]], 0);
        if (ox > 0 && oy > 0) pairs.push(`${ids[i]}+${ids[j]}`);
      }
    }
    return pairs;
  }
  const skillFontSize = () => (narrow ? 10 : 10.5);
  const hubFontSize = () => (narrow ? 11 : 12);

  function buildLayout() {
    layout = {};
    const measure = (font, str) => { ctx.font = font; return ctx.measureText(str).width; };
    CATEGORIES.forEach((cat, ci) => {
      const hubW = measure(`bold ${hubFontSize()}px ${FONT}`, cat.label);
      const hub = { kind: 'hub', fixed: true, r: 23, w: hubW };
      if (narrow) { hub.x = w / 2; hub.y = BAND * ci + BAND / 2; }
      else { hub.x = cat.x * w; hub.y = cat.y * h; }
      layout[cat.id] = hub;
      const kids = SKILLS.filter((s) => s.cat === cat.id);
      const widths = kids.map((s) => measure(`${skillFontSize()}px ${FONT}`, skillText(s)));
      // narrow: spread the four satellites as wide as the canvas allows
      const dx = Math.max(40, Math.min(76, w / 2 - Math.max(...widths) / 2 - 6));
      kids.forEach((s, i) => {
        const node = { kind: 'skill', r: radius(s.level), w: widths[i], above: false };
        if (narrow) {
          const [sx, sy] = SLOT_DIR[s.slot];
          node.x = hub.x + sx * dx;
          node.y = hub.y + sy * 56;
          node.above = sy < 0; // label goes on the outer side, away from the hub
        } else {
          node.x = s.x * w;
          node.y = s.y * h;
        }
        layout[s.id] = node;
      });
    });
    Object.values(layout).forEach((n) => { n.hx = n.x; n.hy = n.y; });
    relax();
    // exposed so the layout can be checked from outside (0 = no box touches another)
    const overlaps = findOverlaps();
    canvas.dataset.layout = narrow ? 'stacked' : 'spread';
    canvas.dataset.overlaps = String(overlaps.length);
    canvas.dataset.overlapPairs = overlaps.join(',');
  }

  let lastCssW = -1;
  let lastDpr = -1;
  function resize(force) {
    const cssW = canvas.getBoundingClientRect().width;
    // back the canvas with real device pixels so text is crisp on phones
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Mobile browsers fire resize whenever the address bar slides in or out
    // while scrolling. That only changes the viewport height, which this layout
    // doesn't depend on — and rebuilding would blank the canvas mid-scroll.
    if (force !== true && cssW === lastCssW && dpr === lastDpr) return;
    lastCssW = cssW;
    lastDpr = dpr;
    narrow = cssW < NARROW_MAX;
    canvas.style.height = narrow ? `${BAND * CATEGORIES.length}px` : '';
    const cssH = canvas.getBoundingClientRect().height;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = cssW;
    h = cssH;
    if (!staticLayer) { staticLayer = document.createElement('canvas'); staticCtx = staticLayer.getContext('2d'); }
    staticLayer.width = canvas.width;
    staticLayer.height = canvas.height;
    staticCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    staticDirty = true;
    buildLayout();
    draw(performance.now()); // resizing just cleared the canvas — repaint now, not at the next animation frame
  }
  window.addEventListener('resize', () => resize());
  document.fonts?.ready.then(() => resize(true)); // label widths depend on the webfont being in
  resize(true);

  function findNodeAt(x, y) {
    let best = null, bestD = Infinity;
    Object.entries(layout).forEach(([id, n]) => {
      const reach = n.kind === 'hub' ? 22 : n.r + (coarsePointer ? 14 : 6);
      const d = Math.hypot(n.x - x, n.y - y);
      if (d <= reach && d < bestD) { best = BY_ID[id]; bestD = d; }
    });
    return best;
  }

  function isConnected(node, a, b) {
    if (!node) return false;
    return node === a || node === b;
  }
  // with something hovered, everything tied to it stays lit and the rest recedes
  function related(id) {
    if (!hovered) return true;
    if (hovered.id === id) return true;
    const node = BY_ID[id];
    if (hovered.level === undefined) return node.cat === hovered.id; // hovered a category
    if (node.id === hovered.cat) return true;
    return EXTRA_EDGES.some(([a, b]) => (a === hovered.id && b === id) || (b === hovered.id && a === id));
  }

  function drawLabel(g, str, x, y, color, font, bg) {
    g.font = font;
    g.textAlign = 'center';
    g.lineJoin = 'round';
    g.lineWidth = 4;
    g.strokeStyle = bg; // a halo in the card color keeps links from cutting through the text
    g.strokeText(str, x, y);
    g.fillStyle = color;
    g.fillText(str, x, y);
  }

  // Everything except the pulsing hub halos is static between hover changes, so
  // it's painted once into an offscreen layer and just blitted each frame —
  // re-stroking every link and outlined label 30 times a second was the costly part.
  function renderStatic() {
    const green = themeColor('--green', '#39ff8c');
    const cyan = themeColor('--cyan', '#00e0ff');
    const muted = themeColor('--muted', '#8b98a5');
    const text = themeColor('--text', '#dfe8f0');
    const cardBg = themeColor('--bg-card', '#0d1119');
    const mutedRgb = hexToRgb(muted);
    const g = staticCtx;

    g.clearRect(0, 0, w, h);

    // cross-category links (dashed)
    g.setLineDash([3, 4]);
    EXTRA_EDGES.forEach(([aId, bId]) => {
      const a = layout[aId], b = layout[bId];
      const on = isConnected(hovered, BY_ID[aId], BY_ID[bId]);
      g.strokeStyle = on ? cyan : `rgba(${mutedRgb},${hovered ? .1 : .2})`;
      g.lineWidth = on ? 1.6 : 1;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    });
    g.setLineDash([]);

    // category -> skill links
    SKILLS.forEach((s) => {
      const a = layout[s.cat], b = layout[s.id];
      const on = isConnected(hovered, BY_ID[s.cat], s);
      g.strokeStyle = on ? green : `rgba(${mutedRgb},${hovered ? .12 : .28})`;
      g.lineWidth = on ? 1.6 : 1;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    });

    // category hub cores + titles
    CATEGORIES.forEach((cat) => {
      const p = layout[cat.id];
      g.globalAlpha = related(cat.id) ? 1 : .4;
      g.beginPath();
      g.fillStyle = cyan;
      g.arc(p.x, p.y, 7, 0, Math.PI * 2);
      g.fill();
      drawLabel(g, cat.label, p.x, p.y - 27, text, `bold ${hubFontSize()}px ${FONT}`, cardBg);
      g.globalAlpha = 1;
    });

    // skill nodes, then their labels on top
    SKILLS.forEach((s) => {
      const p = layout[s.id];
      const on = hovered === s;
      g.globalAlpha = related(s.id) ? (on ? 1 : .9) : .3;
      g.beginPath();
      g.fillStyle = on ? cyan : green;
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
      if (on) {
        g.lineWidth = 2;
        g.strokeStyle = cyan;
        g.beginPath();
        g.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
    });
    SKILLS.forEach((s) => {
      const p = layout[s.id];
      const on = hovered === s;
      const lit = related(s.id);
      g.globalAlpha = lit ? 1 : .45;
      const y = p.above ? p.y - p.r - 5 : p.y + p.r + 13;
      drawLabel(g, skillText(s), p.x, y, on || (hovered && lit) ? text : muted, `${on ? 'bold ' : ''}${skillFontSize()}px ${FONT}`, cardBg);
      g.globalAlpha = 1;
    });
    staticDirty = false;
  }

  function draw(t) {
    if (!w || !staticLayer) return;
    if (staticDirty) renderStatic();
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(staticLayer, 0, 0, w, h);
    // the only thing that moves: a soft halo pulsing around each category hub
    const cyanRgb = hexToRgb(themeColor('--cyan', '#00e0ff'));
    CATEGORIES.forEach((cat, i) => {
      const p = layout[cat.id];
      const pulse = reduceMotion ? .5 : .5 + .5 * Math.sin(t / 900 + i * 2);
      ctx.globalAlpha = related(cat.id) ? 1 : .4;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${cyanRgb},${.12 + .08 * pulse})`;
      ctx.arc(p.x, p.y, 16 + 5 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function setHovered(node) {
    if (node === hovered) return;
    hovered = node;
    staticDirty = true;
    redrawIfStatic();
  }
  // with reduced motion there's no animation loop, so hover/resize must redraw by hand
  function redrawIfStatic() { if (reduceMotion) draw(0); }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    setHovered(findNodeAt(e.clientX - rect.left, e.clientY - rect.top));
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  });
  canvas.addEventListener('mouseleave', () => setHovered(null));
  canvas.addEventListener('touchstart', (e) => {
    const rect = canvas.getBoundingClientRect();
    const t0 = e.touches[0];
    setHovered(findNodeAt(t0.clientX - rect.left, t0.clientY - rect.top));
  }, { passive: true });
  // touching anywhere else lets go of the highlight
  document.addEventListener('touchstart', (e) => {
    if (hovered && !canvas.contains(e.target)) setHovered(null);
  }, { passive: true });
  onThemeChange(() => { staticDirty = true; redrawIfStatic(); });

  if (reduceMotion) {
    draw(0);
  } else {
    // the halo breathes over ~6s, so ~11fps is indistinguishable from 60 — and idles offscreen
    visibleLoop(canvas, draw, 90);
  }
})();

/* ---------- mobile nav ---------- */
(function mobileNav() {
  const burger = document.getElementById('burger');
  const menu = document.getElementById('navMobile');
  if (!burger || !menu) return;
  burger.addEventListener('click', () => menu.classList.toggle('open'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
})();

/* ---------- nav controls: command palette trigger + achievements trophy ---------- */
(function injectNavControls() {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  if (!nav) return;

  const controls = document.createElement('div');
  controls.className = 'nav__controls';

  const soundBtn = document.createElement('button');
  soundBtn.type = 'button';
  soundBtn.className = 'nav__iconbtn';
  soundBtn.setAttribute('aria-label', 'ativar ou desativar o som');
  const paintSound = () => {
    soundBtn.innerHTML = uiIcon(soundEnabled ? 'sound' : 'sound-off');
    soundBtn.classList.toggle('is-off', !soundEnabled);
    soundBtn.setAttribute('aria-pressed', String(soundEnabled));
    soundBtn.title = soundEnabled ? 'Som ligado — clique para silenciar' : 'Som desligado — clique para ativar';
  };
  paintSound();
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem('artur-sound', soundEnabled ? 'on' : 'off'); } catch (e) {}
    paintSound();
    if (soundEnabled) playClick();
  });

  const paletteBtn = document.createElement('button');
  paletteBtn.type = 'button';
  paletteBtn.className = 'nav__iconbtn nav__iconbtn--kbd';
  paletteBtn.setAttribute('aria-label', 'Abrir paleta de comandos');
  // show the key people actually have: ⌘ on Apple devices, Ctrl everywhere else
  const isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);
  paletteBtn.innerHTML = isApple ? `${uiIcon('command')}<span>K</span>` : '<span>Ctrl</span><span>K</span>';
  paletteBtn.title = isApple ? 'Paleta de comandos (⌘K)' : 'Paleta de comandos (Ctrl+K)';
  paletteBtn.addEventListener('click', () => openPalette());

  trophyBtn = document.createElement('button');
  trophyBtn.type = 'button';
  trophyBtn.className = 'nav__iconbtn nav__trophy';
  trophyBtn.setAttribute('aria-label', 'Ver conquistas');
  trophyBtn.title = 'Conquistas';
  trophyBtn.innerHTML = `${uiIcon('trophy')}<span class="trophy__count tabular">0/${Object.keys(ACHIEVEMENTS).length}</span>`;
  trophyBtn.addEventListener('click', () => openAchievementsModal());

  const shortcutsBtn = document.createElement('button');
  shortcutsBtn.type = 'button';
  shortcutsBtn.className = 'nav__iconbtn nav__iconbtn--kbd';
  shortcutsBtn.setAttribute('aria-label', 'Ver atalhos de teclado');
  shortcutsBtn.title = 'Atalhos de teclado';
  shortcutsBtn.innerHTML = uiIcon('keyboard');
  shortcutsBtn.addEventListener('click', () => openShortcutsModal());

  controls.appendChild(soundBtn);
  controls.appendChild(paletteBtn);
  controls.appendChild(shortcutsBtn);
  controls.appendChild(trophyBtn);
  nav.insertBefore(controls, burger || null);
  updateTrophyBadge();
})();

/* ---------- interactive terminal ---------- */
let terminalRunCommand = null;
let snakeIsPlaying = false; // lets the terminal's autofocus (below) step aside while Snake needs the arrow keys
let closeSnakeZoom = null;  // set only while the zoomed Snake overlay is open; Esc calls it
let closeKonamiPad = null;  // same, for the Konami controller
let closeSecretOverlay = null; // same, for the "acesso concedido" screen
let openKonamiPad = null;   // set by the Konami code below; the terminal and the palette use it

(function terminal() {
  const output = document.getElementById('termOutput');
  const input = document.getElementById('termInput');
  if (!output || !input) return;

  const jokes = [
    'Por que o programador foi ao médico? Porque tinha um vírus. Muito engraçado, eu sei.',
    '99 bugs no código. Corrige um, sobem 127.',
    'Existem 10 tipos de pessoas: as que entendem binário e as que não entendem.',
    'Não é bug, é uma feature não documentada.'
  ];

  function print(html) {
    const p = document.createElement('p');
    p.innerHTML = html;
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
  }

  function banner() {
    print(`<span class="accent">
   ___         __
  / _ | ____/ /___ __________
 / __ |/ __/ __/ // / __/ -_)
/_/ |_/_/  \\__/\\_,_/_/  \\__/
</span>Artur Tavares de Melo // Desenvolvedor Full-Stack`);
  }

  const commands = {
    help: () => print(`Comandos disponíveis:<br>
<span class="accent">about</span> — sobre mim &nbsp;
<span class="accent">skills</span> — minhas habilidades &nbsp;
<span class="accent">projects</span> — meus projetos<br>
<span class="accent">experience</span> — experiência profissional &nbsp;
<span class="accent">contact</span> — como falar comigo<br>
<span class="accent">whoami</span> · <span class="accent">ls</span> · <span class="accent">date</span> · <span class="accent">banner</span><br>
<span class="accent">theme &lt;matrix|amber|dracula|nord|synthwave&gt;</span> — troca as cores do site<br>
<span class="accent">snake</span> — abre o jogo escondido no playground &nbsp;
<span class="accent">hack</span> — tenta invadir o mainframe<br>
<span class="accent">redbull</span> · <span class="accent">joke</span> · <span class="accent">github</span> · <span class="accent">linkedin</span> · <span class="accent">konami</span> · <span class="accent">clear</span>${isCoarsePointer ? '' : `<br>
dica: aperte <span class="accent">Ctrl+K</span> (ou <span class="accent">⌘K</span>) em qualquer lugar da página pra abrir a paleta de comandos.`}`),
    about: () => print('Artur Tavares de Melo — desenvolvedor full-stack (C#/.NET, JS) com passagem por Economia antes da Ciência da Computação. Curioso, teimoso e movido a Red Bull.'),
    skills: () => print('C# · .NET · Java · Python · JavaScript · React · Vue · Angular · Node.js · SQL/MySQL · Docker · Azure · CI/CD'),
    experience: () => print('Intelectah (2023–2024) — full-stack C#/.NET + Azure, APIs escaláveis, CI/CD, testes E2E.<br>Hurtz Importação (2021–2022) — apps internas em Java/React, automação com Python.'),
    projects: () => print('Confira a seção <span class="accent">#projetos</span> logo acima — ou digite <span class="accent">ls</span>.'),
    contact: () => print('email: <span class="accent">arturtmelo1@gmail.com</span> — também disponível na seção de contato ↓'),
    whoami: () => print('artur — nível de acesso: root (no seu próprio código, pelo menos)'),
    ls: () => print('recifle/&nbsp;&nbsp;rover.cs&nbsp;&nbsp;mercado.tsx&nbsp;&nbsp;financas.tsx&nbsp;&nbsp;tutor_de_logica.md&nbsp;&nbsp;curriculo.pdf&nbsp;&nbsp;sonhos_grandes/'),
    date: () => print(new Date().toString()),
    banner: banner,
    redbull: () => print(`<span class="term-icon term-icon--zap" aria-hidden="true"></span> Energia?<br>
<span class="muted">250ml · ~113 kcal · 27g açúcar · 80mg cafeína</span>`),
    joke: () => print(jokes[Math.floor(Math.random() * jokes.length)]),
    github: () => print('abrindo o github do Artur ... <a href="https://github.com/arturtmelo/" target="_blank" style="color:#00e0ff">clique aqui</a>'),
    linkedin: () => print('abrindo o linkedin do Artur ... <a href="https://www.linkedin.com/in/arturtmelo/" target="_blank" style="color:#00e0ff">clique aqui</a>'),
    sudo: () => print('Bonita tentativa. Você não está na lista de sudoers. Esse incidente será reportado. ' + uiIcon('shield')),
    konami: () => { print('código Konami: ↑ ↑ ↓ ↓ ← → ← → B A — abrindo o controle ' + uiIcon('gamepad')); openKonamiPad?.(); },
    theme: (args) => {
      const name = (args[0] || '').toLowerCase();
      if (THEMES[name]) {
        applyTheme(name);
        unlockAchievement('theme');
        print(`tema alterado para: <span class="accent">${THEMES[name].label}</span>`);
      } else {
        print('temas disponíveis: ' + Object.keys(THEMES).map(k => `<span class="accent">${k}</span>`).join(', '));
      }
    },
    snake: () => {
      scrollToId('playground');
      print('abrindo o snake... boa sorte ' + uiIcon('snake'));
    },
    hack: () => {
      const p = document.createElement('p');
      output.appendChild(p);
      let pct = 0;
      const iv = setInterval(() => {
        pct = Math.min(100, pct + 4 + Math.floor(Math.random() * 8));
        const filled = Math.round(pct / 5);
        p.innerHTML = `invadindo o mainframe... <span class="accent">[${'█'.repeat(filled)}${'░'.repeat(20 - filled)}] ${pct}%</span>`;
        output.scrollTop = output.scrollHeight;
        playClick();
        if (pct >= 100) {
          clearInterval(iv);
          setTimeout(() => {
            print('ACESSO NEGADO. relaxa, isso é só uma piada — ninguém invade nada por aqui. ' + uiIcon('eye'));
            unlockAchievement('hacker');
          }, 500);
        }
      }, 150);
    },
    clear: () => { output.innerHTML = ''; },
    echo: (args) => print(args.join(' ') || ''),
  };
  // a bare theme name (as shown by `theme` with no args) also works on its own
  Object.keys(THEMES).forEach((name) => { commands[name] = () => commands.theme([name]); });

  const win = output.closest('.terminal-window');

  // the window starts compact and opens up on the first command; that growth can push
  // the prompt row below the fold, so bring it back once the height transition is done
  function keepPromptVisible() {
    const vh = window.innerHeight;
    const w = win.getBoundingClientRect();
    const r = input.closest('form').getBoundingClientRect();
    // only if they are still looking at the terminal (some of the window is on screen)
    if (w.top < vh && w.bottom > 0 && r.bottom > vh - 12) window.scrollBy({ top: r.bottom - vh + 24, behavior: 'smooth' });
  }

  function execute(raw) {
    raw = raw.trim();
    if (!raw) return;
    const firstCommand = win && !win.classList.contains('is-live');
    if (firstCommand) win.classList.add('is-live');
    print(`<span class="prompt">artur@dev:~$</span> ${raw}`);
    const [cmd, ...args] = raw.split(' ');
    // `snake` scrolls away to the playground on its own — don't fight that scroll
    if (firstCommand && cmd.toLowerCase() !== 'snake') setTimeout(keepPromptVisible, 450);
    const fn = commands[cmd.toLowerCase()];
    if (fn) {
      fn(args);
      unlockAchievement('terminal');
    } else {
      print(`comando não encontrado: <span class="accent">${cmd}</span>. digite <span class="accent">help</span>.`);
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key.length === 1) playClick();
  });

  // a <form> submit (not a raw keydown check) is what reliably catches the
  // enter/go/send key across mobile virtual keyboards — keydown alone misses it
  const form = input.closest('form');
  // the field itself is only ~20px tall — tapping anywhere on the prompt row should start typing
  form?.addEventListener('click', (e) => { if (e.target !== input) input.focus(); });
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    playClick();
    execute(input.value);
    input.value = '';
    // on touch devices, dismiss the virtual keyboard after sending a command
    // instead of refocusing — otherwise it keeps covering half the screen,
    // right where the reply they just asked for needs to be readable
    if (isCoarsePointer) input.blur();
    else input.focus();
  });

  terminalRunCommand = execute;

  // autofocus when scrolled into view — but never steal the arrow keys while Snake is running,
  // and never on touch devices (auto-opening the virtual keyboard on scroll is jarring there;
  // mobile users tap the input themselves when they want to type)
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
  const termSection = document.getElementById('terminal');
  const focusIo = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting && !snakeIsPlaying && !isCoarsePointer) input.focus({ preventScroll: true }); });
  }, { threshold: 0.6 });
  if (termSection) focusIo.observe(termSection);
})();

/* ---------- command palette ---------- */
let paletteEl = null;
let paletteFiltered = [];
let paletteIndex = 0;

const PALETTE_ACTIONS = [
  { label: 'Ir para: Início', hint: 'hero topo', run: () => scrollToId('hero') },
  { label: 'Ir para: Sobre', hint: 'about bio', run: () => scrollToId('about') },
  { label: 'Ir para: Stack', hint: 'skills habilidades', run: () => scrollToId('skills') },
  { label: 'Ir para: Projetos', hint: 'projects recifle rover', run: () => scrollToId('projects') },
  { label: 'Ir para: Terminal', hint: 'terminal', run: () => scrollToId('terminal') },
  { label: 'Ir para: Playground', hint: 'snake jogo game', run: () => scrollToId('playground') },
  { label: 'Ir para: Contato', hint: 'contact email', run: () => scrollToId('contact') },
  {
    label: 'Copiar e-mail', hint: 'contato clipboard', run: () => {
      copyToClipboard('arturtmelo1@gmail.com', { successDesc: 'arturtmelo1@gmail.com está na área de transferência.' });
    }
  },
  ...Object.entries(THEMES).map(([key, t]) => ({
    label: `Tema: ${t.label}`,
    hint: 'cor cores aparência',
    run: () => { applyTheme(key); unlockAchievement('theme'); showToast({ icon: 'palette', label: 'Tema alterado', desc: t.label }); }
  })),
  {
    label: 'Jogar Snake', hint: 'jogo game playground cobrinha', run: () => {
      scrollToId('playground');
      setTimeout(() => document.getElementById('snakePlay')?.click(), 500);
    }
  },
  { label: 'Código Konami (controle na tela)', hint: 'konami secreto joystick easter egg gamepad', run: () => openKonamiPad?.() },
  {
    label: 'Contar uma piada', hint: 'joke terminal', run: () => {
      scrollToId('terminal');
      setTimeout(() => terminalRunCommand && terminalRunCommand('joke'), 450);
    }
  },
  {
    label: 'Invadir o mainframe', hint: 'hack terminal easter egg', run: () => {
      scrollToId('terminal');
      setTimeout(() => terminalRunCommand && terminalRunCommand('hack'), 450);
    }
  },
  { label: 'Ver conquistas', hint: 'achievements trophy troféu', run: () => openAchievementsModal() },
  { label: 'Ver atalhos de teclado', hint: 'shortcuts keyboard ajuda ?', run: () => openShortcutsModal() },
  { label: 'Abrir GitHub', hint: 'código repositório', run: () => window.open('https://github.com/', '_blank') },
  { label: 'Abrir LinkedIn', hint: 'linkedin perfil', run: () => window.open('https://www.linkedin.com/', '_blank') },
];

function buildPalette() {
  const backdrop = document.createElement('div');
  backdrop.className = 'palette-backdrop';
  backdrop.innerHTML = `
    <div class="palette" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
      <div class="palette__input-row">
        <span class="palette__prompt">›</span>
        <input type="text" class="palette__input" id="paletteInput" placeholder="digite uma ação, seção ou tema..." autocomplete="off" spellcheck="false">
        <kbd class="palette__esc">esc</kbd>
      </div>
      <ul class="palette__results" id="paletteResults"></ul>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closePalette(); });
  return backdrop;
}

function renderPaletteResults(query) {
  const list = document.getElementById('paletteResults');
  const q = query.trim().toLowerCase();
  paletteFiltered = PALETTE_ACTIONS.filter(a =>
    !q || a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q)
  );
  paletteIndex = 0;

  if (!paletteFiltered.length) {
    list.innerHTML = '<li class="palette__empty">nenhum resultado. tente "tema", "projetos" ou "snake".</li>';
    return;
  }

  list.innerHTML = paletteFiltered.map((a, i) =>
    `<li class="palette__result${i === 0 ? ' active' : ''}" data-index="${i}">
      <span>${a.label}</span><span class="hint">${a.hint}</span>
    </li>`).join('');

  list.querySelectorAll('.palette__result').forEach(li => {
    li.addEventListener('mouseenter', () => setPaletteIndex(Number(li.dataset.index)));
    li.addEventListener('click', () => runPaletteSelection());
  });
}

function setPaletteIndex(i) {
  const list = document.getElementById('paletteResults');
  if (!list) return;
  paletteIndex = i;
  list.querySelectorAll('.palette__result').forEach(li => {
    li.classList.toggle('active', Number(li.dataset.index) === i);
  });
  list.querySelector('.palette__result.active')?.scrollIntoView({ block: 'nearest' });
}

function runPaletteSelection() {
  const action = paletteFiltered[paletteIndex];
  if (!action) return;
  closePalette();
  action.run();
}

function openPalette() {
  if (!paletteEl) paletteEl = buildPalette();
  paletteEl.classList.add('open');
  lockScroll();
  unlockAchievement('palette');
  const input = document.getElementById('paletteInput');
  input.value = '';
  renderPaletteResults('');
  setTimeout(() => input.focus(), 30);

  input.oninput = () => renderPaletteResults(input.value);
  input.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setPaletteIndex(Math.min(paletteIndex + 1, paletteFiltered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPaletteIndex(Math.max(paletteIndex - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); runPaletteSelection(); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  };
}

function closePalette() {
  // already closed: don't release the scroll lock a second time (its input used to keep focus
  // after closing, so a later Esc landed here again and unlocked the page under an open modal)
  if (!paletteEl || !paletteEl.classList.contains('open')) return;
  paletteEl.classList.remove('open');
  unlockScroll();
  document.getElementById('paletteInput')?.blur();
}

document.addEventListener('keydown', (e) => {
  const isK = e.key.toLowerCase() === 'k';
  if (isK && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    paletteEl && paletteEl.classList.contains('open') ? closePalette() : openPalette();
    return;
  }
  if (e.key === '?') {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    e.preventDefault();
    shortcutsModalEl && shortcutsModalEl.classList.contains('open') ? closeShortcutsModal() : openShortcutsModal();
    return;
  }
  if (e.key === 'Escape') {
    if (paletteEl && paletteEl.classList.contains('open')) closePalette();
    if (achModalEl && achModalEl.classList.contains('open')) closeAchievementsModal();
    if (shortcutsModalEl && shortcutsModalEl.classList.contains('open')) closeShortcutsModal();
  }
});

/* ---------- playground: snake (built for general visitors, not just devs) ---------- */
(function snakeGame() {
  const canvas = document.getElementById('snakeCanvas');
  const scoreEl = document.getElementById('snakeScore');
  const bestEl = document.getElementById('snakeBest');
  const playBtn = document.getElementById('snakePlay');
  const foodModeSel = document.getElementById('snakeFoodMode');
  const dpad = document.getElementById('snakeDpad');
  if (!canvas || !playBtn) return;

  const ctx = canvas.getContext('2d');
  const GRID = 20;
  // everything is drawn in a fixed 560-unit space; resizeCanvas() sizes the real pixel
  // buffer to how big the board is actually shown (so it stays sharp when zoomed) and sets the scale
  const SIZE = 560;
  const CELL = SIZE / GRID;
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;

  let snake, dir, nextDir, foods, score, running, loopId, crashCell, isGameOver = false;
  let best = 0;
  try { best = Number(localStorage.getItem('artur-snake-best')) || 0; } catch (e) {}
  bestEl.textContent = best;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function themeColor(varName, fallback) {
    return getThemeVar(varName, fallback);
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function mixColor(hexA, hexB, t) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r},${g},${bl})`;
  }

  function getFoodCount() {
    return Number(foodModeSel?.value) || 5;
  }

  function randomFreeCell() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (
      snake.some(s => s.x === pos.x && s.y === pos.y) ||
      foods.some(f => f.x === pos.x && f.y === pos.y)
    );
    return pos;
  }

  function placeFoods(count) {
    foods = [];
    for (let i = 0; i < count; i++) foods.push(randomFreeCell());
  }

  function resetState() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    crashCell = null;
    scoreEl.textContent = '0';
    foods = [];
    placeFoods(getFoodCount());
  }

  function draw(gameOver) {
    const green = themeColor('--green', '#39ff8c');
    const cyan = themeColor('--cyan', '#00e0ff');
    const red = themeColor('--red', '#ff5f56');
    const border = themeColor('--border', '#1c2230');
    const t = performance.now();
    const scale = canvas.width / SIZE;
    const blur = (px) => px * scale; // shadowBlur is in device pixels, so keep it in proportion to the board

    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.strokeStyle = border;
    ctx.lineWidth = 1 / scale; // one device pixel
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke();
    }

    // food: a minimal hex "data node" — one accent color, clean lines, subtle pulse
    const cyanRgb = themeColor('--cyan-rgb', '0,224,255');
    const foodPulse = reduceMotion ? 0.8 : 0.6 + 0.4 * Math.sin(t / 300);
    foods.forEach(f => {
      const cx = f.x * CELL + CELL / 2;
      const cy = f.y * CELL + CELL / 2;
      const r = CELL / 2 - 3;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();

      ctx.fillStyle = `rgba(${cyanRgb},.15)`;
      ctx.shadowColor = cyan;
      ctx.shadowBlur = blur(4 + 6 * foodPulse);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = cyan;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });

    // snake: a cyan-to-green energy trail from head to tail, with the head pulsing like a beacon
    const last = Math.max(snake.length - 1, 1);
    const headPulse = reduceMotion ? 0.85 : 0.55 + 0.45 * Math.sin(t / 160);
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      const trailT = i / last;
      if (isHead) {
        ctx.fillStyle = cyan;
        ctx.shadowColor = cyan;
        ctx.shadowBlur = blur(10 + 14 * headPulse);
      } else {
        ctx.fillStyle = mixColor(cyan, green, trailT);
        ctx.shadowColor = green;
        ctx.shadowBlur = blur(5);
      }
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.shadowBlur = 0;

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(0, 0, SIZE, SIZE);

      // the square the snake crashed into (only set on self-collision) lights up red
      if (crashCell) {
        const crashPulse = reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(t / 120);
        ctx.fillStyle = red;
        ctx.shadowColor = red;
        ctx.shadowBlur = blur(12 * crashPulse);
        ctx.fillRect(crashCell.x * CELL + 1, crashCell.y * CELL + 1, CELL - 2, CELL - 2);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = red;
        ctx.lineWidth = 2;
        ctx.strokeRect(crashCell.x * CELL + 1, crashCell.y * CELL + 1, CELL - 2, CELL - 2);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = green;
      ctx.font = 'bold 26px "JetBrains Mono", monospace';
      ctx.fillText('game over', SIZE / 2, SIZE / 2 - 100);
      ctx.fillStyle = '#dfe8f0';
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText(`você fez ${score} pontos`, SIZE / 2, SIZE / 2 - 70);
    }
  }

  // match the pixel buffer to the size the board is shown at (capped at 2x: past that it only costs)
  function resizeCanvas() {
    const shown = canvas.clientWidth;
    if (!shown) return; // its game tab isn't the visible one
    const px = Math.round(shown * Math.min(window.devicePixelRatio || 1, 2));
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; } // resizing also resets the context state
    ctx.setTransform(px / SIZE, 0, 0, px / SIZE, 0, 0);
    draw(isGameOver);
  }

  function tick() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const hitWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID;
    const hitSelf = snake.some(s => s.x === head.x && s.y === head.y);

    if (hitWall || hitSelf) {
      // the wall itself isn't a cell on the grid, so highlight the last valid
      // cell the head was in instead — for a self-hit, it's the body cell struck
      crashCell = hitSelf ? { x: head.x, y: head.y } : { x: snake[0].x, y: snake[0].y };
      endGame();
      return;
    }

    snake.unshift(head);
    const eaten = foods.findIndex(f => f.x === head.x && f.y === head.y);
    if (eaten !== -1) {
      foods.splice(eaten, 1);
      foods.push(randomFreeCell()); // keep the board topped up to the chosen mode's count
      score += 10;
      scoreEl.textContent = score;
      playEat();
      unlockAchievement('arcade');
    } else {
      snake.pop();
    }
    draw(false);
  }

  function stopRun() {
    running = false;
    snakeIsPlaying = false;
    canvas.classList.remove('is-playing');
    clearInterval(loopId);
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem('artur-snake-best', String(best)); } catch (e) {}
    }
  }

  function endGame() {
    stopRun();
    playGameOver();
    isGameOver = true;
    draw(true);
    playBtn.textContent = '⟲';
    playBtn.setAttribute('aria-label', 'jogar de novo');
    playBtn.hidden = false;
  }

  // leaving mid-game (closing the zoomed view): no game-over fanfare, back to the idle board
  function abortRun() {
    stopRun();
    isGameOver = false;
    resetState();
    draw(false);
    playBtn.textContent = '▶';
    playBtn.setAttribute('aria-label', 'jogar');
    playBtn.hidden = false;
  }

  function start() {
    // an auto-focused terminal input elsewhere on the page would otherwise eat the arrow keys
    if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur();
    // on a phone the board is small and the page scrolls under the thumb: play zoomed
    if (isCoarsePointer) openZoom();
    resetState();
    running = true;
    isGameOver = false;
    snakeIsPlaying = true;
    canvas.classList.add('is-playing');
    playBtn.hidden = true;
    draw(false);
    clearInterval(loopId);
    loopId = setInterval(tick, 120);
  }

  function setDir(x, y) {
    if (dir.x === -x && dir.y === -y) return; // no reversing into yourself
    nextDir = { x, y };
  }

  const KEY_MAP = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  };

  document.addEventListener('keydown', (e) => {
    if (!running) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const mapped = KEY_MAP[e.key];
    if (mapped) { e.preventDefault(); setDir(mapped[0], mapped[1]); }
  });

  // pointerdown, not click: a turn should land the moment the thumb does (click waits for release).
  // A keyboard-activated button still arrives as a click, with detail 0.
  const DPAD_MAP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  dpad?.querySelectorAll('button').forEach(btn => {
    const turn = () => { const d = DPAD_MAP[btn.dataset.dir]; if (d) setDir(d[0], d[1]); };
    btn.addEventListener('pointerdown', turn);
    btn.addEventListener('click', (e) => { if (e.detail === 0) turn(); });
  });

  // Steering by swipe: a turn happens as soon as the finger has travelled far enough, and the
  // anchor then resets, so one long drag can turn several times. Listens on the canvas normally
  // and on the whole overlay while zoomed (a bigger target than the board).
  const SWIPE_PX = 22;
  let touchAnchor = null;
  function steerFrom(x, y, minPx) {
    if (!touchAnchor) return false;
    const dx = x - touchAnchor.x, dy = y - touchAnchor.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < minPx) return false;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
    touchAnchor = { x, y };
    return true;
  }
  // while zoomed, the canvas' own events also bubble to the overlay — only one of them should act
  const ignoreCanvasWhileZoomed = (e) => zoomEl?.classList.contains('open') && e.currentTarget === canvas;
  function bindSwipe(el, passive) {
    el.addEventListener('touchstart', (e) => {
      if (ignoreCanvasWhileZoomed(e) || e.touches.length !== 1) return;
      touchAnchor = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (ignoreCanvasWhileZoomed(e)) return;
      if (running) steerFrom(e.touches[0].clientX, e.touches[0].clientY, SWIPE_PX);
      if (!passive && running) e.preventDefault(); // no page overscroll / pull-to-refresh mid-game
    }, { passive });
    el.addEventListener('touchend', (e) => {
      if (ignoreCanvasWhileZoomed(e)) return;
      steerFrom(e.changedTouches[0].clientX, e.changedTouches[0].clientY, 10); // a short flick still counts
      touchAnchor = null;
    }, { passive: true });
  }
  bindSwipe(canvas, true);

  // ---- zoomed view: the whole game block moves into a full-screen overlay ----
  const snakeRoot = canvas.closest('.snake');
  const zoomBtn = document.getElementById('snakeZoom');
  let zoomEl = null;
  let zoomMarker = null;   // where the block lives on the page, so it can go back
  let zoomReturnFocus = null;

  function buildZoom() {
    zoomEl = document.createElement('div');
    zoomEl.className = 'snake-zoom';
    zoomEl.setAttribute('role', 'dialog');
    zoomEl.setAttribute('aria-modal', 'true');
    zoomEl.setAttribute('aria-label', 'Snake ampliado');
    zoomEl.innerHTML = `
      <div class="terminal-window snake-zoom__window" tabindex="-1">
        <div class="terminal-window__bar">
          <span class="dot dot--red" aria-hidden="true"></span><span class="dot dot--yellow" aria-hidden="true"></span><span class="dot dot--green" aria-hidden="true"></span>
          <span class="terminal-window__title">snake.js</span>
          <button type="button" class="overlay-close" aria-label="fechar (Esc)"><span class="ui-icon ui-icon--close" aria-hidden="true"></span>fechar</button>
        </div>
      </div>`;
    document.body.appendChild(zoomEl);
    zoomEl.querySelector('.overlay-close').addEventListener('click', closeZoom);
    zoomEl.querySelector('.dot--red').addEventListener('click', closeZoom);
    zoomEl.addEventListener('click', (e) => { if (e.target === zoomEl) closeZoom(); }); // the dim margin, on wide screens
    bindSwipe(zoomEl, false);
  }

  function openZoom() {
    if (zoomEl?.classList.contains('open')) return;
    if (!zoomEl) buildZoom();
    zoomReturnFocus = document.activeElement;
    zoomMarker = document.createComment('snake');
    snakeRoot.before(zoomMarker);
    zoomEl.querySelector('.snake-zoom__window').appendChild(snakeRoot);
    void zoomEl.offsetWidth; // so the fade-in runs the first time too
    zoomEl.classList.add('open');
    lockScroll();
    closeSnakeZoom = closeZoom;
    zoomBtn?.setAttribute('aria-expanded', 'true');
    zoomEl.querySelector('.snake-zoom__window').focus({ preventScroll: true });
    resizeCanvas();
  }

  function closeZoom() {
    if (!zoomEl?.classList.contains('open')) return;
    if (running) abortRun();
    zoomEl.classList.remove('open');
    zoomMarker.replaceWith(snakeRoot);
    zoomMarker = null;
    unlockScroll();
    closeSnakeZoom = null;
    zoomBtn?.setAttribute('aria-expanded', 'false');
    const back = zoomReturnFocus && document.contains(zoomReturnFocus) && !zoomReturnFocus.hidden ? zoomReturnFocus : zoomBtn;
    back?.focus?.({ preventScroll: true });
    zoomReturnFocus = null;
    resizeCanvas();
  }
  zoomBtn?.addEventListener('click', openZoom);

  playBtn.addEventListener('click', start);

  // idle preview before the first game
  resetState();
  resizeCanvas();
  if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(canvas);

  // a continuous render loop keeps the glow/pulse effects alive between
  // movement ticks (and while idle, before the first game starts)
  // (idles while the canvas is offscreen or its game tab isn't the active one)
  if (!reduceMotion) {
    // ~30fps is plenty for the glow/pulse, and the per-segment shadowBlur is
    // the costly part of every frame
    visibleLoop(canvas, () => draw(isGameOver), 30);
  }
})();

/* ---------- playground: typing race — type the snippet, fast & correct ---------- */
(function typingRace() {
  const field = document.getElementById('typingField');
  const textEl = document.getElementById('typingText');
  const input = document.getElementById('typingInput');
  const playBtn = document.getElementById('typingPlay');
  const wpmEl = document.getElementById('typingWpm');
  const accEl = document.getElementById('typingAcc');
  const bestEl = document.getElementById('typingBest');
  if (!field || !input || !playBtn) return;

  const SNIPPETS = [
    'const nome = "Artur Melo";',
    'let total = 10 + 25 - 5;',
    'console.log("Hello, world!");',
    'public string Nome { get; set; }',
    'SELECT nome FROM usuarios WHERE id = 1;',
    'git commit -m "corrige bug em producao"',
    'function saudacao(nome) { return "Oi, " + nome; }',
    'while (fila.length > 0) { fila.pop(); }',
  ];

  let snippet = '';
  let running = false;
  let startTime = 0;
  let prevLen = 0;
  let typedCount = 0;
  let correctCount = 0;
  let liveTimer = null;
  let best = 0;
  try { best = Number(localStorage.getItem('artur-typing-best')) || 0; } catch (e) {}
  bestEl.textContent = best;
  input.disabled = true;

  function pickSnippet() {
    let s;
    do { s = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)]; } while (s === snippet && SNIPPETS.length > 1);
    return s;
  }

  function escapeChar(ch) {
    return ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch;
  }

  function render() {
    const value = input.value;
    let html = '';
    for (let i = 0; i < snippet.length; i++) {
      let cls = '';
      if (i < value.length) cls = value[i] === snippet[i] ? 'char--correct' : 'char--wrong';
      else if (i === value.length) cls = 'char--current';
      html += `<span class="${cls}">${escapeChar(snippet[i])}</span>`;
    }
    textEl.innerHTML = html;
  }

  function currentStats() {
    const elapsedMin = Math.max((performance.now() - startTime) / 60000, 1 / 600);
    const wpm = Math.max(0, Math.round((correctCount / 5) / elapsedMin));
    const acc = typedCount ? Math.round((correctCount / typedCount) * 100) : 100;
    return { wpm, acc };
  }

  function updateLiveStats() {
    if (!startTime) return;
    const { wpm, acc } = currentStats();
    wpmEl.textContent = wpm;
    accEl.textContent = acc;
  }

  function finish() {
    running = false;
    clearInterval(liveTimer);
    const { wpm, acc } = currentStats();
    wpmEl.textContent = wpm;
    accEl.textContent = acc;
    input.disabled = true;
    field.classList.remove('is-focused');
    playGameOver();
    if (wpm > best) {
      best = wpm;
      bestEl.textContent = best;
      try { localStorage.setItem('artur-typing-best', String(best)); } catch (e) {}
    }
    if (wpm >= 60) unlockAchievement('speedtyper');
    playBtn.textContent = '⟲';
    playBtn.setAttribute('aria-label', 'jogar de novo');
    playBtn.hidden = false;
  }

  function start() {
    snippet = pickSnippet();
    running = true;
    startTime = 0;
    prevLen = 0;
    typedCount = 0;
    correctCount = 0;
    input.value = '';
    input.disabled = false;
    wpmEl.textContent = '0';
    accEl.textContent = '100';
    playBtn.hidden = true;
    clearInterval(liveTimer);
    liveTimer = setInterval(updateLiveStats, 250);
    render();
    input.focus();
  }

  // pasting the snippet would defeat the race, but only matters mid-race —
  // outside one the field is inert anyway, and blocking paste on an idle
  // input is flagged as a bad practice
  input.addEventListener('paste', (e) => { if (running) e.preventDefault(); });

  input.addEventListener('beforeinput', (e) => {
    if (!running) { e.preventDefault(); return; }
    if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') { e.preventDefault(); return; }
    if (e.inputType && e.inputType.startsWith('insert') && input.value.length >= snippet.length) {
      e.preventDefault();
    }
  });

  input.addEventListener('input', () => {
    if (!running) return;
    if (!startTime) startTime = performance.now();
    let value = input.value;
    if (value.length > snippet.length) { value = value.slice(0, snippet.length); input.value = value; }
    if (value.length > prevLen) {
      for (let i = prevLen; i < value.length; i++) {
        typedCount++;
        if (value[i] === snippet[i]) correctCount++;
      }
    }
    prevLen = value.length;
    render();
    updateLiveStats();
    if (value.length >= snippet.length) finish();
  });

  field.addEventListener('click', () => { if (running) input.focus(); });
  input.addEventListener('focus', () => field.classList.add('is-focused'));
  input.addEventListener('blur', () => field.classList.remove('is-focused'));

  playBtn.addEventListener('click', start);

  snippet = pickSnippet();
  render();
})();

/* ---------- playground: word maze — drag through every square, ending on the last letter ---------- */
(function wordMaze() {
  const board = document.getElementById('mazeBoard');
  if (!board) return;
  const clueEl = document.getElementById('mazeClue');
  const slotsEl = document.getElementById('mazeSlots');
  const msgEl = document.getElementById('mazeMsg');
  const solvedEl = document.getElementById('mazeSolved');
  const timeEl = document.getElementById('mazeTime');
  const bestEl = document.getElementById('mazeBest');
  const undoBtn = document.getElementById('mazeUndo');
  const resetBtn = document.getElementById('mazeReset');
  const hintBtn = document.getElementById('mazeHint');
  const newBtn = document.getElementById('mazeNew');
  const sizeBtns = [...document.querySelectorAll('.maze__size')];

  const NS = 'http://www.w3.org/2000/svg';
  const S = 100;   // one square, in viewBox units
  const PASS = 3;  // words solved (in total) that unlock the achievement

  // Words about the world this portfolio lives in. The grid is always bigger than the word: the squares
  // that carry no letter are blank, but the trail still has to cross every one of them, and the letters
  // met along the way, in order, spell the word.
  const WORDS = [
    ['DEPLOY', 'colocar a aplicação no ar, para todo mundo usar'],
    ['PYTHON', 'linguagem de programação com nome de cobra'],
    ['DOCKER', 'a baleia que empacota aplicações em containers'],
    ['GITHUB', 'onde o código do Artur mora'],
    ['SCRIPT', 'roteiro de comandos que o computador executa sozinho'],
    ['PIPELINE', 'a esteira do CI/CD: build, testes e entrega, tudo automático'],
    ['TERMINAL', 'a janela preta onde se digitam comandos'],
    ['SERVIDOR', 'o computador que responde aos pedidos da internet'],
    ['VARIAVEL', 'guarda um valor debaixo de um nome'],
    ['RECURSAO', 'quando uma função chama a si mesma'],
    ['COMPILAR', 'transformar o código-fonte em programa executável'],
    ['FRAMEWORK', 'estrutura pronta que acelera a construção de apps, como React ou .NET'],
    ['ALGORITMO', 'passo a passo para resolver um problema'],
    ['PORTFOLIO', 'a vitrine de um desenvolvedor — como este site'],
    ['CONTAINER', 'caixa isolada que leva a aplicação e tudo de que ela precisa'],
    ['INTERFACE', 'a parte do sistema que a pessoa vê e toca'],
    ['NAVEGADOR', 'o programa que abre este site: Chrome, Firefox, Edge...'],
    ['INTEGRACAO', 'o "I" do CI/CD: juntar o código de todo mundo o tempo todo'],
    ['COMPUTACAO', 'a ciência que estuda algoritmos, dados e máquinas'],
    ['ENGENHARIA', 'profissão de quem projeta e constrói, como a de software'],
    ['ARQUITETURA', 'o desenho de como as partes de um sistema se encaixam'],
    ['PROGRAMACAO', 'a arte de dar ordens ao computador — o que o Artur faz'],
    ['REPOSITORIO', 'o lugar onde o código e todo o seu histórico ficam guardados'],
    ['AUTENTICACAO', 'provar quem você é para entrar no sistema'],
    ['DOCUMENTACAO', 'o texto que explica como usar o código (e que ninguém quer escrever)'],
    ['ORQUESTRACAO', 'o que o Kubernetes faz: coordenar vários containers'],
    ['CONFIGURACAO', 'os ajustes que dizem ao sistema como se comportar'],
    ['DESENVOLVEDOR', 'quem escreve e mantém o software — e assina este site'],
    ['MICROSSERVICO', 'uma parte pequena e independente de um sistema maior'],
    ['MONITORAMENTO', 'acompanhar a saúde do sistema em tempo real'],
    ['ESCALABILIDADE', 'capacidade de crescer para atender mais gente sem quebrar'],
    ['DESENVOLVIMENTO', 'o ciclo de criar software, da ideia ao código'],
  ];
  // The board is a square of n x n. Each size takes words of a fitting length and fills in a different
  // share of the spare wall room: more walls leave fewer choices, so 4x4 is gentler and 6x6 is bare.
  const SIZES = {
    4: { minLen: 6, maxLen: 12, extraWalls: 0.5 },
    5: { minLen: 8, maxLen: 15, extraWalls: 0.25 },
    6: { minLen: 10, maxLen: 15, extraWalls: 0 },
  };
  const DEFAULT_SIZE = 5;

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---- generating a maze ----
     Squares are numbered row by row. A wall is stored as the key of the two squares it separates.
     1. draw a random route through EVERY square of the grid;
     2. lay the word's letters along it — the first and last squares of the route always carry the first
        and last letter, the others go on randomly chosen squares in between, and the rest stay blank;
     3. add walls (never across a step of the route) until that route is the ONLY way through, then take
        away any that turned out not to be needed, and put a share of the spare ones back so it reads
        as a maze (none of them can block the route). */
  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  function neighboursOf(i, rows, cols) {
    const r = Math.floor(i / cols), c = i % cols, out = [];
    if (r > 0) out.push(i - cols);
    if (r < rows - 1) out.push(i + cols);
    if (c > 0) out.push(i - 1);
    if (c < cols - 1) out.push(i + 1);
    return out;
  }

  function turnRound(arr, i, j) {
    for (; i < j; i++, j--) [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  // A random route through every square. It starts as a serpentine (left to right, then right to left...)
  // and is then "backbitten": an end of the route hops onto a neighbouring square and the stretch it
  // skipped is turned round. That always leaves a valid route, and a few hundred hops make it look
  // nothing like the serpentine — and, unlike digging for one, it doesn't get stuck on a big grid.
  function randomRoute(rows, cols) {
    const n = rows * cols;
    const route = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) route.push(r * cols + (r % 2 ? cols - 1 - c : c));
    for (let hop = 0; hop < n * 25; hop++) {
      const atEnd = Math.random() < 0.5;
      const around = neighboursOf(atEnd ? route[n - 1] : route[0], rows, cols);
      const k = route.indexOf(around[Math.floor(Math.random() * around.length)]);
      if (atEnd && k < n - 2) turnRound(route, k + 1, n - 1);
      else if (!atEnd && k > 1) turnRound(route, 0, k - 1);
    }
    return Math.random() < 0.5 ? route.reverse() : route;
  }

  // how many ways are there to visit every square from `start`, counting no further than `limit`
  function countRoutes(start, rows, cols, walls, limit) {
    const n = rows * cols;
    const around = Array.from({ length: n }, (_, i) => neighboursOf(i, rows, cols));
    const blocked = new Uint8Array(n * n);
    walls.forEach((k) => { const [a, b] = k.split('-').map(Number); blocked[a * n + b] = blocked[b * n + a] = 1; });
    const seen = new Uint8Array(n);
    const mark = new Int32Array(n);
    let stamp = 0;
    let count = 0;

    // Is a full route still possible after stepping onto `head`? Every square left must be reachable from
    // it, none may be cut off, and at most one may have a single way in (that one has to be the end).
    function viable(head, left) {
      let deadEnds = 0;
      for (let i = 0; i < n; i++) {
        if (seen[i]) continue;
        let ways = 0;
        for (const nx of around[i]) if ((!seen[nx] || nx === head) && !blocked[i * n + nx]) ways++;
        if (ways === 0) return false;
        if (ways === 1 && ++deadEnds > 1) return false;
      }
      const stack = [head];
      let reached = 0;
      stamp++;
      mark[head] = stamp;
      while (stack.length) {
        const cur = stack.pop();
        for (const nx of around[cur]) {
          if (seen[nx] || mark[nx] === stamp || blocked[cur * n + nx]) continue;
          mark[nx] = stamp;
          reached++;
          stack.push(nx);
        }
      }
      return reached === left;
    }

    seen[start] = 1;
    (function walk(cur, len) {
      if (count >= limit) return;
      if (len === n) { count++; return; }
      for (const next of around[cur]) {
        if (seen[next] || blocked[cur * n + next]) continue;
        seen[next] = 1;
        if (viable(next, n - len - 1)) walk(next, len + 1);
        seen[next] = 0;
      }
    })(start, 1);
    return count;
  }

  // extraShare: how much of the spare wall room is filled in — more walls leave fewer choices (easier)
  function makePuzzle(word, clue, rows, cols, extraShare) {
    const n = rows * cols;
    const route = randomRoute(rows, cols);
    const start = route[0];

    // which steps of the route carry a letter: the two ends, plus the rest of the word somewhere between
    const between = shuffle([...Array(n - 2).keys()].map((i) => i + 1)).slice(0, word.length - 2).sort((a, b) => a - b);
    const letters = [];
    [0, ...between, n - 1].forEach((step, i) => { letters[route[step]] = word[i]; });

    const steps = new Set();
    for (let i = 0; i < n - 1; i++) steps.add(key(route[i], route[i + 1]));
    const candidates = [];
    for (let a = 0; a < n; a++) {
      for (const b of neighboursOf(a, rows, cols)) if (a < b && !steps.has(key(a, b))) candidates.push(key(a, b));
    }
    const walls = new Set();
    for (const k of shuffle([...candidates])) {
      walls.add(k);
      if (countRoutes(start, rows, cols, walls, 2) === 1) break;
    }
    const began = performance.now();
    for (const k of shuffle([...walls])) {
      if (performance.now() - began > 400) break; // good enough — a slow phone shouldn't wait on tidying up
      walls.delete(k);
      if (countRoutes(start, rows, cols, walls, 2) !== 1) walls.add(k);
    }
    const spare = shuffle(candidates.filter((k) => !walls.has(k)));
    spare.slice(0, Math.ceil(spare.length * extraShare)).forEach((k) => walls.add(k));

    return { word, clue, rows, cols, size: n, letters, walls, route, start, end: route[n - 1] };
  }

  /* ---- the game ---- */
  let puzzle, path, solved, hintsUsed;
  let cells = [], slotEls = [], trail, wallEls = new Map(), bumpedAt = new Map();
  let solvedTotal = 0, lastWord = '', boardSize = DEFAULT_SIZE;
  let bests = {};
  let startedAt = 0, timerId = 0, hintTimer = 0;
  try { solvedTotal = Number(localStorage.getItem('artur-maze-solved')) || 0; } catch (e) {}
  try { boardSize = SIZES[Number(localStorage.getItem('artur-maze-size'))] ? Number(localStorage.getItem('artur-maze-size')) : DEFAULT_SIZE; } catch (e) {}
  try { bests = JSON.parse(localStorage.getItem('artur-maze-best-v2') || '{}') || {}; } catch (e) {}
  solvedEl.textContent = solvedTotal;

  function svgEl(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function build() {
    const { rows, cols } = puzzle;
    board.replaceChildren();
    board.setAttribute('viewBox', `0 0 ${cols * S} ${rows * S}`);
    board.style.setProperty('--cols', cols);

    const defs = svgEl('defs', {}, board);
    const grad = svgEl('linearGradient', { id: 'mazeTrail', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: cols * S, y2: rows * S }, defs);
    svgEl('stop', { offset: '0' }, grad).style.setProperty('stop-color', 'var(--green)');
    svgEl('stop', { offset: '1' }, grad).style.setProperty('stop-color', 'var(--cyan)');

    cells = [];
    for (let i = 0; i < puzzle.size; i++) {
      cells.push(svgEl('rect', { x: (i % cols) * S + 4, y: Math.floor(i / cols) * S + 4, width: S - 8, height: S - 8, rx: 14, class: `maze__cell${puzzle.letters[i] ? '' : ' is-blank'}`, 'data-i': i }, board));
    }
    cells[puzzle.start].classList.add('is-start');
    cells[puzzle.end].classList.add('is-end');

    trail = svgEl('polyline', { class: 'maze__trail' }, board);

    wallEls = new Map();
    bumpedAt = new Map();
    puzzle.walls.forEach((k) => {
      const [a, b] = k.split('-').map(Number); // a < b: b is the square to the right of a, or the one below it
      const r = Math.floor(a / cols), c = a % cols;
      const attrs = b === a + 1
        ? { x1: (c + 1) * S, y1: r * S + 8, x2: (c + 1) * S, y2: (r + 1) * S - 8 }
        : { x1: c * S + 8, y1: (r + 1) * S, x2: (c + 1) * S - 8, y2: (r + 1) * S };
      wallEls.set(k, svgEl('line', { ...attrs, class: 'maze__wall', 'data-a': a, 'data-b': b }, board));
    });

    for (let i = 0; i < puzzle.size; i++) {
      const cx = (i % cols) * S + S / 2, cy = Math.floor(i / cols) * S + S / 2;
      if (puzzle.letters[i]) {
        svgEl('text', { x: cx, y: cy, dy: '.35em', class: 'maze__letter', 'data-i': i, 'aria-hidden': 'true' }, board).textContent = puzzle.letters[i];
      } else {
        svgEl('circle', { cx, cy, r: 6, class: 'maze__dot', 'data-i': i }, board); // a blank square: nothing to read, still to cross
      }
    }

    slotsEl.replaceChildren();
    slotEls = [...puzzle.word].map(() => {
      const s = document.createElement('span');
      s.className = 'maze__slot';
      slotsEl.appendChild(s);
      return s;
    });
    clueEl.innerHTML = `<span>dica:</span> ${esc(puzzle.clue)}`;
    bestEl.textContent = bests[puzzle.size] ? fmtTime(bests[puzzle.size]) : '--';
  }

  const spelledBy = (squares) => squares.filter((c) => puzzle.letters[c]).map((c) => puzzle.letters[c]);

  function paint() {
    const { cols } = puzzle;
    const head = path[path.length - 1];
    cells.forEach((c, i) => {
      c.classList.toggle('is-on', path.includes(i));
      c.classList.toggle('is-head', i === head);
    });
    trail.setAttribute('points', path.map((c) => `${(c % cols) * S + S / 2},${Math.floor(c / cols) * S + S / 2}`).join(' '));
    const spelled = spelledBy(path); // blank squares add nothing to the word
    slotEls.forEach((s, i) => {
      s.textContent = spelled[i] || '';
      s.classList.toggle('is-filled', !!spelled[i]);
    });
    board.classList.toggle('is-fresh', path.length === 1 && !solved); // the start square calls for attention until you move
    undoBtn.disabled = solved || path.length === 1;
    resetBtn.disabled = solved || path.length === 1;
    hintBtn.disabled = solved;
  }

  function say(text, kind) {
    msgEl.className = `maze__msg${kind ? ` maze__msg--${kind}` : ''}`;
    msgEl.innerHTML = text;
  }

  function startTimer() {
    if (timerId || solved) return;
    startedAt = Date.now();
    timerId = setInterval(() => { timeEl.textContent = fmtTime((Date.now() - startedAt) / 1000); }, 500);
  }
  function stopTimer() {
    clearInterval(timerId);
    timerId = 0;
  }

  function paintSizes() {
    sizeBtns.forEach((btn) => btn.setAttribute('aria-pressed', String(Number(btn.dataset.size) === boardSize)));
  }

  function newPuzzle() {
    stopTimer();
    clearTimeout(hintTimer);
    const { minLen, maxLen, extraWalls } = SIZES[boardSize];
    const fitting = WORDS.filter(([w]) => w.length >= minLen && w.length <= maxLen && w !== lastWord);
    const [word, clue] = fitting[Math.floor(Math.random() * fitting.length)];
    lastWord = word;
    puzzle = makePuzzle(word, clue, boardSize, boardSize, extraWalls);
    path = [puzzle.start];
    solved = false;
    hintsUsed = 0;
    board.classList.remove('is-solved');
    timeEl.textContent = '0:00';
    newBtn.textContent = 'outra palavra';
    newBtn.classList.remove('is-next');
    say('');
    build();
    paint();
    paintSizes();
  }

  function win() {
    solved = true;
    stopTimer();
    const secs = (Date.now() - startedAt) / 1000;
    path.forEach((c, i) => cells[c].style.setProperty('--i', i)); // the light runs along the trail, in order
    board.classList.add('is-solved');
    solvedTotal++;
    solvedEl.textContent = solvedTotal;
    try { localStorage.setItem('artur-maze-solved', String(solvedTotal)); } catch (e) {}

    let note = hintsUsed ? ` · ${hintsUsed} ${hintsUsed === 1 ? 'dica' : 'dicas'}` : ' · sem dicas';
    if (!hintsUsed && (!bests[puzzle.size] || secs < bests[puzzle.size])) { // only a clean run sets a record
      bests[puzzle.size] = Math.round(secs * 10) / 10;
      bestEl.textContent = fmtTime(bests[puzzle.size]);
      try { localStorage.setItem('artur-maze-best-v2', JSON.stringify(bests)); } catch (e) {}
      note += ' · novo recorde!';
    }
    playEat();
    say(`isso aí! era <b>${puzzle.word}</b> — ${fmtTime(secs)}${note}`, 'ok');
    newBtn.textContent = 'próxima palavra';
    newBtn.classList.add('is-next');
    paint();
    if (solvedTotal >= PASS) unlockAchievement('maze');
  }

  // a wall in the way: it flashes (and the phone buzzes) so it's clear why the trail stopped there
  function bump(a, b) {
    const k = key(a, b), line = wallEls.get(k), now = Date.now();
    if (!line || now - (bumpedAt.get(k) || 0) < 450) return;
    bumpedAt.set(k, now);
    line.classList.add('is-bump');
    setTimeout(() => line.classList.remove('is-bump'), 400);
    if (navigator.vibrate) navigator.vibrate(12);
  }

  // One move. Stepping onto the square just behind the head takes the last step back; pressing on an
  // earlier square of the trail (allowRewind) cuts the trail back to it.
  function step(cell, allowRewind) {
    const head = path[path.length - 1];
    if (solved || cell === head) return;
    const at = path.indexOf(cell);
    if (at !== -1) {
      if (at === path.length - 2) path.pop();
      else if (allowRewind) path.length = at + 1;
      else return;
    } else if (neighboursOf(head, puzzle.rows, puzzle.cols).includes(cell)) {
      if (puzzle.walls.has(key(head, cell))) { bump(head, cell); return; }
      path.push(cell);
    } else {
      return;
    }
    startTimer();
    playClick();
    say('');
    paint();
    if (path.length === puzzle.size) {
      if (spelledBy(path).join('') === puzzle.word) win();
      else say('essa rota não forma a palavra — desfaça um pedaço e tente outro caminho.', 'warn');
    }
  }

  /* ---- pointer: press on the trail, drag over the squares ---- */
  function cellAt(clientX, clientY) {
    const r = board.getBoundingClientRect();
    const fx = ((clientX - r.left) / r.width) * puzzle.cols;
    const fy = ((clientY - r.top) / r.height) * puzzle.rows;
    const col = Math.floor(fx), row = Math.floor(fy);
    if (col < 0 || col >= puzzle.cols || row < 0 || row >= puzzle.rows) return -1;
    const ix = fx - col, iy = fy - row;
    if (ix < 0.14 || ix > 0.86 || iy < 0.14 || iy > 0.86) return -1; // too near an edge to tell which square is meant
    return row * puzzle.cols + col;
  }

  let dragging = false, lastX = 0, lastY = 0;
  board.addEventListener('pointerdown', (e) => {
    if (solved || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell < 0) return;
    e.preventDefault();
    board.focus({ preventScroll: true });
    board.setPointerCapture(e.pointerId);
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    step(cell, true);
  });
  board.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    // walk along the way in small strides so a quick swipe can't hop over a square
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    const stride = (board.getBoundingClientRect().width / puzzle.cols) * 0.25;
    const strides = Math.max(1, Math.ceil(Math.hypot(dx, dy) / stride));
    for (let i = 1; i <= strides; i++) {
      const cell = cellAt(lastX + (dx * i) / strides, lastY + (dy * i) / strides);
      if (cell >= 0) step(cell, false);
    }
    lastX = e.clientX;
    lastY = e.clientY;
  });
  const letGo = () => { dragging = false; };
  board.addEventListener('pointerup', letGo);
  board.addEventListener('pointercancel', letGo);
  board.addEventListener('lostpointercapture', letGo);

  /* ---- keyboard: arrows walk the trail, Backspace takes a step back, Esc starts over ---- */
  function undo() {
    if (!solved && path.length > 1) step(path[path.length - 2], false);
  }
  board.addEventListener('keydown', (e) => {
    if (solved) return;
    const head = path[path.length - 1];
    const { rows, cols } = puzzle;
    let target = null;
    if (e.key === 'ArrowUp' && head >= cols) target = head - cols;
    else if (e.key === 'ArrowDown' && head < (rows - 1) * cols) target = head + cols;
    else if (e.key === 'ArrowLeft' && head % cols > 0) target = head - 1;
    else if (e.key === 'ArrowRight' && head % cols < cols - 1) target = head + 1;
    if (target !== null) { e.preventDefault(); step(target, false); return; }
    if (e.key === 'Backspace' && path.length > 1) { e.preventDefault(); undo(); }
    else if (e.key === 'Escape' && path.length > 1) { e.stopPropagation(); reset(); }
  });

  function reset() {
    if (solved) return;
    path = [puzzle.start];
    say('');
    paint();
  }
  undoBtn.addEventListener('click', () => { undo(); });
  resetBtn.addEventListener('click', () => { playClick(); reset(); });

  // shows the next square of the way through; a wrong stretch of the trail is taken back first
  hintBtn.addEventListener('click', () => {
    if (solved) return;
    playClick();
    hintsUsed++;
    let k = 0;
    while (k < path.length && path[k] === puzzle.route[k]) k++;
    path.length = k;
    paint();
    startTimer();
    const next = cells[puzzle.route[k]];
    next.classList.add('is-hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => next.classList.remove('is-hint'), 1800);
  });

  newBtn.addEventListener('click', () => { playClick(); newPuzzle(); });

  // the board size is the player's to pick; it is remembered, and a new word is drawn at once
  sizeBtns.forEach((btn) => btn.addEventListener('click', () => {
    const size = Number(btn.dataset.size);
    if (size === boardSize) return;
    boardSize = size;
    try { localStorage.setItem('artur-maze-size', String(size)); } catch (e) {}
    playClick();
    newPuzzle();
  }));

  newPuzzle();
})();

/* ---------- playground: switcher between the three games sharing one window ---------- */
(function gameSwitcher() {
  const win = document.getElementById('playgroundWindow');
  if (!win) return;

  const titleEl = document.getElementById('playgroundTitle');
  const pages = [...win.querySelectorAll('.game-page')];
  const tabs = [...win.querySelectorAll('.game-switcher__tab')];
  const GAMES = ['snake', 'typing', 'maze'];
  const TITLES = { snake: 'snake.js', typing: 'typing.js', maze: 'labirinto.js' };
  let index = 0;

  function show(i) {
    index = ((i % GAMES.length) + GAMES.length) % GAMES.length;
    const active = GAMES[index];
    pages.forEach(p => { p.hidden = p.dataset.gamePage !== active; });
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.game === active));
    if (titleEl) titleEl.textContent = TITLES[active];
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', () => { show(i); playClick(); }));

  show(0);
})();

/* ---------- the secret overlay: the Konami code and five quick clicks on the logo both end up here ---------- */
function openSecretOverlay() {
  const overlay = document.getElementById('secretOverlay');
  if (!overlay || overlay.classList.contains('open')) return;
  const back = document.activeElement;
  overlay.classList.add('open');
  lockScroll();
  closeSecretOverlay = () => {
    overlay.classList.remove('open');
    unlockScroll();
    closeSecretOverlay = null;
    if (back && document.contains(back) && !back.hidden) back.focus?.({ preventScroll: true });
  };
  document.getElementById('closeSecret')?.focus({ preventScroll: true });
}
(function secretOverlayControls() {
  const overlay = document.getElementById('secretOverlay');
  if (!overlay) return;
  document.getElementById('closeSecret')?.addEventListener('click', () => closeSecretOverlay?.());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSecretOverlay?.(); });
  document.getElementById('secretTrophies')?.addEventListener('click', () => { closeSecretOverlay?.(); openAchievementsModal(); });
})();

/* ---------- konami code: from the keyboard, or from the on-screen controller (the hint in the footer) ---------- */
(function konami() {
  const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const TURN = { ArrowUp: 0, ArrowRight: 90, ArrowDown: 180, ArrowLeft: 270 }; // how far to turn the one "up" arrow icon
  const NAMES = { ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita', b: 'B', a: 'A' };
  const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']);
  let pos = 0; // how much of the code has been entered, whichever way (keyboard and controller share it)
  let padEl = null, seqEl = null, statusEl = null, slotEls = [], backTo = null, doneTimer = 0;

  const padOpen = () => !!padEl && padEl.classList.contains('open');
  const arrowIcon = (name) => `<span class="ui-icon ui-icon--arrow" style="--r:${TURN[name]}deg" aria-hidden="true"></span>`;

  function say(text, kind) {
    statusEl.className = `konami-pad__status${kind ? ` konami-pad__status--${kind}` : ''}`;
    statusEl.textContent = text;
  }

  function paint(state) {
    if (!padEl) return;
    slotEls.forEach((s, i) => {
      s.classList.toggle('is-done', i < pos);
      s.classList.toggle('is-next', i === pos);
    });
    seqEl.classList.remove('is-wrong');
    if (state === 'wrong') {
      void seqEl.offsetWidth; // restart the shake
      seqEl.classList.add('is-wrong');
      say('errou — recomeça do começo', 'bad');
    } else if (state === 'miss') {
      say('a sequência começa com ↑', 'bad');
    } else {
      say(pos ? `${pos}/${SEQ.length} — continue` : 'toque na sequência, na ordem');
    }
  }

  function complete() {
    pos = 0;
    unlockAchievement('konami');
    if (padOpen()) {
      slotEls.forEach((s) => { s.classList.add('is-done'); s.classList.remove('is-next'); });
      say('código aceito!', 'ok');
      doneTimer = setTimeout(() => { doneTimer = 0; closePad(); openSecretOverlay(); }, 550);
    } else {
      openSecretOverlay();
    }
  }

  // one input, from a key or a tap. `name` is an event.key: ArrowUp..., or b / a
  function feed(name) {
    if (closeSecretOverlay || doneTimer) return; // already found it
    if (name === SEQ[pos]) {
      pos++;
      if (pos === SEQ.length) complete(); else paint();
      return;
    }
    const lostProgress = pos > 0;
    pos = name === SEQ[0] ? 1 : 0; // a fresh ↑ can still be the start of a new attempt
    paint(lostProgress ? 'wrong' : (padOpen() && pos === 0 ? 'miss' : ''));
    if (lostProgress && navigator.vibrate) navigator.vibrate(25);
  }

  window.addEventListener('keydown', (e) => {
    if (MODIFIERS.has(e.key)) return; // Shift for a capital B must not count as a wrong key
    const name = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (padOpen()) {
      // in the controller only the code's own keys count — Enter/Space/Tab work its buttons, not the sequence
      if (!NAMES[name]) return;
      if (TURN[name] !== undefined) e.preventDefault();
    }
    feed(name);
  });

  function buildPad() {
    padEl = document.createElement('div');
    padEl.className = 'konami-pad';
    padEl.setAttribute('role', 'dialog');
    padEl.setAttribute('aria-modal', 'true');
    padEl.setAttribute('aria-label', 'Controle do código Konami');
    const dirKey = (name, cls) => `<button type="button" class="konami-pad__key konami-pad__key--${cls}" data-key="${name}" aria-label="${NAMES[name]}">${arrowIcon(name)}</button>`;
    padEl.innerHTML = `
      <div class="terminal-window konami-pad__window" tabindex="-1">
        <div class="terminal-window__bar">
          <span class="dot dot--red" aria-hidden="true"></span><span class="dot dot--yellow" aria-hidden="true"></span><span class="dot dot--green" aria-hidden="true"></span>
          <span class="terminal-window__title">controle.js</span>
          <button type="button" class="overlay-close" aria-label="fechar (Esc)"><span class="ui-icon ui-icon--close" aria-hidden="true"></span>fechar</button>
        </div>
        <div class="konami-pad__body">
          <p class="konami-pad__title">código secreto</p>
          <div class="konami-pad__seq"></div>
          <p class="konami-pad__status" role="status" aria-live="polite"></p>
          <div class="konami-pad__controls">
            <div class="konami-pad__dpad">
              ${dirKey('ArrowUp', 'up')}${dirKey('ArrowLeft', 'left')}<span class="konami-pad__hub" aria-hidden="true"></span>${dirKey('ArrowRight', 'right')}${dirKey('ArrowDown', 'down')}
            </div>
            <div class="konami-pad__actions">
              <button type="button" class="konami-pad__key konami-pad__key--b" data-key="b" aria-label="B">B</button>
              <button type="button" class="konami-pad__key konami-pad__key--a" data-key="a" aria-label="A">A</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(padEl);
    seqEl = padEl.querySelector('.konami-pad__seq');
    statusEl = padEl.querySelector('.konami-pad__status');
    seqEl.innerHTML = SEQ.map((name) => `<span class="konami-pad__slot">${TURN[name] !== undefined ? arrowIcon(name) : name.toUpperCase()}</span>`).join('');
    slotEls = [...seqEl.children];

    // pointerdown, not click: a tap lands the moment the thumb does. A key worked from the keyboard
    // (Enter/Space) still arrives as a click, with detail 0.
    padEl.querySelectorAll('.konami-pad__key').forEach((btn) => {
      const press = () => {
        playClick();
        if (navigator.vibrate) navigator.vibrate(8);
        feed(btn.dataset.key);
      };
      const release = () => btn.classList.remove('is-pressed');
      btn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        btn.classList.add('is-pressed');
        press();
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, release));
      btn.addEventListener('click', (e) => { if (e.detail === 0) press(); });
    });
    padEl.querySelector('.overlay-close').addEventListener('click', closePad);
    padEl.querySelector('.dot--red').addEventListener('click', closePad);
    padEl.addEventListener('click', (e) => { if (e.target === padEl) closePad(); });
  }

  function openPad() {
    if (padOpen()) return;
    if (!padEl) buildPad();
    pos = 0;
    paint();
    backTo = document.activeElement;
    padEl.classList.add('open');
    lockScroll();
    closeKonamiPad = closePad;
    padEl.querySelector('.konami-pad__window').focus({ preventScroll: true });
  }

  function closePad() {
    if (!padOpen()) return;
    clearTimeout(doneTimer);
    doneTimer = 0;
    pos = 0;
    padEl.classList.remove('open');
    unlockScroll();
    closeKonamiPad = null;
    if (backTo && document.contains(backTo) && !backTo.hidden) backTo.focus?.({ preventScroll: true });
    backTo = null;
  }

  openKonamiPad = openPad;
  document.querySelector('.konami-hint')?.addEventListener('click', openPad);
})();

/* ---------- logo click easter egg (click 5x fast) ---------- */
(function logoEgg() {
  const logo = document.getElementById('logoClick');
  if (!logo) return;
  let clicks = 0, timer = null;
  logo.addEventListener('click', (e) => {
    e.preventDefault();
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(() => { clicks = 0; }, 800);
    if (clicks >= 5) {
      openSecretOverlay();
      unlockAchievement('logo5x');
      clicks = 0;
    } else {
      document.getElementById('hero').scrollIntoView({ behavior: 'smooth' });
    }
  });
})();

/* ---------- scroll-spy (active nav link) + back to top ---------- */
(function scrollSpyAndBackToTop() {
  const navLinks = Array.from(document.querySelectorAll('.nav__links a[href^="#"]'));
  const sections = navLinks
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  if (navLinks.length && sections.length) {
    const setActive = (id) => {
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
    };
    const spy = new IntersectionObserver((entries) => {
      const visible = entries.filter((en) => en.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) setActive(visible[0].target.id);
    }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, .25, .5, .75, 1] });
    sections.forEach((s) => spy.observe(s));
  }

  const clearActiveIfAtTop = () => {
    if (window.scrollY < 100) navLinks.forEach((a) => a.classList.remove('active'));
  };

  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    const toggle = () => { backToTop.classList.toggle('visible', window.scrollY > 600); clearActiveIfAtTop(); };
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
    backToTop.addEventListener('click', () => {
      playClick();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();

/* ---------- copy email button on the contact card ---------- */
(function copyEmailButton() {
  const btn = document.getElementById('copyEmailBtn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard('arturtmelo1@gmail.com', { successDesc: 'arturtmelo1@gmail.com está na área de transferência.' });
  });
})();

/* ---------- download cv (reuses the existing print/résumé mode) ---------- */
(function downloadCv() {
  const btn = document.getElementById('downloadCvBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    playClick();
    window.print();
  });
})();

/* ---------- project filter chips (by technology) ---------- */
(function projectFilters() {
  const grid = document.querySelector('.projects__grid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.project-card'));

  const tags = new Set();
  cards.forEach((c) => c.querySelectorAll('.tags span').forEach((t) => tags.add(t.textContent.trim())));
  if (tags.size < 2) return;

  const bar = document.createElement('div');
  bar.className = 'projects__filters';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'filtrar projetos por tecnologia');

  const makeChip = (label, tag, active) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'projects__filter' + (active ? ' active' : '');
    btn.textContent = label;
    btn.dataset.tag = tag;
    return btn;
  };

  bar.appendChild(makeChip('todos', '', true));
  Array.from(tags).sort((a, b) => a.localeCompare(b)).forEach((tag) => bar.appendChild(makeChip(tag, tag, false)));

  grid.parentElement.insertBefore(bar, grid);

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.projects__filter');
    if (!btn) return;
    bar.querySelectorAll('.projects__filter').forEach((b) => b.classList.toggle('active', b === btn));
    const tag = btn.dataset.tag;
    playClick();
    cards.forEach((c) => {
      if (!tag) { c.classList.remove('is-filtered-out'); return; }
      const cardTags = Array.from(c.querySelectorAll('.tags span')).map((t) => t.textContent.trim());
      c.classList.toggle('is-filtered-out', !cardTags.includes(tag));
    });
  });
})();

/* ---------- Idiomas globe: now and then, reverse the spin ---------- */
(function globeSpinFlip() {
  const globe = document.querySelector('.fact-card__icon--globe');
  if (!globe || !globe.getAnimations) return;
  // absent under prefers-reduced-motion (the CSS drops the animation), so nothing to flip
  const spin = globe.getAnimations().find((a) => a.animationName === 'globeSpin');
  if (!spin) return;

  const TURN_MS = 96000; // must match the globeSpin duration in the CSS
  // Running backwards, currentTime would eventually hit 0, where a CSS
  // animation ends and the icon snaps back to unrotated. Keep a long runway
  // of whole turns (which leaves the visible angle unchanged) behind it.
  const addRunway = () => { if (spin.currentTime < TURN_MS * 20) spin.currentTime += TURN_MS * 200; };
  addRunway();

  let direction = 1;
  let rampId = 0;
  function flip() {
    addRunway();
    direction = -direction;
    const from = spin.playbackRate;
    const to = direction;
    const startedAt = performance.now();
    const RAMP_MS = 2400; // slow to a stop and turn back, like a heavy globe, not a jolt
    const id = ++rampId;
    (function ramp(now) {
      if (id !== rampId) return; // a newer flip took over
      const t = Math.min(1, (now - startedAt) / RAMP_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      spin.updatePlaybackRate(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(ramp);
    })(startedAt);
    schedule(12000, 23000);
  }
  function schedule(minMs, spreadMs) {
    setTimeout(flip, minMs + Math.random() * spreadMs);
  }
  schedule(6000, 10000); // first reversal after 6-16s, then every 12-35s at random
})();

/* ---------- corner buttons: the two orbiting dots wander at random ---------- */
// Every so often one dot (or both) turns round. On MEET_ODDS of those occasions the pair
// instead glides to face each other across the gap between the buttons — the WhatsApp dot
// at its bottom, the back-to-top dot at its top — waits a moment, then drifts off again.
(function fabDotDance() {
  if (!document.getAnimations || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const MEET_ODDS = 0.23;
  const RAMP_MS = 2400;        // slow to a stop and turn back, not a jolt
  const HOLD_MS = 2600;        // how long a meeting lasts
  const RUNWAY_TURNS = 60;     // see addRunway
  // orient: which way the CSS keyframes turn (the WhatsApp dot uses animation-direction: reverse);
  // meetAt: the dot's angle, clockwise from 12 o'clock, when it faces its neighbour;
  // cw: the way it is heading now, +1 clockwise / -1 counter-clockwise
  const dots = [
    { el: document.getElementById('backToTop'), orient: 1, period: 35000, cw: 1, meetAt: 0 },
    { el: document.querySelector('.whatsapp-btn'), orient: -1, period: 70000, cw: -1, meetAt: 180 },
  ];
  if (dots.some((d) => !d.el)) return;
  dots.forEach((d) => { d.anim = null; d.rampId = 0; });

  const mod = (n, m) => ((n % m) + m) % m;

  function grab(d) {
    if (!d.anim || d.anim.playState === 'idle') {
      d.anim = document.getAnimations().find((a) => a.animationName === 'fabDotOrbit' && a.effect && a.effect.target === d.el) || null;
    }
    return d.anim;
  }
  // Running backwards, currentTime would eventually hit 0, where a CSS animation ends and
  // the dot snaps to the top. Keep a runway of whole turns (visually a no-op) behind it.
  function addRunway(d) {
    if (d.anim.currentTime < d.period * 20) d.anim.currentTime += d.period * RUNWAY_TURNS;
  }
  function angleOf(d) {
    const t = getComputedStyle(d.el, '::after').transform;
    if (!t || t === 'none') return 0;
    const m = new DOMMatrixReadOnly(t);
    return mod(Math.atan2(m.b, m.a) * 180 / Math.PI, 360);
  }
  const timeFor = (d, deg) => (mod(d.orient * deg / 360, 1) + RUNWAY_TURNS) * d.period;

  function ramp(d, to) {
    const anim = d.anim;
    const from = anim.playbackRate;
    const start = performance.now();
    const id = ++d.rampId;
    (function step(now) {
      if (id !== d.rampId) return; // a newer change took over
      const t = Math.min(1, (now - start) / RAMP_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      anim.updatePlaybackRate(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  function turn(d, cw) {
    d.cw = cw;
    addRunway(d);
    ramp(d, cw * d.orient);
  }

  // Where a dot goes to meet: keep heading the way it was unless that is nearly a full lap.
  function plan(d) {
    const from = angleOf(d);
    const cwDist = mod(d.meetAt - from, 360);
    const ccwDist = mod(from - d.meetAt, 360);
    const travel = d.cw > 0
      ? (cwDist <= 300 ? cwDist : -ccwDist)
      : (ccwDist <= 300 ? -ccwDist : cwDist);
    const speed = d.cw * Math.abs(d.anim.playbackRate) * 360000 / d.period; // deg/s, + = clockwise
    return { from, travel, speed };
  }

  function meet(done) {
    dots.forEach((d) => { d.rampId++; addRunway(d); });
    const plans = dots.map(plan);
    const T = Math.min(11000, Math.max(5000, Math.max(...plans.map((p) => Math.abs(p.travel))) / 24 * 1000));
    // a cubic Hermite glide: it starts at the dot's current speed (when that is toward the
    // target) and comes to rest exactly on it, so there is no jolt at either end
    const starts = plans.map((p) => {
      if (Math.sign(p.speed) !== Math.sign(p.travel)) return 0;
      return Math.sign(p.travel) * Math.min(Math.abs(p.speed) * T / 1000, 3 * Math.abs(p.travel));
    });
    dots.forEach((d) => { d.anim.playbackRate = 0; });
    const t0 = performance.now();
    (function step(now) {
      const s = Math.min(1, (now - t0) / T);
      dots.forEach((d, i) => {
        const h = starts[i] * (s * s * s - 2 * s * s + s) + plans[i].travel * (-2 * s * s * s + 3 * s * s);
        d.anim.currentTime = timeFor(d, plans[i].from + h);
      });
      if (s < 1) { requestAnimationFrame(step); return; }
      setTimeout(() => {
        dots.forEach((d) => turn(d, Math.random() < 0.5 ? 1 : -1));
        done();
      }, HOLD_MS);
    })(t0);
  }

  const later = (minMs, spreadMs) => setTimeout(event, minMs + Math.random() * spreadMs);
  function event() {
    if (!dots.every(grab)) { later(15000, 15000); return; } // animations gone (reduced motion?) — try again later
    if (Math.random() < MEET_ODDS) { meet(() => later(12000, 18000)); return; }
    const who = Math.floor(Math.random() * 3); // 0 = back-to-top dot, 1 = WhatsApp dot, 2 = both
    dots.forEach((d, i) => { if (who === 2 || who === i) turn(d, -d.cw); });
    later(10000, 18000);
  }
  later(5000, 9000); // first event after 5-14s
})();
