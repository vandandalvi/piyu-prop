/* Effects: springs, confetti, the night sky, music and sound. */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function fit(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = app.clientWidth, h = app.clientHeight;
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* ---------- Spring: damping ratio + response, so motion keeps the finger's speed ---------- */
  class Spring {
    constructor(x = 0) { this.x = x; this.v = 0; this.target = x; this.set(1, 0.4); }
    set(damping, response) {
      const w = (2 * Math.PI) / response;
      this.k = w * w;
      this.c = 2 * damping * w;
      return this;
    }
    step(dt) {
      const n = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        const f = -this.k * (this.x - this.target) - this.c * this.v;
        this.v += f * h;
        this.x += this.v * h;
      }
      return Math.abs(this.v) < 3 && Math.abs(this.x - this.target) < 0.5;
    }
  }

  /* ---------- Confetti: hearts, paws, sparkles ---------- */
  const COLORS = ['#E36F8C', '#F8B9C7', '#FFD6A5', '#FFFFFF', '#C24F6F', '#F4A259', '#FFC2D4'];
  function shape(ctx, kind, s) {
    ctx.beginPath();
    if (kind === 'heart') {
      ctx.moveTo(0, s * 0.45);
      ctx.bezierCurveTo(-s * 0.7, 0, -s * 0.5, -s * 0.6, 0, -s * 0.22);
      ctx.bezierCurveTo(s * 0.5, -s * 0.6, s * 0.7, 0, 0, s * 0.45);
      ctx.fill();
    } else if (kind === 'paw') {
      ctx.ellipse(0, s * 0.18, s * 0.3, s * 0.24, 0, 0, 6.29);
      ctx.fill();
      for (const [x, y, r] of [[-0.33, -0.12, 0.12], [-0.12, -0.34, 0.13], [0.12, -0.34, 0.13], [0.33, -0.12, 0.12]]) {
        ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0, 6.29); ctx.fill();
      }
    } else if (kind === 'sparkle') {
      const h = s * 0.55;
      ctx.moveTo(0, -h);
      ctx.quadraticCurveTo(0, 0, h, 0);
      ctx.quadraticCurveTo(0, 0, 0, h);
      ctx.quadraticCurveTo(0, 0, -h, 0);
      ctx.quadraticCurveTo(0, 0, 0, -h);
      ctx.fill();
    } else {
      ctx.arc(0, 0, s * 0.22, 0, 6.29);
      ctx.fill();
    }
  }

  const Confetti = {
    init(cv) { this.cv = cv; this.ps = []; this.on = false; this.resize(); },
    resize() { Object.assign(this, fit(this.cv)); },
    burst(x, y, n = 40, o = {}) {
      const ang = o.angle ?? -Math.PI / 2;
      const spread = o.spread ?? Math.PI * 2;
      const sp = o.speed || [3, 9];
      const sz = o.size || [8, 15];
      const kinds = o.shapes || ['heart', 'paw', 'sparkle', 'dot'];
      for (let i = 0; i < n; i++) {
        const a = ang + (Math.random() - 0.5) * spread;
        const s = rand(sp[0], sp[1]);
        this.ps.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          g: o.g ?? 0.14, drag: o.drag ?? 0.985,
          rot: rand(0, 6.28), vr: rand(-0.12, 0.12), s: rand(sz[0], sz[1]),
          kind: pick(kinds), color: pick(o.colors || COLORS),
          life: 0, ttl: rand(60, 110) * (o.ttl || 1), wob: rand(0, 6.28),
        });
      }
      this.run();
    },
    rain(ms = 3000, perFrame = 1) {
      const end = performance.now() + ms;
      const tick = () => {
        if (performance.now() > end) return;
        for (let i = 0; i < perFrame; i++) {
          this.ps.push({
            x: rand(0, this.w), y: -20, vx: rand(-0.8, 0.8), vy: rand(1, 2.6), g: 0.03, drag: 0.996,
            rot: rand(0, 6.28), vr: rand(-0.06, 0.06), s: rand(9, 16),
            kind: pick(['heart', 'heart', 'paw', 'sparkle']), color: pick(COLORS),
            life: 0, ttl: 420, wob: rand(0, 6.28),
          });
        }
        this.run();
        requestAnimationFrame(tick);
      };
      tick();
    },
    run() {
      if (this.on) return;
      this.on = true;
      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    },
    loop(t) {
      const dt = clamp((t - this.last) / 16.67, 0.2, 3);
      this.last = t;
      const { ctx } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      this.ps = this.ps.filter((p) => p.life < p.ttl && p.y < this.h + 40);
      for (const p of this.ps) {
        p.life += dt;
        p.vx *= Math.pow(p.drag, dt);
        p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
        p.x += (p.vx + Math.sin(p.wob + p.life * 0.08) * 0.35) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const fade = clamp((p.ttl - p.life) / (p.ttl * 0.3), 0, 1);
        const born = clamp(p.life / 6, 0, 1);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        shape(ctx, p.kind, p.s * (0.4 + 0.6 * born));
        ctx.restore();
      }
      if (this.ps.length) requestAnimationFrame((tt) => this.loop(tt));
      else { this.on = false; ctx.clearRect(0, 0, this.w, this.h); }
    },
  };

  /* ---------- Night sky: twinkling stars that gather into her name ---------- */
  function starSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,252,240,1)');
    g.addColorStop(0.22, 'rgba(255,240,215,.9)');
    g.addColorStop(0.55, 'rgba(255,200,215,.22)');
    g.addColorStop(1, 'rgba(255,200,215,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 32);
    return c;
  }

  const Sky = {
    init(cv) { this.cv = cv; this.on = false; this.parts = []; this.shoots = []; this.ft = 0; this.sprite = starSprite(); this.resize(); },
    resize() {
      Object.assign(this, fit(this.cv));
      this.makeStars();
      if (this.name) this.layoutName(this.name, true);
    },
    makeStars() {
      const n = Math.round((this.w * this.h) / 2300);
      this.stars = Array.from({ length: n }, () => ({
        x: Math.random() * this.w, y: Math.random() * this.h * 0.72,
        r: Math.pow(Math.random(), 2.2) * 2.2 + 0.6, a: rand(0.35, 0.95), sp: rand(0.6, 2.2), ph: rand(0, 6.28),
      }));
    },
    start() {
      if (this.on) return;
      this.on = true;
      this.nextShoot = performance.now() + 2500;
      requestAnimationFrame((t) => this.loop(t));
    },
    stop() { this.on = false; },
    reset() { this.name = null; this.parts = []; },
    async formName(name) {
      try { await document.fonts.load('700 100px Caveat'); } catch (e) { /* fall back to cursive */ }
      this.name = name;
      this.layoutName(name, false);
      this.ft = performance.now();
    },
    layoutName(name, snap) {
      const off = document.createElement('canvas');
      const W = Math.round(this.w), H = Math.round(Math.min(this.h * 0.3, 240));
      off.width = W; off.height = H;
      const c = off.getContext('2d');
      c.font = '700 100px Caveat, cursive';
      const m = c.measureText(name).width || 1;
      const fs = Math.min(140, (100 * W * 0.84) / m);
      c.font = `700 ${fs}px Caveat, cursive`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#fff';
      c.fillText(name, W / 2, H / 2);
      const data = c.getImageData(0, 0, W, H).data;
      const step = Math.max(3, Math.round(fs / 24));
      let pts = [];
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          if (data[(y * W + x) * 4 + 3] > 150) pts.push([x + rand(-0.8, 0.8), y + rand(-0.8, 0.8)]);
        }
      }
      if (pts.length > 760) pts = pts.sort(() => Math.random() - 0.5).slice(0, 760);
      const top = this.h * 0.215 - H / 2;
      const prev = this.parts;
      this.parts = pts.map(([x, y], i) => ({
        sx: snap && prev[i] ? prev[i].tx : rand(0, this.w),
        sy: snap && prev[i] ? prev[i].ty : rand(0, this.h * 0.7),
        tx: x, ty: y + top, d: rand(0, 900), sz: rand(5, 9), ph: rand(0, 6.28),
      }));
      if (snap) this.ft = -1e9;
    },
    scatter() {
      const now = performance.now();
      for (const p of this.parts) {
        const [x, y] = this.pos(p, now);
        p.sx = x; p.sy = y;
        p.tx = rand(0, this.w); p.ty = rand(0, this.h * 0.62);
        p.d = rand(0, 500); p.free = true;
      }
      this.ft = now;
    },
    pos(p, t) {
      const k = clamp((t - this.ft - p.d) / 2000, 0, 1);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const swirl = Math.sin(k * Math.PI) * 26;
      return [p.sx + (p.tx - p.sx) * e + Math.cos(p.ph) * swirl, p.sy + (p.ty - p.sy) * e + Math.sin(p.ph) * swirl];
    },
    loop(t) {
      const { ctx } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      if (!this.on) return;
      ctx.globalCompositeOperation = 'lighter';
      for (const s of this.stars) {
        ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * 0.001 * s.sp + s.ph));
        const d = s.r * 3.2;
        ctx.drawImage(this.sprite, s.x - d / 2, s.y - d / 2, d, d);
      }
      if (t > this.nextShoot) {
        this.nextShoot = t + rand(3500, 7500);
        this.shoots.push({ x: rand(this.w * 0.3, this.w * 1.1), y: rand(0, this.h * 0.3), vx: -rand(7, 10), vy: rand(2.5, 4), life: 0, ttl: rand(45, 70) });
      }
      this.shoots = this.shoots.filter((s) => s.life < s.ttl);
      for (const s of this.shoots) {
        s.life++; s.x += s.vx; s.y += s.vy;
        const a = Math.sin((s.life / s.ttl) * Math.PI);
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 10, s.y - s.vy * 10);
        g.addColorStop(0, `rgba(255,248,230,${a.toFixed(3)})`);
        g.addColorStop(1, 'rgba(255,248,230,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 10, s.y - s.vy * 10); ctx.stroke();
      }
      for (const p of this.parts) {
        const [x, y] = this.pos(p, t);
        const k = clamp((t - this.ft - p.d) / 2000, 0, 1);
        const tw = 0.7 + 0.3 * Math.sin(t * 0.004 + p.ph);
        ctx.globalAlpha = (p.free ? 0.45 + 0.35 * (1 - k) : 0.35 + 0.65 * k) * tw;
        const d = p.sz * (p.free ? 1 - 0.5 * k : 0.7 + 0.5 * k);
        ctx.drawImage(this.sprite, x - d / 2, y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame((tt) => this.loop(tt));
    },
  };

  /* ---------- Music box: plays softly when no song file has been added yet ---------- */
  class MusicBox {
    constructor(ctx, dest) {
      this.ctx = ctx;
      this.out = ctx.createGain();
      this.out.gain.value = 0;
      this.bus = ctx.createGain();
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
      const dl = ctx.createDelay(1); dl.delayTime.value = 0.37;
      const fb = ctx.createGain(); fb.gain.value = 0.32;
      const wet = ctx.createGain(); wet.gain.value = 0.3;
      this.bus.connect(lp); lp.connect(this.out); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(this.out);
      this.out.connect(dest);
      this.step = 0;
      this.bright = false;
    }
    start() { this.t = this.ctx.currentTime + 0.15; this.timer = setInterval(() => this.tick(), 90); this.level(1, 3000); }
    level(v, ms = 900) {
      const g = this.out.gain, now = this.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0.42 * v, now + ms / 1000);
    }
    tick() {
      const now = this.ctx.currentTime;
      if (this.t < now - 0.1) this.t = now + 0.05; // never pile up notes after a pause
      while (this.t < now + 0.35) {
        this.play(this.step, this.t);
        this.t += this.bright ? 0.3 : 0.42;
        this.step++;
      }
    }
    note(semi, t, vel) {
      const c = this.ctx, f = 261.63 * Math.pow(2, semi / 12);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vel, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      g.connect(this.bus);
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 2.7);
      const g2 = c.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(vel * 0.25, t + 0.005);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      g2.connect(this.bus);
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 4; o2.connect(g2); o2.start(t); o2.stop(t + 0.5);
    }
    play(step, t) {
      const CHORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]]; // C  Am  F  G
      const [a, b, c] = CHORDS[Math.floor(step / 8) % 4];
      const i = step % 8;
      let bass = a - 12;
      if (bass < -15) bass += 12;
      const pat = [bass, c, a + 12, b + 12, c + 12, b + 12, a + 12, c];
      let semi = pat[i];
      let vel = i === 0 ? 0.24 : i === 4 ? 0.15 : 0.11;
      if (this.bright && i % 2) { semi += 12; vel *= 1.1; }
      this.note(semi, t, vel);
      if ((i === 3 || i === 7) && Math.random() < 0.3) this.note(pick([0, 2, 4, 7, 9]) + 24, t + 0.21, 0.05);
    }
  }

  /* ---------- Sound: song files if present, music box if not ---------- */
  const Sound = {
    ctx: null, master: null, box: null, bg: null, clip: null, els: [], muted: false, started: false, cache: {},
    prime() {
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.muted ? 0 : 1;
          this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
      } catch (e) { /* no audio on this device */ }
    },
    exists(url) {
      if (!url) return Promise.resolve(false);
      if (this.cache[url] === undefined) {
        this.cache[url] = fetch(url, { method: 'HEAD', cache: 'no-store' })
          .then((r) => r.ok && !/text\/html/.test(r.headers.get('content-type') || ''))
          .catch(() => false);
      }
      return this.cache[url];
    },
    track(url) {
      const a = new Audio(url);
      a.preload = 'auto';
      a.muted = this.muted;
      this.els.push(a);
      return a;
    },
    fade(a, to, ms) {
      cancelAnimationFrame(a._f);
      const from = a.volume, t0 = performance.now();
      const stepFn = (t) => {
        const k = clamp((t - t0) / ms, 0, 1);
        a.volume = clamp(from + (to - from) * k, 0, 1);
        if (k < 1) a._f = requestAnimationFrame(stepFn);
        else if (to === 0 && a._stopAtZero) a.pause();
      };
      a._f = requestAnimationFrame(stepFn);
    },
    async startBg(url) {
      if (this.started) return;
      this.started = true;
      this.prime();
      if (await this.exists(url)) {
        const a = this.track(url);
        a.loop = true;
        a.volume = 0;
        try { await a.play(); this.bg = a; this.fade(a, 0.8, 3000); return; } catch (e) { /* fall through */ }
      }
      this.startBox();
    },
    startBox() {
      if (this.box || !this.ctx) return;
      this.box = new MusicBox(this.ctx, this.master);
      this.box.start();
    },
    duck(level, ms = 900) {
      if (this.bg) this.fade(this.bg, 0.8 * level, ms);
      if (this.box) this.box.level(level, ms);
    },
    async playClip(url) {
      if (!(await this.exists(url))) return false;
      return new Promise((res) => {
        const a = this.track(url);
        a._res = res;
        this.clip = a;
        a.onended = () => res(true);
        a.onerror = () => res(false);
        a.play().catch(() => res(false));
      });
    },
    stopClip() {
      if (!this.clip) return;
      this.clip.pause();
      if (this.clip._res) this.clip._res(false);
      this.clip = null;
    },
    async finale(url) {
      if (await this.exists(url)) {
        if (this.bg) { this.bg._stopAtZero = true; this.fade(this.bg, 0, 1600); }
        if (this.box) this.box.level(0, 1600);
        const a = this.track(url);
        a.loop = true;
        a.volume = 0;
        try { await a.play(); this.fade(a, 0.9, 2200); } catch (e) { /* ignore */ }
        return;
      }
      if (this.bg) { this.fade(this.bg, 0.95, 1500); return; }
      this.prime();
      this.startBox();
      if (this.box) { this.box.bright = true; this.box.level(1.25, 1500); }
    },
    setMuted(m) {
      this.muted = m;
      this.els.forEach((a) => (a.muted = m));
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    },
    visibility(hidden) {
      if (hidden) {
        if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
        this.els.forEach((a) => { if (!a.paused) { a._wasPlaying = true; a.pause(); } });
      } else {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        this.els.forEach((a) => { if (a._wasPlaying) { a._wasPlaying = false; a.play().catch(() => {}); } });
      }
    },
  };

  window.Spring = Spring;
  window.Confetti = Confetti;
  window.Sky = Sky;
  window.Sound = Sound;
})();
