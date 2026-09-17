/* =========================================================
   ARTUR // portfolio script
   ========================================================= */

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- console easter egg ---------- */
console.log(
  '%cVocê abriu o console. Curioso(a), hein? 👀',
  'color:#39ff8c;font-family:monospace;font-size:14px;font-weight:bold;'
);
console.log(
  '%cSe você é dev e está lendo isso: vamos trocar uma ideia -> arturtmelo1@gmail.com',
  'color:#00e0ff;font-family:monospace;font-size:12px;'
);

/* ---------- shared scroll-lock helper (reference-counted: several overlays can hold it at once) ---------- */
let scrollLockCount = 0;
function lockScroll() { scrollLockCount++; document.body.classList.add('no-scroll'); }
function unlockScroll() { scrollLockCount = Math.max(0, scrollLockCount - 1); if (scrollLockCount === 0) document.body.classList.remove('no-scroll'); }
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
  konami: { label: 'Código Konami', desc: 'Digitou o código secreto do joystick.' },
  logo5x: { label: 'Dedo Rápido', desc: 'Clicou 5x no logo em menos de um segundo.' },
  palette: { label: 'Power User', desc: 'Abriu a paleta de comandos (Ctrl+K).' },
  theme: { label: 'Decorador de Terminal', desc: 'Trocou o esquema de cores do site.' },
  arcade: { label: 'Modo Arcade', desc: 'Comeu a primeira maçã no Snake, lá no playground.' },
  hacker: { label: 'Script Kiddie', desc: 'Tentou invadir o mainframe com o comando hack.' },
  speedtyper: { label: 'Dedos de Fibra Óptica', desc: 'Bateu 60+ WPM na corrida de digitação.' },
  memory: { label: 'Memória de Elefante', desc: 'Completou o jogo da memória no playground.' },
};

let unlocked = new Set();
try { unlocked = new Set(JSON.parse(localStorage.getItem('artur-achievements') || '[]')); } catch (e) {}

let trophyBtn = null;
function updateTrophyBadge() {
  if (!trophyBtn) return;
  trophyBtn.querySelector('.trophy__count').textContent = `${unlocked.size}/${Object.keys(ACHIEVEMENTS).length}`;
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
    icon: '⚠️',
    label: 'Não copiou automaticamente',
    desc: 'Seu navegador bloqueou a área de transferência — selecione e copie o texto manualmente.'
  });
  if (!navigator.clipboard?.writeText) { onFail(); return; }
  navigator.clipboard.writeText(text)
    .then(() => showToast({ icon: icon || '📋', label: successLabel || 'Copiado!', desc: successDesc || 'Já está na sua área de transferência.' }))
    .catch(onFail);
}

function showToast({ label, desc, icon }) {
  const stack = ensureToastStack();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast__icon">${icon || '🏆'}</span><span class="toast__body"><strong>${label}</strong><br>${desc}</span>`;
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
      icon: '🎖️',
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
            <span class="achievements-list__icon">${unlocked.has(id) ? '🏆' : '🔒'}</span>
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
  { keys: ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A'], desc: 'código Konami — você sabe o que fazer' },
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

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
  });

  function loop() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  }
  loop();

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
    accent = getComputedStyle(document.documentElement).getPropertyValue('--green').trim() || '#39ff8c';
  }
  readAccent();

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    cols = Math.floor(w / 16);
    drops = new Array(cols).fill(1);
  }
  window.addEventListener('resize', resize);
  resize();

  function draw() {
    ctx.fillStyle = 'rgba(5,6,10,0.06)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.font = '14px monospace';
    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * 16, drops[i] * 16);
      if (drops[i] * 16 > h && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    requestAnimationFrame(draw);
  }
  draw();

  // repaint color instantly whenever the theme changes (polled cheaply on interval,
  // avoids wiring a bespoke event through every theme-switch call site)
  setInterval(readAccent, 800);
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
  // only close the topmost thing: leave a maximized window alone if the
  // command palette, achievements, or shortcuts modal is still open above it
  if (e.key !== 'Escape' || !currentMaximized) return;
  const paletteOpen = paletteEl?.classList.contains('open');
  const achModalOpen = achModalEl?.classList.contains('open');
  const shortcutsOpen = shortcutsModalEl?.classList.contains('open');
  if (!paletteOpen && !achModalOpen && !shortcutsOpen) restoreMaximized();
});

/* ---------- skills: interactive graph (replaces plain progress bars) ---------- */
(function skillGraph() {
  const canvas = document.getElementById('skillGraphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const CATEGORIES = [
    { id: 'lang', label: 'Linguagens', x: 0.16, y: 0.5 },
    { id: 'front', label: 'Frontend', x: 0.5, y: 0.14 },
    { id: 'cloud', label: 'Cloud & Ferramentas', x: 0.84, y: 0.5 },
  ];
  const SKILLS = [
    { id: 'cs', label: 'C#', cat: 'lang', level: .90, x: .08, y: .30 },
    { id: 'js', label: 'JavaScript', cat: 'lang', level: .80, x: .08, y: .72 },
    { id: 'java', label: 'Java', cat: 'lang', level: .70, x: .24, y: .86 },
    { id: 'py', label: 'Python', cat: 'lang', level: .75, x: .24, y: .16 },
    { id: 'dotnet', label: '.NET', cat: 'front', level: .90, x: .28, y: .06 },
    { id: 'react', label: 'React', cat: 'front', level: .75, x: .50, y: .14 },
    { id: 'vue', label: 'Vue/Angular', cat: 'front', level: .65, x: .74, y: .05, mobile: { x: .72, y: .07 } },
    { id: 'node', label: 'Node.js', cat: 'front', level: .70, x: .46, y: .34 },
    { id: 'azure', label: 'Azure', cat: 'cloud', level: .80, x: .94, y: .28 },
    { id: 'docker', label: 'Docker', cat: 'cloud', level: .70, x: .96, y: .58 },
    { id: 'sql', label: 'SQL / MySQL', cat: 'cloud', level: .80, x: .84, y: .84, mobile: { x: .92, y: .70 } },
    { id: 'git', label: 'Git / CI-CD', cat: 'cloud', level: .85, x: .66, y: .90 },
  ];
  const EXTRA_EDGES = [
    ['cs', 'dotnet'], ['dotnet', 'azure'], ['dotnet', 'git'],
    ['js', 'react'], ['js', 'node'], ['node', 'docker'],
  ];

  function themeColor(varName, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
  }
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`;
  }

  let w, h, hovered = null;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
  }
  window.addEventListener('resize', resize);
  resize();

  function pos(node) {
    const narrow = w < 620;
    const src = (narrow && node.mobile) ? node.mobile : node;
    // pull nodes in from the edges on narrow canvases so labels have room to breathe
    const compress = narrow ? 0.7 : 1;
    const x = 0.5 + (src.x - 0.5) * compress;
    return { x: x * w, y: src.y * h };
  }
  function radius(level) { return 5 + level * 9; }

  // keeps node labels from spilling past the canvas edge on narrow (mobile) widths
  function fillClampedLabel(str, x, y, pad = 4) {
    const half = ctx.measureText(str).width / 2;
    let align = 'center', drawX = x;
    if (x - half < pad) { align = 'left'; drawX = pad; }
    else if (x + half > w - pad) { align = 'right'; drawX = w - pad; }
    ctx.textAlign = align;
    ctx.fillText(str, drawX, y);
  }

  function findNodeAt(x, y) {
    for (const s of SKILLS) {
      const p = pos(s);
      if (Math.hypot(p.x - x, p.y - y) <= radius(s.level) + 6) return s;
    }
    for (const c of CATEGORIES) {
      const p = pos(c);
      if (Math.hypot(p.x - x, p.y - y) <= 16) return c;
    }
    return null;
  }

  function isConnected(node, a, b) {
    if (!node) return false;
    return node === a || node === b;
  }

  function draw(t) {
    const green = themeColor('--green', '#39ff8c');
    const cyan = themeColor('--cyan', '#00e0ff');
    const border = themeColor('--border', '#1c2230');
    const muted = themeColor('--muted', '#8b98a5');
    const text = themeColor('--text', '#dfe8f0');
    const borderRgb = hexToRgb(border);

    ctx.clearRect(0, 0, w, h);

    // edges: category anchor -> its skills
    ctx.lineWidth = 1;
    SKILLS.forEach(s => {
      const cat = CATEGORIES.find(c => c.id === s.cat);
      const a = pos(cat), b = pos(s);
      const on = isConnected(hovered, cat, s);
      ctx.strokeStyle = on ? green : `rgba(${borderRgb},.9)`;
      ctx.lineWidth = on ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });

    // extra cross-category edges (dashed)
    ctx.setLineDash([3, 4]);
    EXTRA_EDGES.forEach(([aId, bId]) => {
      const na = SKILLS.find(s => s.id === aId), nb = SKILLS.find(s => s.id === bId);
      const a = pos(na), b = pos(nb);
      const on = isConnected(hovered, na, nb);
      ctx.strokeStyle = on ? cyan : `rgba(${borderRgb},.9)`;
      ctx.lineWidth = on ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    ctx.setLineDash([]);

    // category anchors — a soft pulsing halo plus a solid core
    CATEGORIES.forEach((cat, i) => {
      const p = pos(cat);
      const pulse = reduceMotion ? .5 : .5 + .5 * Math.sin(t / 900 + i * 2);
      ctx.beginPath();
      ctx.fillStyle = `rgba(${hexToRgb(cyan)},${.12 + .08 * pulse})`;
      ctx.arc(p.x, p.y, 18 + 5 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = cyan;
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = text;
      ctx.font = `bold ${w < 620 ? 10 : 12}px "JetBrains Mono", monospace`;
      fillClampedLabel(cat.label, p.x, p.y - 18);
    });

    // skill nodes + always-visible labels
    SKILLS.forEach(s => {
      const p = pos(s);
      const r = radius(s.level);
      const on = hovered === s;
      ctx.beginPath();
      ctx.fillStyle = on ? cyan : green;
      ctx.globalAlpha = on ? 1 : .85;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (on) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = cyan;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = on ? text : muted;
      const skillFontSize = w < 620 ? 8.5 : 10;
      ctx.font = (on ? 'bold ' : '') + `${skillFontSize}px "JetBrains Mono", monospace`;
      fillClampedLabel(`${s.label} ${Math.round(s.level * 100)}%`, p.x, p.y + r + 13);
    });
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    hovered = findNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  });
  canvas.addEventListener('mouseleave', () => { hovered = null; });
  canvas.addEventListener('touchstart', (e) => {
    const rect = canvas.getBoundingClientRect();
    const t0 = e.touches[0];
    hovered = findNodeAt(t0.clientX - rect.left, t0.clientY - rect.top);
  }, { passive: true });

  if (reduceMotion) {
    draw(0);
  } else {
    (function loop(t) { draw(t); requestAnimationFrame(loop); })(0);
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
  soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem('artur-sound', soundEnabled ? 'on' : 'off'); } catch (e) {}
    soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    if (soundEnabled) playClick();
  });

  const paletteBtn = document.createElement('button');
  paletteBtn.type = 'button';
  paletteBtn.className = 'nav__iconbtn nav__iconbtn--kbd';
  paletteBtn.setAttribute('aria-label', 'Abrir paleta de comandos');
  paletteBtn.innerHTML = '⌘ <span>K</span>';
  paletteBtn.addEventListener('click', () => openPalette());

  trophyBtn = document.createElement('button');
  trophyBtn.type = 'button';
  trophyBtn.className = 'nav__iconbtn nav__trophy';
  trophyBtn.setAttribute('aria-label', 'Ver conquistas');
  trophyBtn.innerHTML = `🏆 <span class="trophy__count tabular">0/${Object.keys(ACHIEVEMENTS).length}</span>`;
  trophyBtn.addEventListener('click', () => openAchievementsModal());

  const shortcutsBtn = document.createElement('button');
  shortcutsBtn.type = 'button';
  shortcutsBtn.className = 'nav__iconbtn nav__iconbtn--kbd';
  shortcutsBtn.setAttribute('aria-label', 'Ver atalhos de teclado');
  shortcutsBtn.textContent = '⌨';
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
<span class="accent">redbull</span> · <span class="accent">joke</span> · <span class="accent">github</span> · <span class="accent">linkedin</span> · <span class="accent">konami</span> · <span class="accent">clear</span><br>
dica: aperte <span class="accent">Ctrl+K</span> (ou <span class="accent">⌘K</span>) em qualquer lugar da página pra abrir a paleta de comandos.`),
    about: () => print('Artur Tavares de Melo — desenvolvedor full-stack (C#/.NET, JS) com passagem por Economia antes da Ciência da Computação. Curioso, teimoso e movido a Red Bull.'),
    skills: () => print('C# · .NET · Java · Python · JavaScript · React · Vue · Angular · Node.js · SQL/MySQL · Docker · Azure · CI/CD'),
    experience: () => print('Intelectah (2023–2024) — full-stack C#/.NET + Azure, APIs escaláveis, CI/CD, testes E2E.<br>Hurtz Importação (2021–2022) — apps internas em Java/React, automação com Python.'),
    projects: () => print('Confira a seção <span class="accent">#projetos</span> logo acima — ou digite <span class="accent">ls</span>.'),
    contact: () => print('email: <span class="accent">arturtmelo1@gmail.com</span> — também disponível na seção de contato ↓'),
    whoami: () => print('artur — nível de acesso: root (no seu próprio código, pelo menos)'),
    ls: () => print('recifle/&nbsp;&nbsp;rover.cs&nbsp;&nbsp;tutor_de_logica.md&nbsp;&nbsp;curriculo.pdf&nbsp;&nbsp;sonhos_grandes/'),
    date: () => print(new Date().toString()),
    banner: banner,
    redbull: () => print(`<span class="term-icon term-icon--zap" aria-hidden="true"></span> estourando uma lata de Red Bull... nível de energia restaurado.<br>
<span class="muted">250ml · ~113 kcal · 27g açúcar · 80mg cafeína · produtividade +77%</span>`),
    joke: () => print(jokes[Math.floor(Math.random() * jokes.length)]),
    github: () => print('abrindo o github do Artur ... <a href="https://github.com/arturtmelo/" target="_blank" style="color:#00e0ff">clique aqui</a>'),
    linkedin: () => print('abrindo o linkedin do Artur ... <a href="https://www.linkedin.com/in/arturtmelo/" target="_blank" style="color:#00e0ff">clique aqui</a>'),
    sudo: () => print('Bonita tentativa. Você não está na lista de sudoers. Esse incidente será reportado. 😏'),
    konami: () => print('tente digitar isso com o teclado: ↑ ↑ ↓ ↓ ← → ← → B A'),
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
      print('abrindo o snake... boa sorte 🐍');
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
            print('ACESSO NEGADO. relaxa, isso é só uma piada — ninguém invade nada por aqui. 🕵️');
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

  function execute(raw) {
    raw = raw.trim();
    if (!raw) return;
    print(`<span class="prompt">artur@dev:~$</span> ${raw}`);
    const [cmd, ...args] = raw.split(' ');
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
    run: () => { applyTheme(key); unlockAchievement('theme'); showToast({ icon: '🎨', label: 'Tema alterado', desc: t.label }); }
  })),
  {
    label: 'Jogar Snake', hint: 'jogo game playground cobrinha', run: () => {
      scrollToId('playground');
      setTimeout(() => document.getElementById('snakePlay')?.click(), 500);
    }
  },
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
  if (paletteEl) paletteEl.classList.remove('open');
  unlockScroll();
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
  const CELL = canvas.width / GRID;

  let snake, dir, nextDir, foods, score, running, loopId, crashCell, isGameOver = false;
  let best = 0;
  try { best = Number(localStorage.getItem('artur-snake-best')) || 0; } catch (e) {}
  bestEl.textContent = best;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function themeColor(varName, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
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

    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
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
      ctx.shadowBlur = 4 + 6 * foodPulse;
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
        ctx.shadowBlur = 10 + 14 * headPulse;
      } else {
        ctx.fillStyle = mixColor(cyan, green, trailT);
        ctx.shadowColor = green;
        ctx.shadowBlur = 5;
      }
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.shadowBlur = 0;

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // the square the snake crashed into (only set on self-collision) lights up red
      if (crashCell) {
        const crashPulse = reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(t / 120);
        ctx.fillStyle = red;
        ctx.shadowColor = red;
        ctx.shadowBlur = 12 * crashPulse;
        ctx.fillRect(crashCell.x * CELL + 1, crashCell.y * CELL + 1, CELL - 2, CELL - 2);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = red;
        ctx.lineWidth = 2;
        ctx.strokeRect(crashCell.x * CELL + 1, crashCell.y * CELL + 1, CELL - 2, CELL - 2);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = green;
      ctx.font = 'bold 26px "JetBrains Mono", monospace';
      ctx.fillText('game over', canvas.width / 2, canvas.height / 2 - 100);
      ctx.fillStyle = '#dfe8f0';
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText(`você fez ${score} pontos`, canvas.width / 2, canvas.height / 2 - 70);
    }
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

  function endGame() {
    running = false;
    snakeIsPlaying = false;
    clearInterval(loopId);
    playGameOver();
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem('artur-snake-best', String(best)); } catch (e) {}
    }
    isGameOver = true;
    draw(true);
    playBtn.textContent = '⟲';
    playBtn.setAttribute('aria-label', 'jogar de novo');
    playBtn.hidden = false;
  }

  function start() {
    // an auto-focused terminal input elsewhere on the page would otherwise eat the arrow keys
    if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur();
    resetState();
    running = true;
    isGameOver = false;
    snakeIsPlaying = true;
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

  const DPAD_MAP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  dpad?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = DPAD_MAP[btn.dataset.dir];
      if (d) setDir(d[0], d[1]);
    });
  });

  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => { touchStart = e.touches[0]; }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.clientX;
    const dy = e.changedTouches[0].clientY - touchStart.clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) setDir(dx > 0 ? 1 : -1, 0);
    else if (Math.abs(dy) > 10) setDir(0, dy > 0 ? 1 : -1);
    touchStart = null;
  });

  playBtn.addEventListener('click', start);

  // idle preview before the first game
  resetState();
  draw(false);

  // a continuous render loop keeps the glow/pulse effects alive between
  // movement ticks (and while idle, before the first game starts)
  if (!reduceMotion) {
    (function animationLoop() {
      draw(isGameOver);
      requestAnimationFrame(animationLoop);
    })();
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

  input.addEventListener('paste', (e) => e.preventDefault());

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

/* ---------- playground: memory match ---------- */
(function memoryGame() {
  const boardEl = document.getElementById('memBoard');
  const movesEl = document.getElementById('memMoves');
  const bestEl = document.getElementById('memBest');
  const resetBtn = document.getElementById('memReset');
  if (!boardEl) return;

  const SYMBOLS = [
    { key: 'zap', label: 'raio' },
    { key: 'terminal', label: 'terminal' },
    { key: 'code', label: 'código' },
    { key: 'lock', label: 'cadeado' },
    { key: 'git', label: 'git' },
    { key: 'signal', label: 'sinal' },
    { key: 'cpu', label: 'chip' },
    { key: 'db', label: 'banco de dados' },
  ];
  let cards, flipped, matchedCount, moves, locked;
  let best = 0;
  try { best = Number(localStorage.getItem('artur-memory-best-4x4')) || 0; } catch (e) {}
  if (bestEl) bestEl.textContent = best || '--';

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function newGame() {
    cards = shuffle([...SYMBOLS, ...SYMBOLS]).map(sym => ({ sym, matched: false }));
    flipped = [];
    matchedCount = 0;
    moves = 0;
    locked = false;
    if (movesEl) movesEl.textContent = '0';
    render();
  }

  function render() {
    boardEl.innerHTML = '';
    cards.forEach((card, i) => {
      const revealed = card.matched || flipped.includes(i);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mem__card'
        + (card.matched ? ' mem__card--matched' : '')
        + (flipped.includes(i) ? ' mem__card--flipped' : '');
      btn.disabled = card.matched || locked;
      btn.setAttribute('aria-label', revealed ? `carta ${i + 1}: ${card.sym.label}` : `carta ${i + 1}`);
      if (revealed) {
        const icon = document.createElement('span');
        icon.className = `mem__icon mem__icon--${card.sym.key}`;
        icon.setAttribute('aria-hidden', 'true');
        btn.appendChild(icon);
      }
      btn.addEventListener('click', () => flipCard(i));
      boardEl.appendChild(btn);
    });
  }

  function flipCard(i) {
    if (locked || flipped.includes(i) || cards[i].matched) return;
    flipped.push(i);
    playClick();
    render();
    if (flipped.length < 2) return;

    moves++;
    if (movesEl) movesEl.textContent = moves;
    locked = true;
    const [a, b] = flipped;

    if (cards[a].sym === cards[b].sym) {
      cards[a].matched = true;
      cards[b].matched = true;
      flipped = [];
      locked = false;
      matchedCount++;
      playEat();
      render();
      if (matchedCount === SYMBOLS.length) finishGame();
    } else {
      setTimeout(() => {
        flipped = [];
        locked = false;
        render();
      }, 700);
    }
  }

  function finishGame() {
    if (!best || moves < best) {
      best = moves;
      if (bestEl) bestEl.textContent = best;
      try { localStorage.setItem('artur-memory-best-4x4', String(best)); } catch (e) {}
    }
    unlockAchievement('memory');
  }

  resetBtn?.addEventListener('click', newGame);
  newGame();
})();

/* ---------- playground: switcher between the three games sharing one window ---------- */
(function gameSwitcher() {
  const win = document.getElementById('playgroundWindow');
  if (!win) return;

  const titleEl = document.getElementById('playgroundTitle');
  const pages = [...win.querySelectorAll('.game-page')];
  const tabs = [...win.querySelectorAll('.game-switcher__tab')];
  const GAMES = ['snake', 'typing', 'memory'];
  const TITLES = { snake: 'snake.js', typing: 'typing.js', memory: 'memoria.js' };
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

/* ---------- konami code easter egg ---------- */
(function konami() {
  const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let pos = 0;
  const overlay = document.getElementById('secretOverlay');
  const closeBtn = document.getElementById('closeSecret');

  window.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === seq[pos]) {
      pos++;
      if (pos === seq.length) {
        overlay.classList.add('open');
        unlockAchievement('konami');
        pos = 0;
      }
    } else {
      pos = (key === seq[0]) ? 1 : 0;
    }
  });

  closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
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
      document.getElementById('secretOverlay').classList.add('open');
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
  const realCards = cards.filter((c) => !c.classList.contains('project-card--ghost'));

  const tags = new Set();
  realCards.forEach((c) => c.querySelectorAll('.tags span').forEach((t) => tags.add(t.textContent.trim())));
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
      if (c.classList.contains('project-card--ghost')) { c.classList.add('is-filtered-out'); return; }
      const cardTags = Array.from(c.querySelectorAll('.tags span')).map((t) => t.textContent.trim());
      c.classList.toggle('is-filtered-out', !cardTags.includes(tag));
    });
  });
})();
