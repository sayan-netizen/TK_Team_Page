(function(){
  'use strict';

  /* ══════════════════════════════════════════
     UTILITIES & DETECTIONS
  ══════════════════════════════════════════ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));

  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Global Pointer State */
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0 };
  let lastPx = pointer.x, lastPy = pointer.y;

  window.addEventListener('mousemove', (e) => {
    pointer.vx = e.clientX - pointer.x;
    pointer.vy = e.clientY - pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });

  /* ══════════════════════════════════════════
     1. CUSTOM SHURIKEN CURSOR & TRAIL
  ══════════════════════════════════════════ */
  const cursor = $('#cursor');
  const trail = $('#cursor-trail');
  let cx = pointer.x, cy = pointer.y;
  let tx = pointer.x, ty = pointer.y;
  let rot = 0;

  function tickCursor() {
    if (FINE_POINTER) {
      // Eased follow
      const ease = REDUCE_MOTION ? 1 : 0.22;
      cx = lerp(cx, pointer.x, ease);
      cy = lerp(cy, pointer.y, ease);
      
      // Eased trail dot
      tx = lerp(tx, pointer.x, 0.35);
      ty = lerp(ty, pointer.y, 0.35);

      // Shuriken rotation matches velocity
      const velocity = Math.sqrt(pointer.vx * pointer.vx + pointer.vy * pointer.vy);
      rot += REDUCE_MOTION ? 0 : clamp(velocity * 0.85 + 2, 2, 16);

      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%) rotate(${rot}deg)`;
      
      if (trail) {
        trail.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
        trail.style.opacity = clamp(velocity / 15, 0.1, 0.85).toString();
      }
    }
    requestAnimationFrame(tickCursor);
  }
  tickCursor();

  /* ══════════════════════════════════════════
     2. CANVAS STRIKE / SLASH CLICK SYSTEM
  ══════════════════════════════════════════ */
  const strikeCanvas = $('#strike-canvas');
  const sCtx = strikeCanvas.getContext('2d');
  let sw, sh;
  function resizeStrikeCanvas() {
    sw = strikeCanvas.width = window.innerWidth;
    sh = strikeCanvas.height = window.innerHeight;
  }
  resizeStrikeCanvas();
  window.addEventListener('resize', resizeStrikeCanvas);

  const strikes = [];
  const sparks = [];

  function spawnSlash(x, y) {
    // 1. Spawning DOM-based slash marks (CSS animated gradients)
    const slashes = 2 + randInt(0, 1);
    for(let i = 0; i < slashes; i++) {
      const el = document.createElement('div');
      el.className = (i === 0) ? 'slash-mark' : 'slash-mark-2';
      const len = 120 + rand(0, 100);
      const angle = (i === 0) ? rand(-40, -10) : rand(10, 45);
      
      el.style.width = len + 'px';
      el.style.left = (x - len / 2 + rand(-15, 15)) + 'px';
      el.style.top = (y + rand(-5, 5)) + 'px';
      el.style.transform = `rotate(${angle}deg)`;
      
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 450);
    }

    // 2. Add an arc-strike circle expander on overlay canvas
    strikes.push({
      x, y,
      r: 4,
      maxR: rand(50, 90),
      life: 1.0,
      hue: Math.random() < 0.6 ? '197,57,75' : '40,35,35'
    });

    // 3. Add explosive spark particles
    const count = REDUCE_MOTION ? 0 : 15 + randInt(0, 8);
    for(let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(2, 6.5);
      sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: rand(0.02, 0.045),
        size: rand(0.8, 2.5),
        hue: Math.random() < 0.6 ? '197,57,75' : '255,122,0' // Crimson or Flame Orange
      });
    }

    // 4. Subtle screen flash
    const flash = document.createElement('div');
    flash.style.cssText = `
      position:fixed;inset:0;pointer-events:none;z-index:9990;
      background:radial-gradient(circle ${rand(70,120)}px at ${x}px ${y}px, rgba(255,122,0,0.15), transparent);
      animation:slash-fade 0.3s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
  }

  function drawStrikes() {
    sCtx.clearRect(0, 0, sw, sh);

    // Render expanding circular rings
    for(let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i];
      s.r = lerp(s.r, s.maxR, 0.15);
      s.life -= 0.05;
      if (s.life <= 0) {
        strikes.splice(i, 1);
        continue;
      }
      sCtx.beginPath();
      sCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      sCtx.strokeStyle = `rgba(${s.hue}, ${s.life * 0.55})`;
      sCtx.lineWidth = 2 * s.life;
      sCtx.stroke();
    }

    // Render spark particles with drift & gravity
    for(let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.93; // Drag
      p.vy *= 0.93;
      p.vy += 0.12; // Gravity pull
      p.life -= p.decay;
      if (p.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      sCtx.beginPath();
      sCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      sCtx.fillStyle = `rgba(${p.hue}, ${p.life})`;
      sCtx.fill();
    }

    requestAnimationFrame(drawStrikes);
  }
  drawStrikes();

  window.addEventListener('mousedown', (e) => {
    cursor.classList.add('click');
    setTimeout(() => cursor.classList.remove('click'), 400);
    spawnSlash(e.clientX, e.clientY);
  });

  /* ══════════════════════════════════════════
     3. BACKGROUND CANVAS — Fire Embers System
  ══════════════════════════════════════════ */
  const bgCanvas = $('#bg-canvas');
  const bCtx = bgCanvas.getContext('2d');
  let bw, bh;
  function resizeBgCanvas() {
    bw = bgCanvas.width = window.innerWidth;
    bh = bgCanvas.height = window.innerHeight;
  }
  resizeBgCanvas();
  window.addEventListener('resize', resizeBgCanvas);

  const EMBER_COUNT = REDUCE_MOTION ? 0 : 70;
  const bgEmbers = [];

  function makeBgEmber(initial) {
    return {
      x: Math.random() * bw,
      y: initial ? Math.random() * bh : bh + 15,
      r: rand(0.5, 2.0),
      vy: -rand(0.2, 0.6),
      vx: rand(-0.15, 0.15),
      flicker: Math.random() * Math.PI * 2,
      flickerSpeed: rand(0.04, 0.08),
      hue: Math.random() < 0.75 ? '196,57,75' : '255,122,0' // Crimson or Flame Orange
    };
  }

  for(let i = 0; i < EMBER_COUNT; i++) {
    bgEmbers.push(makeBgEmber(true));
  }

  // Large ambient floating fire orbs
  const fireOrbs = REDUCE_MOTION ? [] : Array.from({ length: 5 }, (_, i) => ({
    x: Math.random() * bw,
    y: Math.random() * bh,
    vy: -rand(0.05, 0.12),
    vx: rand(-0.05, 0.05),
    phase: Math.random() * Math.PI * 2,
    r: rand(50, 110),
    hue: i % 2 === 0 ? '156,43,58' : '204,102,0'
  }));

  function drawBgCanvas() {
    bCtx.clearRect(0, 0, bw, bh);

    // 1. Draw large background fire orbs
    fireOrbs.forEach(orb => {
      orb.phase += 0.007;
      orb.x += orb.vx + Math.sin(orb.phase) * 0.25;
      orb.y += orb.vy;

      if (orb.y + orb.r < 0) {
        orb.y = bh + orb.r;
        orb.x = Math.random() * bw;
      }

      bCtx.beginPath();
      bCtx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
      bCtx.fillStyle = `rgba(${orb.hue}, 0.05)`; /* Flat transparent circle instead of gradient */
      bCtx.fill();
    });

    // 2. Draw small floating embers + Mouse repulsion/dodging
    bgEmbers.forEach(p => {
      p.flicker += p.flickerSpeed;
      p.y += p.vy;
      p.x += p.vx;

      // Mouse dodging repulsion logic
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 110 && dist > 0.1) {
        const force = (110 - dist) / 110;
        // Shift away from mouse
        p.x += (dx / dist) * force * 3.5;
        p.y += (dy / dist) * force * 3.5;
      }

      // Reset when off screen
      if (p.y < -10 || p.x < -20 || p.x > bw + 20) {
        Object.assign(p, makeBgEmber(false));
      }

      const alpha = 0.35 + Math.sin(p.flicker) * 0.25;
      bCtx.beginPath();
      bCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bCtx.fillStyle = `rgba(${p.hue}, ${Math.max(0, alpha)})`;
      bCtx.fill();
    });

    requestAnimationFrame(drawBgCanvas);
  }
  drawBgCanvas();

  /* ══════════════════════════════════════════
     4. DOM EMBER LAYER (HTML spawn)
  ══════════════════════════════════════════ */
  const embersLayer = $('#embers-layer');
  const DOM_EMBER_COUNT = REDUCE_MOTION ? 0 : 25;

  function spawnDomEmber() {
    const el = document.createElement('div');
    el.className = 'ember-particle';
    const size = rand(3, 9);
    const duration = rand(7, 15);
    const delay = rand(0, duration);
    const drift = rand(-70, 70);
    const colors = [
      '#d54536', // Vermilion
      '#3c563e', // Forest Green
      '#2c2a26', // Charcoal
      '#e65c00'  // Orange
    ];
    const color = colors[randInt(0, colors.length - 1)];

    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${rand(0, 100)}vw;
      bottom: ${rand(-5, 5)}vh;
      background: ${color};
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
      --drift: ${drift}px;
      opacity: 0.85;
    `;
    
    embersLayer.appendChild(el);
  }

  for(let i = 0; i < DOM_EMBER_COUNT; i++) spawnDomEmber();

  // Periodically replace dead ones
  setInterval(() => {
    if (!REDUCE_MOTION && embersLayer.children.length < DOM_EMBER_COUNT) {
      spawnDomEmber();
    }
  }, 1000);

  /* ══════════════════════════════════════════
     5. ANTI-GRAVITY FLOAT & PARALLAX
  ══════════════════════════════════════════ */
  const memberCards = $$('.member-card');
  const floatStates = memberCards.map((el, i) => {
    const seed = parseInt(el.dataset.floatSeed || i, 10);
    return {
      el,
      // Unique organic frequencies & amplitudes
      freqY: 0.00075 + (seed % 6) * 0.0001,
      freqX: 0.00045 + (seed % 4) * 0.00008,
      ampY: 7 + (seed % 4) * 2.8,
      ampX: 2.8 + (seed % 3) * 1.8,
      phaseY: (seed * 1.25) % (Math.PI * 2),
      phaseX: (seed * 2.2) % (Math.PI * 2),
      rotAmp: 1.1 + (seed % 3) * 0.35,
      rotFreq: 0.00055 + (seed % 4) * 0.00009,
      
      // Mouse Parallax targets
      parallaxX: 0,
      parallaxY: 0,
      
      // Interpolated actual coordinates
      curX: 0,
      curY: 0,
      curRot: 0
    };
  });

  function tickFloat(t) {
    if (!REDUCE_MOTION) {
      const normMx = (pointer.x / window.innerWidth - 0.5);
      const normMy = (pointer.y / window.innerHeight - 0.5);

      floatStates.forEach(s => {
        // Floating sine/cos displacement
        const fY = Math.sin(t * s.freqY + s.phaseY) * s.ampY;
        const fX = Math.cos(t * s.freqX + s.phaseX) * s.ampX;
        const fRot = Math.sin(t * s.rotFreq + s.phaseX) * s.rotAmp;

        // Parallax drift based on cursor offsets
        const targetPX = normMx * -15;
        const targetPY = normMy * -10;
        s.parallaxX = lerp(s.parallaxX, targetPX, 0.03);
        s.parallaxY = lerp(s.parallaxY, targetPY, 0.03);

        // Smooth interpolation
        s.curX = lerp(s.curX, fX + s.parallaxX, 0.05);
        s.curY = lerp(s.curY, fY + s.parallaxY, 0.05);
        s.curRot = lerp(s.curRot, fRot, 0.05);

        s.el.style.transform = `translateX(${s.curX}px) translateY(${s.curY}px) rotate(${s.curRot}deg)`;
      });
    }
    requestAnimationFrame(tickFloat);
  }
  requestAnimationFrame(tickFloat);

  /* ══════════════════════════════════════════
     6. INTERACTIVE FIRE ACCENT PROXIMITY REACTOR
  ══════════════════════════════════════════ */
  const fireAccents = $$('.fire-accent');

  function tickFireReactor() {
    fireAccents.forEach(f => {
      const rect = f.getBoundingClientRect();
      const fx = rect.left + rect.width / 2;
      const fy = rect.top + rect.height / 2;
      
      const dx = pointer.x - fx;
      const dy = pointer.y - fy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const proximity = clamp(1 - dist / 180, 0, 1);
      
      // Proximity scales/brightens the fire accent elements
      const scaleBoost = 1 + proximity * 1.6;
      const brightnessBoost = 1 + proximity * 0.7;
      f.style.transform = `scaleY(${scaleBoost}) scaleX(${1 + proximity * 0.25})`;
      f.style.filter = `brightness(${brightnessBoost}) blur(${proximity * 0.8}px)`;
      f.style.opacity = (0.5 + proximity * 0.45).toString();
    });

    requestAnimationFrame(tickFireReactor);
  }
  tickFireReactor();

  /* ══════════════════════════════════════════
     7. FOG PARALLAX
  ══════════════════════════════════════════ */
  const fogs = $$('.fog');
  let fogFx = 0, fogFy = 0;

  function tickFog() {
    if (!REDUCE_MOTION) {
      const targetFx = (pointer.x / window.innerWidth - 0.5);
      const targetFy = (pointer.y / window.innerHeight - 0.5);
      fogFx = lerp(fogFx, targetFx, 0.035);
      fogFy = lerp(fogFy, targetFy, 0.035);

      fogs.forEach((f, i) => {
        const depth = (i + 1) * 15;
        f.style.transform = `translate(${fogFx * depth}px, ${fogFy * depth}px)`;
      });
    }
    requestAnimationFrame(tickFog);
  }
  tickFog();

  /* ══════════════════════════════════════════
     7b. GOOEY BACKGROUND GRADIENT MOVEMENT
  ══════════════════════════════════════════ */
  const blob1 = $('.blob-1');
  const blob2 = $('.blob-2');
  const blob3 = $('.blob-3');
  
  let bx1 = 0, by1 = 0;
  let bx2 = 0, by2 = 0;
  let bx3 = 0, by3 = 0;

  function tickGooeyBg() {
    if (!REDUCE_MOTION && blob1 && blob2 && blob3) {
      // Blob 1 follows cursor quickly
      bx1 = lerp(bx1, pointer.x - 125, 0.08);
      by1 = lerp(by1, pointer.y - 125, 0.08);
      blob1.style.transform = `translate3d(${bx1}px, ${by1}px, 0)`;

      // Blob 2 follows with more lag
      bx2 = lerp(bx2, pointer.x - 150, 0.04);
      by2 = lerp(by2, pointer.y - 150, 0.04);
      blob2.style.transform = `translate3d(${bx2}px, ${by2}px, 0)`;

      // Blob 3 drifts slower and has a smooth circular offset
      const time = Date.now() * 0.0015;
      const offsetX = Math.sin(time) * 60;
      const offsetY = Math.cos(time) * 60;
      bx3 = lerp(bx3, pointer.x - 120 + offsetX, 0.025);
      by3 = lerp(by3, pointer.y - 120 + offsetY, 0.025);
      blob3.style.transform = `translate3d(${bx3}px, ${by3}px, 0)`;
    }
    requestAnimationFrame(tickGooeyBg);
  }
  requestAnimationFrame(tickGooeyBg);

  /* ══════════════════════════════════════════
     8. SECTION SCROLL PARALLAX (Header Labels Only)
  ══════════════════════════════════════════ */
  const chamberSections = $$('.chamber-section');

  window.addEventListener('scroll', () => {
    if (REDUCE_MOTION) return;
    chamberSections.forEach((sec, i) => {
      const label = sec.querySelector('.section-label');
      if (!label) return;
      
      const rect = sec.getBoundingClientRect();
      const viewH = window.innerHeight;
      const centerY = rect.top + rect.height / 2;
      const offset = (centerY - viewH / 2) / viewH;
      
      const depths = [0.035, 0.02, 0.05, 0.03, 0.045];
      const shift = offset * depths[i % depths.length] * viewH;
      label.style.transform = `translateY(${shift.toFixed(2)}px)`;
    });
  }, { passive: true });

  /* ══════════════════════════════════════════
     9. SCROLL REVEAL (IntersectionObserver)
  ══════════════════════════════════════════ */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        
        // Stagger child member pagoda cards entry
        const cards = $$('.member-card', en.target);
        cards.forEach((card, i) => {
          card.style.transitionDelay = `${i * 0.12}s`;
          card.style.opacity = '0';
          card.style.transform = 'translateY(35px) scale(0.96)';
          
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              card.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
              card.style.opacity = '1';
              card.style.transform = 'translateY(0) scale(1)';
            });
          });
        });
      }
    });
  }, { threshold: 0.1 });

  $$('.reveal').forEach(el => revealObserver.observe(el));

  /* ══════════════════════════════════════════
     10. TEMPLE HOVER SHURIKEN BURST
  ══════════════════════════════════════════ */
  memberCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      if (!REDUCE_MOTION) {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        
        // Minor upward splash on hover entry
        for(let i = 0; i < 6; i++) {
          const angle = Math.PI + rand(-Math.PI / 4, Math.PI / 4); // upwards
          const speed = rand(1, 3);
          sparks.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.65,
            decay: rand(0.02, 0.04),
            size: rand(0.8, 1.8),
            hue: '255,122,0'
          });
        }
      }
    });
  });

  /* ══════════════════════════════════════════
     11. FALLBACK CURSOR DISABLE FOR TOUCH DEVICES
  ══════════════════════════════════════════ */
  if (!FINE_POINTER) {
    if (cursor) cursor.style.display = 'none';
    if (trail)  trail.style.display  = 'none';
  }

  /* ══════════════════════════════════════════
     12. CTA HOVER EXPLOSION
  ══════════════════════════════════════════ */
  const beginBtn = $('.begin-btn');
  if (beginBtn) {
    beginBtn.addEventListener('click', (e) => {
      spawnSlash(e.clientX, e.clientY);
    });
  }

})();
