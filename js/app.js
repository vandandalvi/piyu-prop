/* The story: one screen at a time. */
(() => {
  'use strict';
  const C = window.CONFIG;
  const { Cat, Sound, Sky, Confetti, Spring } = window;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const buzz = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* not supported */ } };
  const make = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const CANCEL = Symbol('cancel');
  const params = new URLSearchParams(location.search);
  let SCALE = 1;

  /* ---------- phone check ---------- */
  const isPhone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 820;
  function fitFrame() {
    if (!document.body.classList.contains('framed')) { SCALE = 1; return; }
    SCALE = Math.min(1, (innerHeight - 32) / 844, (innerWidth - 32) / 390);
    app.style.setProperty('--fit', SCALE);
  }
  function frame() { document.body.classList.add('framed'); fitFrame(); onResize(); }
  if (!isPhone) {
    if (params.has('preview')) document.body.classList.add('framed');
    else $('#guard').classList.add('show');
  }
  $('#g-preview').addEventListener('click', () => { $('#guard').classList.remove('show'); frame(); });

  /* ---------- helpers ---------- */
  function rel(el) {
    const a = app.getBoundingClientRect(), r = el.getBoundingClientRect();
    const x = (r.left - a.left) / SCALE, y = (r.top - a.top) / SCALE, w = r.width / SCALE, h = r.height / SCALE;
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  }
  async function type(el, text, w, speed = 36) {
    el.textContent = '';
    el.classList.add('typing-caret');
    for (const ch of Array.from(text)) {
      el.textContent += ch;
      await w(ch === ' ' ? speed * 0.5 : /[.,!?…]/.test(ch) ? speed * 5 : speed);
    }
    el.classList.remove('typing-caret');
  }
  async function lines(host, arr, w) {
    host.innerHTML = '';
    for (const t of arr) {
      const p = make('p', 'rv');
      p.textContent = t;
      host.appendChild(p);
      await w(40);
      p.classList.add('in');
      await w(1000);
    }
  }
  function floatHearts(host, n = 4) {
    for (let i = 0; i < n; i++) {
      const s = make('span', 'fheart', Math.random() < 0.7 ? '♥' : '♡');
      s.style.left = 25 + Math.random() * 50 + '%';
      s.style.fontSize = 14 + Math.random() * 12 + 'px';
      s.style.setProperty('--dx', Math.random() * 70 - 35 + 'px');
      s.style.animationDelay = i * 140 + 'ms';
      host.appendChild(s);
      setTimeout(() => s.remove(), 2400 + i * 140);
    }
  }
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
  }
  function goFull() {
    if (!C.fullscreen || document.body.classList.contains('framed')) return;
    const d = document.documentElement;
    try { if (d.requestFullscreen && !document.fullscreenElement) d.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) { /* ignore */ }
  }
  async function keepAwake() { try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (e) { /* ignore */ } }

  /* Hold-to-continue: ring fills while held, phone beats like a heart. */
  function makeHold(root, ms, onDone) {
    root.innerHTML = `<svg class="ring" viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="54"/><circle class="ring-fg" cx="60" cy="60" r="54"/></svg><div class="hold-disc">${Cat.paw('#fff')}</div>`;
    const fg = root.querySelector('.ring-fg');
    const L = 2 * Math.PI * 54;
    fg.style.strokeDasharray = L;
    let p = 0, holding = false, raf = 0, last = 0, done = false, beat = 0;
    const draw = () => { fg.style.strokeDashoffset = L * (1 - p); };
    const stopBeat = () => { clearInterval(beat); beat = 0; };
    const tick = (t) => {
      const dt = Math.min(50, t - last);
      last = t;
      p = clamp(p + (holding ? dt / ms : -dt / (ms * 0.45)), 0, 1);
      draw();
      if (p >= 1 && !done) {
        done = true; holding = false; stopBeat();
        root.classList.remove('holding'); root.classList.add('done');
        raf = 0; onDone();
        return;
      }
      raf = holding || p > 0 ? requestAnimationFrame(tick) : 0;
    };
    const run = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    root.addEventListener('pointerdown', (e) => {
      if (done) return;
      e.preventDefault();
      holding = true;
      root.classList.add('holding');
      buzz([35, 90, 35]);
      stopBeat();
      beat = setInterval(() => buzz([35, 90, 35]), 800);
      run();
    });
    const up = () => { if (!holding) return; holding = false; root.classList.remove('holding'); stopBeat(); run(); };
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    root.addEventListener('pointerleave', up);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
    draw();
    return { reset() { p = 0; done = false; holding = false; stopBeat(); draw(); root.classList.remove('done', 'holding'); } };
  }

  /* Swipeable card: follows the finger 1:1, then a spring takes over at the finger's speed. */
  function makeSwipe(card, o = {}) {
    const sx = new Spring(0), sy = new Spring(0);
    let raf = 0, last = 0, down = false, moved = false, leaving = false;
    let x0 = 0, y0 = 0, bx = 0, by = 0, hist = [], tgt = null;
    const render = () => {
      card.style.transform = `translate3d(${sx.x.toFixed(2)}px, ${sy.x.toFixed(2)}px, 0) rotate(${(sx.x * 0.05).toFixed(2)}deg)`;
      if (o.onMove) o.onMove(sx.x);
    };
    const loop = (t) => {
      const dt = Math.min(0.04, (t - last) / 1000);
      last = t;
      const a = sx.step(dt), b = sy.step(dt);
      render();
      if (leaving && Math.abs(sx.x) > 560) { raf = 0; return; }
      if (a && b && !leaving) { sx.x = sx.target; sy.x = sy.target; sx.v = sy.v = 0; render(); raf = 0; return; }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const leave = (dir, vx) => {
      leaving = true;
      card.style.pointerEvents = 'none';
      sx.set(1, 0.5); sy.set(1, 0.6);
      sx.target = dir * 640; sy.target = sy.x + 40;
      sx.v = dir * Math.max(Math.abs(vx), 1200);
      card.style.transition = 'opacity .45s ease';
      card.style.opacity = '0';
      kick();
      setTimeout(() => o.onSwipe && o.onSwipe(dir), 120);
    };
    card.addEventListener('pointerdown', (e) => {
      if (leaving) return;
      cancelAnimationFrame(raf); raf = 0;
      down = true; moved = false; tgt = e.target;
      x0 = e.clientX; y0 = e.clientY; bx = sx.x; by = sy.x; sx.v = sy.v = 0;
      hist = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
      card.style.transition = 'opacity .45s ease';
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    card.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = (e.clientX - x0) / SCALE, dy = (e.clientY - y0) / SCALE;
      if (!moved && Math.hypot(dx, dy) > 8) moved = true;
      if (!moved) return;
      sx.x = bx + dx; sy.x = by + dy * 0.3;
      hist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      while (hist.length > 2 && e.timeStamp - hist[0].t > 90) hist.shift();
      render();
    });
    const up = (e) => {
      if (!down) return;
      down = false;
      if (!moved) {
        if (e.type === 'pointerup' && o.onTap) o.onTap(tgt);
        if (sx.x || sy.x) { sx.target = 0; sy.target = 0; kick(); }
        return;
      }
      let vx = 0, vy = 0;
      const f = hist[0], l = hist[hist.length - 1];
      if (hist.length > 1 && e.timeStamp - l.t < 80) {
        const dt = Math.max(16, l.t - f.t) / 1000;
        vx = (l.x - f.x) / SCALE / dt; vy = (l.y - f.y) / SCALE / dt;
      }
      const projected = sx.x + (vx / 1000) * (0.995 / 0.005);
      const dir = projected > 130 ? 1 : projected < -130 ? -1 : 0;
      if (dir && (!o.canLeave || o.canLeave(dir))) { leave(dir, vx); return; }
      sx.set(o.backDamping || 0.72, 0.42); sy.set(0.85, 0.42);
      sx.target = 0; sy.target = 0; sx.v = vx; sy.v = vy * 0.3;
      kick();
      if (o.onReject) o.onReject(dir);
    };
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', up);
    return {
      fling(dir) { if (!leaving) leave(dir, dir * 1600); },
      shake() { if (leaving) return; sx.set(0.28, 0.32); sx.target = 0; sx.v = 1300; kick(); },
      reset() {
        cancelAnimationFrame(raf); raf = 0; leaving = false; down = false;
        sx.x = sx.target = sx.v = 0; sy.x = sy.target = sy.v = 0;
        card.style.transition = 'none'; card.style.opacity = ''; card.style.pointerEvents = '';
        render();
      },
      sync: render,
    };
  }

  /* ---------- the flow ---------- */
  const ORDER = ['lock', 'intro', 'match', 'meet', 'eyes', 'cards', 'voice', 'question', 'final'];
  const S = {};
  let cur = -1, token = 0;

  function go(i) {
    if (i < 0 || i >= ORDER.length || i === cur) return;
    const prev = S[ORDER[cur]];
    if (prev) { prev.el.classList.remove('active'); if (prev.leave) prev.leave(); }
    const my = ++token;
    cur = i;
    const s = S[ORDER[i]];
    hideNext();
    chrome();
    s.el.classList.add('active');
    const w = (ms) => wait(ms).then(() => { if (my !== token) throw CANCEL; });
    Promise.resolve().then(() => s.enter(w)).catch((e) => { if (e !== CANCEL) console.error(e); });
  }
  function chrome() {
    const story = cur >= 2, night = cur >= 7;
    $('#topbar').classList.toggle('show', story);
    $('#btn-back').classList.toggle('hide', !(cur >= 3 && cur <= 6));
    $('#progress').classList.toggle('hide', night);
    if (!night && app.classList.contains('night')) {
      app.classList.remove('night');
      Sky.stop(); Sky.reset();
      $('#roof').classList.remove('together', 'celebrate');
    }
    if (!night) {
      const p = clamp((cur - 2) / 5, 0, 1).toFixed(3);
      for (const [id, side] of [['#pc-me', 'left'], ['#pc-her', 'right']]) {
        const e = $(id);
        e.style[side] = `calc(${p} * (50% - 30px))`;
        e.classList.remove('walk'); void e.offsetWidth; e.classList.add('walk');
      }
    }
  }
  const nextBtn = $('#next');
  function showNext(label = 'next') { nextBtn.querySelector('.next-label').textContent = label; nextBtn.classList.add('show'); }
  function hideNext() { nextBtn.classList.remove('show'); }
  nextBtn.addEventListener('click', () => { buzz(10); go(cur + 1); });
  $('#btn-back').addEventListener('click', () => go(cur - 1));
  $('#btn-mute').addEventListener('click', (e) => {
    const m = !Sound.muted;
    Sound.setMuted(m);
    e.currentTarget.classList.toggle('muted', m);
  });

  /* 1 · lock */
  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '');
  S.lock = {
    el: $('#s-lock'),
    tries: 0,
    enter() {
      this.tries = 0;
      $('#lock-q').textContent = C.lock.question;
      $('#lock-input').value = '';
      $('#lock-msg').textContent = '';
      $('#envelope').classList.remove('open');
      $('.lock-wrap').classList.remove('opened');
      $('#lock-form').classList.remove('gone');
    },
  };
  $('#lock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    Sound.prime();
    const input = $('#lock-input');
    const v = norm(input.value);
    const answers = (C.lock.answers || []).map(norm).filter(Boolean);
    const ok = v && (!answers.length || answers.some((a) => v === a || (a.length >= 4 && v.includes(a))));
    if (!ok) {
      S.lock.tries++;
      const env = $('#envelope');
      env.classList.remove('nudge'); void env.offsetWidth; env.classList.add('nudge');
      buzz([30, 50, 30]);
      $('#lock-msg').textContent = !v ? 'Type your answer first 🐾' : S.lock.tries >= 2 && C.lock.hint ? C.lock.hint : "Hmm, that's not it 🐾";
      return;
    }
    input.blur();
    goFull();
    buzz([20, 40, 20]);
    $('#lock-msg').textContent = '';
    $('#lock-form').classList.add('gone');
    $('.lock-wrap').classList.add('opened');
    $('#envelope').classList.add('open');
    setTimeout(() => { const r = rel($('#envelope')); Confetti.burst(r.cx, r.y + 10, 24, { shapes: ['heart', 'sparkle'], speed: [2, 6] }); }, 900);
    await wait(2400);
    if (cur === 0) go(1);
  });

  /* 2 · intro note */
  const holdStart = makeHold($('#hold-start'), 1500, async () => {
    Sound.startBg(C.music.background);
    keepAwake();
    const r = rel($('#hold-start'));
    Confetti.burst(r.cx, r.cy, 40, { shapes: ['heart', 'paw', 'sparkle'] });
    buzz([20, 40, 70]);
    await wait(550);
    go(2);
  });
  S.intro = {
    el: $('#s-intro'),
    async enter(w) {
      const box = $('#note-lines');
      box.innerHTML = '';
      const cat = $('#note-cat .cat');
      cat.classList.add('is-closed'); cat.classList.remove('is-happy');
      ['#ear', '#hold-start', '#hold-start-label'].forEach((s) => $(s).classList.remove('in'));
      holdStart.reset();
      $('#note').classList.remove('in');
      await w(500);
      $('#note').classList.add('in');
      await w(1000);
      for (const text of C.intro) {
        const p = make('p');
        box.appendChild(p);
        await type(p, text, w);
        await w(450);
      }
      cat.classList.remove('is-closed'); cat.classList.add('is-happy');
      floatHearts($('#note-cat'), 3);
      await w(800);
      for (const s of ['#ear', '#hold-start', '#hold-start-label']) { $(s).classList.add('in'); await w(300); }
    },
  };

  /* 3 · the swipe + first chat */
  const stampYes = $('#profile .stamp-yes'), stampNo = $('#profile .stamp-no');
  const profileSwipe = makeSwipe($('#profile'), {
    onMove: (x) => { stampYes.style.opacity = clamp(x / 90, 0, 1); stampNo.style.opacity = clamp(-x / 90, 0, 1); },
    canLeave: (dir) => dir > 0,
    onReject: (dir) => { if (dir < 0) { toast('Wrong way 😾'); buzz([30, 40, 30]); } },
    onSwipe: () => S.match.matched(),
  });
  $('#pf-yes').addEventListener('click', () => profileSwipe.fling(1));
  $('#pf-no').addEventListener('click', () => { profileSwipe.shake(); toast('Wrong way 😾'); buzz([30, 40, 30]); });
  S.match = {
    el: $('#s-match'),
    enter(w) {
      this.w = w;
      this.done = false;
      clearInterval(this.timer);
      $('#profile-img').src = C.match.photo;
      $('#pf-name').textContent = C.match.name;
      $('#pf-bio').textContent = C.match.bio;
      $('#profile').classList.remove('gone');
      profileSwipe.reset();
      const chat = $('#chat');
      chat.innerHTML = '';
      chat.classList.remove('show');
      $('#match-controls').classList.remove('gone');
      $('#match-burst').classList.remove('show', 'out');
    },
    leave() { clearInterval(this.timer); },
    async matched() {
      if (this.done) return;
      this.done = true;
      const w = this.w;
      $('#match-controls').classList.add('gone');
      await w(300);
      const burst = $('#match-burst');
      burst.classList.add('show');
      await w(650);
      buzz([30, 50, 30, 50, 90]);
      const r = rel(burst.querySelector('.hi5'));
      Confetti.burst(r.cx, r.y + 30, 50, { shapes: ['heart', 'sparkle', 'paw'] });
      await w(1700);
      burst.classList.add('out');
      await w(500);
      const chat = $('#chat');
      chat.classList.add('show');
      chat.appendChild(make('p', 'chat-head', 'and then we talked…'));
      await w(800);
      const down = () => { chat.scrollTop = chat.scrollHeight; };
      for (const m of C.match.chats) {
        const b = make('div', `bubble ${m.from === 'me' ? 'me' : 'her'} typing`, '<i></i><i></i><i></i>');
        chat.appendChild(b); down();
        await w(clamp(450 + m.text.length * 26, 650, 1500));
        b.classList.remove('typing');
        b.textContent = m.text;
        buzz(8); down();
        await w(450);
      }
      const since = new Date(C.match.since).getTime();
      if (!Number.isNaN(since)) {
        await w(500);
        chat.appendChild(make('div', 'since', "<span>…and we haven't stopped since</span><b id=\"since-val\"></b>"));
        this.tick(since); down();
        this.timer = setInterval(() => this.tick(since), 1000);
      }
      await w(900);
      showNext('keep going');
    },
    tick(since) {
      const el = $('#since-val');
      if (!el) return;
      const ms = Math.max(0, Date.now() - since);
      const pad = (n) => String(n).padStart(2, '0');
      el.textContent = `${Math.floor(ms / 864e5)} days · ${pad(Math.floor(ms / 36e5) % 24)} hrs · ${pad(Math.floor(ms / 6e4) % 60)} min · ${pad(Math.floor(ms / 1e3) % 60)} sec`;
    },
  };

  /* 4 · polaroid of the day you met */
  S.meet = {
    el: $('#s-meet'),
    enter(w) {
      this.w = w; this.dev = 0; this.done = false; this.lastM = 0;
      $('#pola-img').src = C.meet.photo;
      const p = $('#pola');
      p.style.setProperty('--dev', '0');
      p.classList.remove('flash');
      $('#pola-cap').textContent = '';
      $('#meet-lines').innerHTML = '';
      $('#meet-hint').classList.remove('gone');
      window.addEventListener('devicemotion', motion);
    },
    leave() { window.removeEventListener('devicemotion', motion); },
    step(n) {
      if (this.done || cur !== 3) return;
      this.dev = Math.min(1, this.dev + n);
      const p = $('#pola');
      p.style.setProperty('--dev', this.dev.toFixed(2));
      p.classList.remove('wiggle'); void p.offsetWidth; p.classList.add('wiggle');
      buzz(12);
      if (this.dev >= 1) this.developed();
    },
    async developed() {
      this.done = true;
      const w = this.w, p = $('#pola');
      $('#meet-hint').classList.add('gone');
      await w(1000);
      p.classList.add('flash');
      buzz([20, 30, 60]);
      const r = rel(p);
      Confetti.burst(r.cx, r.y + r.h * 0.4, 28, { shapes: ['sparkle', 'heart'], speed: [2, 6] });
      await w(500);
      await type($('#pola-cap'), C.meet.date, w, 55);
      await w(500);
      await lines($('#meet-lines'), C.meet.lines, w);
      await w(500);
      showNext();
    },
  };
  function motion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0), now = performance.now();
    if (S.meet.lastM && Math.abs(m - S.meet.lastM) > 8 && now - (S.meet.lastT || 0) > 260) { S.meet.lastT = now; S.meet.step(0.2); }
    S.meet.lastM = m;
  }
  $('#pola').addEventListener('click', () => S.meet.step(0.25));

  /* 5 · see yourself through my eyes */
  const ef = $('#eyes-frame');
  S.eyes = {
    el: $('#s-eyes'),
    enter(w) {
      this.w = w; this.done = false; this.cells = new Set();
      ef.classList.remove('touching', 'touched', 'struck', 'swap', 'revealed');
      ef.querySelector('.ef-base').src = C.eyes.photo;
      ef.querySelector('.ef-true').src = C.eyes.photo;
      $('#ef-words').textContent = `“${C.eyes.herWords}”`;
      $('#eyes-lines').innerHTML = '';
      $('#eyes-hint').classList.remove('gone');
      this.lens(ef.clientWidth / 2, ef.clientHeight / 2, 0);
    },
    lens(x, y, s) {
      this.x = x; this.y = y; this.s = s;
      ef.style.setProperty('--x', x + 'px');
      ef.style.setProperty('--y', y + 'px');
      ef.style.setProperty('--s', s + 'px');
    },
    async reveal() {
      if (this.done) return;
      this.done = true;
      cancelAnimationFrame(sizeAnim);
      const w = this.w, W = ef.clientWidth, H = ef.clientHeight;
      const from = this.s, x0 = this.x, y0 = this.y, t0 = performance.now(), to = Math.hypot(W, H) * 2.6;
      ef.classList.remove('touching');
      await new Promise((res) => {
        const st = (t) => {
          const k = clamp((t - t0) / 1500, 0, 1);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          this.lens(x0 + (W / 2 - x0) * e, y0 + (H / 2 - y0) * e, from + (to - from) * e);
          if (k < 1) requestAnimationFrame(st); else res();
        };
        requestAnimationFrame(st);
      });
      ef.classList.add('revealed');
      buzz([20, 30, 70]);
      const r = rel(ef);
      Confetti.burst(r.cx, r.cy, 56, { shapes: ['sparkle', 'heart'], speed: [2, 7], g: 0.05, colors: ['#FFFFFF', '#FFD6E1', '#FFD6A5', '#E36F8C'] });
      $('#eyes-hint').classList.add('gone');
      await w(600);
      ef.classList.add('struck');
      await w(1100);
      ef.classList.add('swap');
      await w(450);
      $('#ef-words').textContent = C.eyes.newWords;
      ef.classList.remove('struck');
      await w(60);
      ef.classList.remove('swap');
      await w(700);
      await lines($('#eyes-lines'), C.eyes.lines, w);
      await w(400);
      showNext();
    },
  };
  let sizeAnim = 0, lensDown = false, lastSpark = 0;
  const LIFT = 34; // the heart floats a little above the finger so she can see under it
  function tweenLens(to, ms) {
    cancelAnimationFrame(sizeAnim);
    const from = S.eyes.s, t0 = performance.now();
    const st = (t) => {
      const k = clamp((t - t0) / ms, 0, 1), e = 1 - Math.pow(1 - k, 3);
      S.eyes.lens(S.eyes.x, S.eyes.y, from + (to - from) * e);
      if (k < 1) sizeAnim = requestAnimationFrame(st);
    };
    sizeAnim = requestAnimationFrame(st);
  }
  function efLocal(e) { const r = ef.getBoundingClientRect(); return [(e.clientX - r.left) / SCALE, (e.clientY - r.top) / SCALE - LIFT]; }
  function markCells(x, y) {
    const W = ef.clientWidth, H = ef.clientHeight, cols = 5, rows = 6, rad = Math.max(S.eyes.s, ef.clientWidth * 0.4) * 0.42;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.hypot((c + 0.5) * W / cols - x, (r + 0.5) * H / rows - y) < rad) S.eyes.cells.add(r * cols + c);
      }
    }
    if (S.eyes.cells.size >= 17) S.eyes.reveal();
  }
  ef.addEventListener('pointerdown', (e) => {
    if (S.eyes.done) return;
    lensDown = true;
    try { ef.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const [x, y] = efLocal(e);
    S.eyes.lens(x, y, S.eyes.s);
    ef.classList.add('touching', 'touched');
    tweenLens(ef.clientWidth * 0.52, 260);
    buzz(10);
  });
  ef.addEventListener('pointermove', (e) => {
    if (!lensDown || S.eyes.done) return;
    const [x, y] = efLocal(e);
    S.eyes.lens(x, y, S.eyes.s);
    markCells(x, y);
    const now = performance.now();
    if (now - lastSpark > 90) {
      lastSpark = now;
      const r = rel(ef), s = S.eyes.s;
      Confetti.burst(r.x + x + (Math.random() - 0.5) * s * 0.6, r.y + y + (Math.random() - 0.5) * s * 0.6, 1, { shapes: ['sparkle'], g: -0.02, speed: [0.2, 0.8], size: [7, 12], ttl: 0.55, colors: ['#FFFFFF', '#FFE3EC', '#FFD6A5'] });
    }
  });
  const efUp = () => { if (!lensDown) return; lensDown = false; if (S.eyes.done) return; ef.classList.remove('touching'); tweenLens(0, 320); };
  ef.addEventListener('pointerup', efUp);
  ef.addEventListener('pointercancel', efUp);

  /* 6 · little things (swipe cards) */
  function art(kind) {
    switch (kind) {
      case 'lioness': return `<div class="art-lion"><div class="al-cat">${Cat.cat({ who: 'her' })}</div><div class="al-mirror">${Cat.cat({ who: 'her', mane: true, brows: true, mouth: 'smile', noBow: true })}</div></div>`;
      case 'singer': return `<div class="art-sing">${Cat.cat({ who: 'her', eyes: 'happy', mouth: 'o' })}<span class="mnote n1">♪</span><span class="mnote n2">♫</span><span class="mnote n3">♪</span></div>`;
      case 'blush': return `<div class="art-blush">${Cat.cat({ who: 'her' })}<span class="tap-me">tap me</span></div>`;
      case 'chalent': return `<div class="art-chalent">${Cat.cat({ who: 'her', glasses: true, mouth: 'smirk', brow: true })}<span class="sparkle s1">✦</span><span class="sparkle s2">✦</span></div>`;
      case 'clingy': return `<div class="art-cling"><div class="ac-him">${Cat.cat({ who: 'him', eyes: 'happy' })}</div><div class="ac-her">${Cat.cat({ who: 'her', eyes: 'happy' })}</div><span class="ac-heart">♥</span></div>`;
      default: return Cat.cat({ who: 'her' });
    }
  }
  S.cards = {
    el: $('#s-cards'),
    enter(w) {
      this.w = w;
      const deck = $('#deck');
      deck.innerHTML = '';
      $('#deck-end').classList.remove('in');
      $('#cards-hint').classList.remove('gone');
      this.list = C.reasons.map((r, i) => {
        const c = make('div', 'lcard', `<div class="art">${art(r.art)}</div><h3></h3><p class="hand"></p><div class="cling-bubble"></div>`);
        c.querySelector('h3').textContent = r.title;
        c.querySelector('p').textContent = r.text;
        c.style.zIndex = String(100 - i);
        deck.appendChild(c);
        return { r, c, tries: 0 };
      });
      Sound.exists(C.music.herVoice).then((ok) => {
        const it = ok && this.list.find((x) => x.r.art === 'singer');
        if (it) it.c.querySelector('.art').appendChild(make('button', 'play-her', '▶ hear yourself'));
      });
      this.i = 0;
      this.layout();
      this.arm();
    },
    layout() {
      this.list.forEach((it, k) => {
        const d = k - this.i;
        if (d < 0) return;
        const dd = Math.min(d, 3);
        it.c.style.transition = 'transform .55s var(--out), opacity .45s';
        it.c.style.transform = `translate3d(0, ${dd * 22}px, 0) scale(${1 - dd * 0.045})`;
        it.c.style.opacity = d > 2 ? '0' : '1';
      });
      $('#deck-count').textContent = `${Math.min(this.i + 1, this.list.length)} / ${this.list.length}`;
    },
    arm() {
      const it = this.list[this.i];
      if (!it) { this.finish(); return; }
      const { r, c } = it;
      const sw = makeSwipe(c, {
        backDamping: r.clingy ? 0.45 : 0.72,
        canLeave: () => !r.clingy || it.tries >= 2,
        onReject: (dir) => {
          if (!r.clingy || !dir) return;
          it.tries++;
          const b = c.querySelector('.cling-bubble');
          b.textContent = it.tries === 1 ? 'Nope. Stay 🥺' : 'Just a little longer…';
          b.classList.add('show');
          c.classList.add('hug');
          buzz([15, 40, 15]);
          clearTimeout(it.bt);
          it.bt = setTimeout(() => { b.classList.remove('show'); c.classList.remove('hug'); }, 1500);
        },
        onSwipe: () => {
          if (r.clingy) toast('Okay fine… but stay close 🥺');
          buzz(12);
          this.i++;
          this.layout();
          setTimeout(() => this.arm(), 60);
        },
        onTap: (t) => {
          if (t && t.closest('.play-her')) { Sound.duck(0.2); Sound.playClip(C.music.herVoice).then(() => Sound.duck(1)); return; }
          if (r.art === 'blush') {
            const cat = c.querySelector('.cat');
            if (!cat.classList.contains('blush')) {
              cat.classList.add('blush', 'is-happy');
              c.querySelector('.tap-me').classList.add('gone');
              floatHearts(c.querySelector('.art'), 6);
              buzz([10, 30, 10]);
            }
          }
        },
      });
      setTimeout(() => { if (this.list[this.i] === it) { c.style.transition = 'opacity .45s ease'; sw.sync(); } }, 560);
    },
    async finish() {
      const w = this.w;
      $('#cards-hint').classList.add('gone');
      const e = $('#deck-end');
      e.textContent = C.reasonsEnd;
      await w(350);
      e.classList.add('in');
      await w(1300);
      showNext('keep going');
    },
  };

  /* 7 · your voice */
  const holdVoice = makeHold($('#hold-voice'), 1300, () => S.voice.play());
  S.voice = {
    el: $('#s-voice'),
    enter(w) {
      this.w = w;
      holdVoice.reset();
      $('#voice-title').textContent = C.voice.title;
      $('#voice-note').textContent = '';
      $('#wave').classList.remove('on');
      $('#voice-hold').classList.remove('gone');
    },
    leave() { Sound.stopClip(); Sound.duck(1); },
    async play() {
      const w = this.w;
      $('#voice-hold').classList.add('gone');
      $('#wave').classList.add('on');
      Sound.duck(0.15, 700);
      buzz(20);
      await w(500);
      const ok = await Sound.playClip(C.music.myVoice);
      if (!ok) {
        $('#voice-note').textContent = '(your voice note plays here)';
        await w(4200);
      }
      $('#wave').classList.remove('on');
      Sound.duck(1, 1600);
      await type($('#voice-note'), C.voice.after, w, 45);
      await w(800);
      showNext('one more thing');
    },
  };

  /* 8 · the question */
  const NO_LABELS = ['Are you sure?', 'Think again 🥺', 'Not an option 😾', 'Nice try 😼'];
  let noTries = 0;
  S.question = {
    el: $('#s-question'),
    async enter(w) {
      const pre = $('#q-pre'), q = $('#q-text'), btns = $('#q-btns'), no = $('#q-no');
      pre.classList.remove('in');
      q.textContent = '';
      btns.classList.remove('in');
      $('#q-yes').textContent = C.question.yes;
      no.textContent = C.question.no;
      no.classList.remove('free', 'turned');
      no.style.left = no.style.top = '';
      btns.appendChild(no);
      noTries = 0;
      $('#roof').classList.remove('together', 'celebrate');
      app.classList.add('night');
      Sky.start();
      Sound.duck(0.7, 2000);
      await w(1900);
      pre.textContent = C.question.pre;
      pre.classList.add('in');
      await w(2300);
      pre.classList.remove('in');
      await w(800);
      await Sky.formName(C.herName);
      buzz([10, 40, 10]);
      Sound.duck(1, 2500);
      await w(2700);
      $('#roof').classList.add('together');
      await w(2000);
      buzz(25);
      await type(q, C.question.text, w, 55);
      await w(500);
      btns.classList.add('in');
    },
  };
  $('#q-yes').addEventListener('click', () => go(8));
  const qNo = $('#q-no');
  qNo.addEventListener('pointerdown', (e) => {
    if (qNo.classList.contains('turned')) return;
    e.preventDefault();
    dodge();
  });
  qNo.addEventListener('click', (e) => { e.preventDefault(); if (qNo.classList.contains('turned')) go(8); });
  function dodge() {
    const sec = $('#s-question');
    const sr = sec.getBoundingClientRect();
    if (!qNo.classList.contains('free')) {
      const r = qNo.getBoundingClientRect();
      qNo.style.left = (r.left - sr.left) / SCALE + 'px';
      qNo.style.top = (r.top - sr.top) / SCALE + 'px';
      qNo.classList.add('free');
      sec.appendChild(qNo);
      void qNo.offsetWidth;
    }
    noTries++;
    buzz(15);
    if (noTries > NO_LABELS.length) {
      qNo.textContent = C.question.yes;
      qNo.classList.add('turned');
      return;
    }
    qNo.textContent = NO_LABELS[noTries - 1];
    const W = sr.width / SCALE, H = sr.height / SCALE, bw = qNo.offsetWidth + 20, bh = qNo.offsetHeight;
    // keep clear of the Yes button and the question text
    const box = (el, pad) => { const b = el.getBoundingClientRect(); return { x: (b.left - sr.left) / SCALE - pad, y: (b.top - sr.top) / SCALE - pad, w: b.width / SCALE + pad * 2, h: b.height / SCALE + pad * 2 }; };
    const avoid = [box($('#q-yes'), 18), box($('#q-text'), 6)];
    const hits = (x, y) => avoid.some((a) => x < a.x + a.w && x + bw > a.x && y < a.y + a.h && y + bh > a.y);
    let x = 0, yy = 0, n = 0;
    do {
      x = 16 + Math.random() * (W - bw - 32);
      yy = H * 0.08 + Math.random() * (H * 0.58 - bh);
      n++;
    } while (n < 60 && hits(x, yy));
    qNo.style.left = x + 'px';
    qNo.style.top = yy + 'px';
  }

  /* 9 · yes */
  S.final = {
    el: $('#s-final'),
    async enter(w) {
      ['#f-title', '#f-line', '#f-sub', '#f-actions'].forEach((s) => $(s).classList.remove('in'));
      $('#f-pola').classList.remove('in');
      $('#f-title').textContent = C.final.title;
      $('#f-line').textContent = C.final.line;
      $('#f-sub').textContent = C.final.sub;
      $('#f-img').src = C.final.photo;
      const wa = $('#f-wa'), num = String(C.final.whatsapp || '').replace(/\D/g, '');
      wa.hidden = !num;
      if (num) wa.href = `https://wa.me/${num}?text=${encodeURIComponent('YES 💖')}`;
      app.classList.add('night');
      Sky.start();
      Sky.scatter();
      $('#roof').classList.add('together', 'celebrate');
      Sound.finale(C.music.final);
      buzz([80, 60, 80, 60, 200, 100, 300]);
      const W = app.clientWidth, H = app.clientHeight;
      Confetti.burst(W * 0.15, H * 0.72, 70, { angle: -Math.PI / 2 + 0.35, spread: 0.9, speed: [9, 16], g: 0.2 });
      Confetti.burst(W * 0.85, H * 0.72, 70, { angle: -Math.PI / 2 - 0.35, spread: 0.9, speed: [9, 16], g: 0.2 });
      Confetti.rain(4000, 1);
      await w(700);
      $('#f-title').classList.add('in');
      await w(1000);
      $('#f-pola').classList.add('in');
      await w(1700);
      $('#f-line').classList.add('in');
      buzz([30, 60, 30]);
      await w(1400);
      $('#f-sub').classList.add('in');
      await w(1400);
      $('#f-actions').classList.add('in');
    },
  };
  $('#f-replay').addEventListener('click', () => go(2));

  /* ---------- build the static bits ---------- */
  $$('[data-name]').forEach((el) => (el.textContent = C.herName));
  $('#seal').innerHTML = Cat.paw('rgba(255,255,255,.9)');
  $('#note-cat').innerHTML = Cat.cat({ who: 'her', eyes: 'closed' });
  $('#pc-me').innerHTML = Cat.cat({ who: 'him', head: true });
  $('#pc-her').innerHTML = Cat.cat({ who: 'her', head: true });
  $('#voice-cats').innerHTML = `<div>${Cat.cat({ who: 'him', eyes: 'happy' })}</div><span class="vc-heart">♥</span><div>${Cat.cat({ who: 'her', eyes: 'happy' })}</div>`;
  $('#roof').innerHTML = Cat.roof();
  $('#g-cat').innerHTML = Cat.cat({ who: 'her', eyes: 'closed' });
  $('#next .disc').innerHTML = Cat.paw('#fff');
  $('.p-left').innerHTML = Cat.arm('#F4A259');
  $('.p-right').innerHTML = Cat.arm('#FFF3E4');
  const wave = $('#wave');
  for (let i = 0; i < 16; i++) {
    const b = make('i');
    b.style.setProperty('--i', i);
    b.style.setProperty('--h', (1.6 + Math.random() * 2.4).toFixed(2));
    wave.appendChild(b);
  }
  const amb = $('#ambient');
  for (let i = 0; i < 14; i++) {
    const s = make('span', 'amb', i % 3 === 0 ? Cat.paw('currentColor') : '♥');
    s.style.cssText = `--x:${(Math.random() * 100).toFixed(1)}%;--s:${(10 + Math.random() * 14).toFixed(0)}px;--d:${(16 + Math.random() * 14).toFixed(1)}s;--dl:-${(Math.random() * 30).toFixed(1)}s;--o:${(0.25 + Math.random() * 0.3).toFixed(2)};--r:${(Math.random() * 80 - 40).toFixed(0)}deg`;
    if (i % 4 === 1) s.style.color = 'var(--rose)';
    amb.appendChild(s);
  }

  Sky.init($('#sky'));
  Confetti.init($('#fx'));
  function onResize() { fitFrame(); Sky.resize(); Confetti.resize(); }
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => Sound.visibility(document.hidden));
  ['pointerup', 'touchend', 'click'].forEach((t) => document.addEventListener(t, () => Sound.prime(), { capture: true, passive: true }));
  fitFrame();
  onResize();

  go(clamp(parseInt(params.get('s'), 10) || 0, 0, ORDER.length - 1));
})();
