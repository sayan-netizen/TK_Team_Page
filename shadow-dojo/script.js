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

  const REDUCE_MOTION = false; // Force all fire embers and animations active
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Global Pointer State */
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0 };

  window.addEventListener('mousemove', (e) => {
    pointer.vx = e.clientX - pointer.x;
    pointer.vy = e.clientY - pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });

  /* ══════════════════════════════════════════
     TEAM DATA — Dept definitions + member lists
  ══════════════════════════════════════════ */
  const DEPTS = [
    {
      name: 'Social Media',
      kana: '第一の間 — I',
      title: 'Social<br><span>Media</span>',
      desc: 'Elite content creators weaving shadows into digital signals. Masters of narrative and reach.',
      members: [
        { symbol: '伝', name: 'Kaze Whisperer', role: 'Lead Strategist', seed: 0 },
        { symbol: '影', name: 'Shadow Scribe',  role: 'Content Specialist', seed: 1 },
        { symbol: '響', name: 'Echo Phantom',   role: 'Community Ranger', seed: 2 }
      ]
    },
    {
      name: 'Public Relations',
      kana: '第二の間 — II',
      title: 'Public<br><span>Relations</span>',
      desc: 'Voices that carry across the void. Ambassadors of the shadow realm\'s story.',
      members: [
        { symbol: '声', name: 'Hana Commander',  role: 'PR Director',    seed: 3 },
        { symbol: '書', name: 'Scroll Messenger', role: 'Liaison Agent',  seed: 4 }
      ]
    },
    {
      name: 'Web Dev',
      kana: '第三の間 — III',
      title: 'Web<br><span>Dev</span>',
      desc: 'Architects of the digital fortress. Code forged in the fire of the dojo.',
      members: [
        { symbol: '築', name: 'Kai Genki',  role: 'Lead Architect',    seed: 5 },
        { symbol: '術', name: 'Ashi Zora',  role: 'Frontend Shinobi',  seed: 6 },
        { symbol: '霊', name: 'Yoru Bane',  role: 'Database Phantom',  seed: 7 }
      ]
    },
    {
      name: 'Video Editing',
      kana: '第四の間 — IV',
      title: 'Video<br><span>Editing</span>',
      desc: 'Frame cutters who sculpt time. Phantom editors hiding in every cut.',
      members: [
        { symbol: '斬', name: 'Void Kira',  role: 'Frame Cutter', seed: 8 },
        { symbol: '幻', name: 'Shiro Haze', role: 'VFX Shadow',   seed: 9 }
      ]
    },
    {
      name: 'Graphics Chamber',
      kana: '第五の間 — V',
      title: 'Graphics<br><span>Chamber</span>',
      desc: 'Ink and pixel, bound by fire. Artists whose work becomes war paint.',
      members: [
        { symbol: '墨', name: 'Ink Kuro',  role: 'Brush Master',    seed: 10 },
        { symbol: '画', name: 'Fuji Nori', role: 'Pixel Assassin',  seed: 11 }
      ]
    }
  ];

  /* ══════════════════════════════════════════
     0A. VERTICAL PAGE NAVIGATION CONTROLLER
     — Pages: 0 = Hero, 1 = Team Stage, 2 = CTA
  ══════════════════════════════════════════ */
  const pageCarousel = $('#page-carousel');
  const pageHero     = $('#page-hero');
  const teamStage    = $('#team-stage');
  const pageCta      = $('#page-cta');
  const dots         = $$('.slide-dot');
  const counterEl    = $('#counter-current');
  const flashEl      = $('#slide-flash');
  const tsNavLayer   = $('#ts-nav-layer');

  let currentPage = 0;         // 0 = hero, 1 = team, 2 = cta
  let pageAnimating = false;
  const PAGE_LOCK_MS = 850;

  // Transition duration must match CSS (0.7s)
  pageCarousel.style.transition = REDUCE_MOTION
    ? 'none'
    : 'transform 0.78s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  function goToPage(index, skipFlash) {
    if (index < 0 || index > 2) return;
    if (pageAnimating) return;
    pageAnimating = true;

    currentPage = index;

    // TV cut flash
    if (!skipFlash && flashEl && !REDUCE_MOTION) {
      flashEl.classList.add('flash-in');
      setTimeout(() => flashEl.classList.remove('flash-in'), 150);
    }

    pageCarousel.style.transform = `translateX(${-index * 100}vw)`;

    // Hero fade & Nav Layer visibility
    if (index === 0) {
      pageHero.classList.remove('page-leaving');
      teamStage.classList.remove('stage-visible');
      if (tsNavLayer) tsNavLayer.classList.remove('nav-visible');
    } else {
      pageHero.classList.add('page-leaving');
      teamStage.classList.add('stage-visible');
      if (tsNavLayer) tsNavLayer.classList.add('nav-visible');
    }

    updateDots();
    updateCounter();

    setTimeout(() => { pageAnimating = false; }, PAGE_LOCK_MS);
  }

  function updateDots() {
    dots.forEach((d, i) => {
      if (currentPage === 0 && i === 0) {
        d.classList.add('active');
      } else if (currentPage === 1) {
        d.classList.toggle('active', i === currentTeam + 1); // dots 1–5 map to teams
      } else if (currentPage === 2 && i === dots.length - 1) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });
  }

  function updateCounter() {
    if (!counterEl) return;
    // Counter: page 0 → 01, team stage → team index + 2, cta → 07
    let n;
    if (currentPage === 0) n = 1;
    else if (currentPage === 1) n = currentTeam + 2;
    else n = 7;
    counterEl.textContent = String(n).padStart(2, '0');
  }

  /* ══════════════════════════════════════════
     0B. HORIZONTAL TEAM CAROUSEL CONTROLLER
  ══════════════════════════════════════════ */
  /* ══════════════════════════════════════════
     0B. HORIZONTAL TEAM NAV CONTROLLER
  ══════════════════════════════════════════ */
  const tsNavTrack    = $('#ts-nav-track');
  const navCards      = $$('.nav-team-card');
  const tsContentLayer = $('#ts-content-layer');
  const tsKana        = $('#ts-kana');
  const tsTitle       = $('#ts-title');
  const tsDesc        = $('#ts-desc');
  const tsActiveMembers = $('#ts-active-members');

  const TOTAL_DEPTS = DEPTS.length;
  let currentTeam = 0;
  let teamAnimating = false;
  const TEAM_LOCK_MS = 700;

  // Spring physics for smooth track animation
  let trackTargetX = 0;
  let trackCurrentX = 0;
  let trackVelocity = 0;

  function getNavCardWidth() {
    if (!navCards[0]) return 220;
    return navCards[0].getBoundingClientRect().width;
  }

  function getGapPx() {
    const gap = parseFloat(getComputedStyle(tsNavTrack).gap) || 0;
    return gap;
  }

  function computeTrackOffset(index) {
    const cw = getNavCardWidth();
    const gap = getGapPx();
    // Offset so the active card is perfectly centered.
    return -(cw / 2) - (index * (cw + gap));
  }

  function applyNavCardClasses() {
    navCards.forEach((card, i) => {
      card.classList.toggle('ntc-active', i === currentTeam);
    });
  }

  /* Build member card HTML */
  function buildMemberCard(member, delay, index, total) {
    const isCenter = (total % 2 !== 0 && index === Math.floor(total / 2)) || (total === 1 && index === 0);
    const sizeMod = isCenter ? 'portrait-large' : 'portrait-regular';
    
    return `
      <div class="member-card mp-card-entry" data-float-seed="${member.seed}" style="animation-delay:${delay}s">

        <div class="torii-frame">
          <div class="portrait-symbol-container">
            <img class="member-portrait-img" src="images/cat-portrait.webp" alt="${member.name}">
          </div>
          <img class="torii-image" src="images/Placeholder.webp" alt="Torii Gate Frame">
        </div>
        <div class="clean-member-info">
          <h4>${member.name}</h4>
          <p>${member.role}</p>
        </div>
      </div>`;
  }

  /* Update main content area with smooth card swap */
  function updateMainContent(deptIndex) {
    const dept = DEPTS[deptIndex];
    if (!dept) return;

    // Swap text content
    if (tsKana) tsKana.textContent = dept.kana;
    if (tsTitle) tsTitle.innerHTML = dept.title;
    if (tsDesc) tsDesc.textContent = dept.desc;

    // Swap member cards
    if (tsActiveMembers) {
      tsActiveMembers.innerHTML = dept.members
        .map((m, i) => buildMemberCard(m, i * 0.08, i, dept.members.length))
        .join('');
    }

    // Re-attach hover sparks and float states for newly injected cards
    attachFloatToNewCards();
  }

  /* Navigate to a team department */
  function goToTeam(index, fromClick) {
    if (index < 0 || index >= TOTAL_DEPTS) return;
    if (teamAnimating && !fromClick) return;

    if (currentPage !== 1) {
      goToPage(1);
    }

    teamAnimating = true;
    currentTeam = index;

    trackTargetX = computeTrackOffset(index);

    applyNavCardClasses();
    updateDots();
    updateCounter();
    updateMainContent(index);

    setTimeout(() => { teamAnimating = false; }, TEAM_LOCK_MS);
  }

  // Click handler for navigation cards
  navCards.forEach((card, idx) => {
    card.addEventListener('click', () => goToTeam(idx, true));
  });

  /* Spring animation loop for team track */
  function tickTeamTrack() {
    if (!REDUCE_MOTION) {
      const stiffness = 0.11;
      const damping   = 0.72;
      const force = (trackTargetX - trackCurrentX) * stiffness;
      trackVelocity = trackVelocity * damping + force;
      trackCurrentX += trackVelocity;

      if (Math.abs(trackVelocity) > 0.01 || Math.abs(trackTargetX - trackCurrentX) > 0.01) {
        tsNavTrack.style.transform = `translateX(${trackCurrentX}px)`;
      }
    } else {
      // Instant jump if reduced motion
      if (trackCurrentX !== trackTargetX) {
        trackCurrentX = trackTargetX;
        tsNavTrack.style.transform = `translateX(${trackCurrentX}px)`;
      }
    }
    requestAnimationFrame(tickTeamTrack);
  }
  requestAnimationFrame(tickTeamTrack);

  /* ══════════════════════════════════════════
     NAVIGATION INPUT HANDLERS
  ══════════════════════════════════════════ */

  // ── Wheel / Trackpad ──
  let wheelAccum = 0;
  let wheelResetTimer;

  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (pageAnimating || teamAnimating) return;

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    wheelAccum += delta;

    clearTimeout(wheelResetTimer);
    wheelResetTimer = setTimeout(() => { wheelAccum = 0; }, 300);

    if (Math.abs(wheelAccum) < 55) return;

    const dir = wheelAccum > 0 ? 1 : -1;
    wheelAccum = 0;

    if (currentPage === 0) {
      // Hero → scroll down enters team stage
      if (dir > 0) goToPage(1);
    } else if (currentPage === 1) {
      // Team stage: horizontal team navigation
      const nextTeam = currentTeam + dir;
      if (nextTeam >= 0 && nextTeam < TOTAL_DEPTS) {
        goToTeam(nextTeam);
      } else if (nextTeam < 0) {
        // Scrolled before first team → back to hero
        goToPage(0);
      } else {
        // Scrolled past last team → go to CTA
        goToPage(2);
      }
    } else if (currentPage === 2) {
      // CTA → scroll up returns to team stage
      if (dir < 0) goToPage(1);
    }
  }, { passive: false });

  // ── Keyboard ──
  window.addEventListener('keydown', (e) => {
    if (pageAnimating || teamAnimating) return;

    if (currentPage === 0) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ArrowRight') {
        e.preventDefault(); goToPage(1);
      }
    } else if (currentPage === 1) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentTeam < TOTAL_DEPTS - 1) goToTeam(currentTeam + 1);
        else goToPage(2);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentTeam > 0) goToTeam(currentTeam - 1);
        else goToPage(0);
      } else if (e.key === 'Home') {
        e.preventDefault(); goToTeam(0);
      } else if (e.key === 'End') {
        e.preventDefault(); goToTeam(TOTAL_DEPTS - 1);
      }
    } else if (currentPage === 2) {
      if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') {
        e.preventDefault(); goToPage(1);
      }
    }
  });

  // ── Touch swipe ──
  let touchStartX = 0, touchStartY = 0;

  window.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (pageAnimating || teamAnimating) return;

    const dx = touchStartX - e.changedTouches[0].clientX;
    const dy = touchStartY - e.changedTouches[0].clientY;

    if (currentPage === 0) {
      if (dx < -50) goToPage(1); // swipe left → team stage
    } else if (currentPage === 1) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
        if (dx > 0) {
          if (currentTeam < TOTAL_DEPTS - 1) goToTeam(currentTeam + 1);
          else goToPage(2);
        } else {
          if (currentTeam > 0) goToTeam(currentTeam - 1);
          else goToPage(0);
        }
      } else if (dx > 50 && currentTeam === 0) {
        goToPage(0); // swipe right from first team → hero
      }
    } else if (currentPage === 2) {
      if (dx > 50) goToPage(1); // swipe right → team stage
    }
  }, { passive: true });




  /* Recalculate track on resize */
  window.addEventListener('resize', () => {
    trackTargetX  = computeTrackOffset(currentTeam);
    trackCurrentX = trackTargetX;
    trackVelocity = 0;
    tsNavTrack.style.transform = `translateX(${trackCurrentX}px)`;
  });


  /* ══════════════════════════════════════════
     1. CUSTOM SHURIKEN CURSOR & TRAIL
  /* ══════════════════════════════════════════
     NEW: UNIFIED FX SYSTEM (Cursor + Fire Embers + Slashes)
  ══════════════════════════════════════════ */
  const ninjaCursor = $('#ninja-cursor');
  const fxCanvas = $('#fx-canvas');
  const fx = fxCanvas ? fxCanvas.getContext('2d') : null;

  let fW = 0, fH = 0;
  function resizeFx() {
    if(!fxCanvas) return;
    fW = fxCanvas.width = window.innerWidth;
    fH = fxCanvas.height = window.innerHeight;
  }
  if(fxCanvas) {
    resizeFx();
    window.addEventListener('resize', resizeFx);
  }

  // Cursor state
  let cx = pointer.x, cy = pointer.y;
  let crot = 0;

  // Particle arrays
  const embers = [];
  const slashes = [];
  const sparks = [];

  // Initialize embers
  const MAX_EMBERS = REDUCE_MOTION ? 0 : 450;
  for(let i=0; i<MAX_EMBERS; i++) {
    const isYellow = Math.random() < 0.4;
    const color = isYellow 
      ? (Math.random() < 0.5 ? '255, 215, 0' : '255, 185, 20')  // Bright Yellow / Gold
      : (Math.random() < 0.5 ? '255, 80, 20' : '220, 50, 20');  // Flame Orange / Red
    embers.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: rand(0.6, 1.8),
      vx: rand(-0.4, 0.4),
      vy: rand(-0.2, -0.9),
      life: rand(0, Math.PI * 2),
      speed: rand(0.01, 0.045),
      color
    });
  }

  function spawnSlash(x, y) {
    const count = REDUCE_MOTION ? 0 : 35;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(3, 9);
      sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: rand(0.015, 0.04),
        r: rand(0.6, 1.8)
      });
    }
  }

  window.addEventListener('mousedown', (e) => {
    spawnSlash(e.clientX, e.clientY);
  });

  function tickFx() {
    // 1. Update DOM Cursor
    const vel = Math.sqrt(pointer.vx * pointer.vx + pointer.vy * pointer.vy);
    cx = lerp(cx, pointer.x, 0.35);
    cy = lerp(cy, pointer.y, 0.35);
    crot += REDUCE_MOTION ? 0 : clamp(vel * 0.8 + 2, 2, 25);
    
    if (ninjaCursor) {
      ninjaCursor.style.transform = `translate(${cx}px, ${cy}px) rotate(${crot}deg)`;
    }

    // 2. Draw FX Canvas
    if (fx && fW > 0 && fH > 0) {
      fx.clearRect(0, 0, fW, fH);
      
      // Embers
      fx.shadowBlur = 6;
      fx.shadowColor = '#FF4400';
      embers.forEach(e => {
        e.x += e.vx;
        e.y += e.vy;
        e.life += e.speed;
        
        // Mouse repulse
        const dx = e.x - pointer.x, dy = e.y - pointer.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist < 140 && dist > 0.1) {
          e.x += (dx/dist) * 4;
          e.y += (dy/dist) * 4;
        }

        if(e.y < -10 || e.x < -20 || e.x > fW + 20) {
          e.y = fH + 10;
          e.x = Math.random() * fW;
        }

        const alpha = 0.5 + Math.sin(e.life) * 0.4;
        fx.beginPath();
        fx.arc(e.x, e.y, e.r, 0, Math.PI*2);
        fx.fillStyle = `rgba(${e.color || '255, 80, 20'}, ${alpha})`;
        fx.fill();
      });
      fx.shadowBlur = 0;

      // Slashes
      for (let i = slashes.length - 1; i >= 0; i--) {
        const s = slashes[i];
        s.r = lerp(s.r, s.maxR, 0.25);
        s.life -= 0.045;
        if (s.life <= 0) { slashes.splice(i, 1); continue; }
        fx.beginPath();
        fx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        fx.strokeStyle = `rgba(255, 30, 30, ${s.life})`;
        fx.lineWidth = 3 * s.life;
        fx.stroke();
      }

      // Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.vy += 0.15; // gravity
        p.life -= p.decay;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        fx.beginPath();
        fx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        fx.fillStyle = `rgba(255, 200, 50, ${p.life})`;
        fx.fill();
      }
    }

    requestAnimationFrame(tickFx);
  }
  tickFx();


  /* ══════════════════════════════════════════
     5. ANTI-GRAVITY FLOAT & PARALLAX
     Applied both to static cards and dynamically injected panel cards
  ══════════════════════════════════════════ */
  let floatStates = [];

  function buildFloatState(el) {
    const seed = parseInt(el.dataset.floatSeed || '0', 10);
    return {
      el,
      freqY:  0.00075 + (seed % 6) * 0.0001,
      freqX:  0.00045 + (seed % 4) * 0.00008,
      ampY:   7  + (seed % 4) * 2.8,
      ampX:   2.8 + (seed % 3) * 1.8,
      phaseY: (seed * 1.25) % (Math.PI * 2),
      phaseX: (seed * 2.2) % (Math.PI * 2),
      rotAmp: 1.1 + (seed % 3) * 0.35,
      rotFreq: 0.00055 + (seed % 4) * 0.00009,
      parallaxX: 0, parallaxY: 0,
      curX: 0, curY: 0, curRot: 0
    };
  }

  function attachFloatToNewCards() {
    // Rebuild floatStates for all currently present .member-card elements
    floatStates = $$('.member-card').map(el => buildFloatState(el));
    attachHoverSparks();
  }

  function tickFloat(t) {
    if (!REDUCE_MOTION) {
      const normMx = (pointer.x / window.innerWidth - 0.5) || 0;
      const normMy = (pointer.y / window.innerHeight - 0.5) || 0;

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
     6. FOG PARALLAX
  ══════════════════════════════════════════ */
  const fogs = $$('.fog');
  let fogFx = 0, fogFy = 0;

  function tickFog() {
    if (!REDUCE_MOTION) {
      const targetFx = (pointer.x / window.innerWidth  - 0.5);
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
     7. GOOEY BACKGROUND GRADIENT MOVEMENT
  ══════════════════════════════════════════ */
  const blob1 = $('.blob-1');
  const blob2 = $('.blob-2');
  const blob3 = $('.blob-3');
  let bx1 = 0, by1 = 0, bx2 = 0, by2 = 0, bx3 = 0, by3 = 0;

  function tickGooeyBg() {
    if (!REDUCE_MOTION && blob1 && blob2 && blob3) {
      // Main gradient aura is mathematically locked to the exact center of the ninja cursor (cx, cy)
      bx1 = cx - 160;
      by1 = cy - 160;
      blob1.style.transform = `translate3d(${bx1}px, ${by1}px, 0)`;

      // Trailing gooey blob 1 drags behind cursor position
      bx2 = lerp(bx2, cx - 110, 0.2);
      by2 = lerp(by2, cy - 110, 0.2);
      blob2.style.transform = `translate3d(${bx2}px, ${by2}px, 0)`;

      // Trailing gooey blob 2 lags further and wobbles dynamically
      const time = Date.now() * 0.002;
      const offsetX = Math.sin(time) * 20;
      const offsetY = Math.cos(time) * 20;
      bx3 = lerp(bx3, cx - 90 + offsetX, 0.1);
      by3 = lerp(by3, cy - 90 + offsetY, 0.1);
      blob3.style.transform = `translate3d(${bx3}px, ${by3}px, 0)`;
    }
    requestAnimationFrame(tickGooeyBg);
  }
  requestAnimationFrame(tickGooeyBg);


  /* ══════════════════════════════════════════
     8. SCROLL REVEAL (IntersectionObserver)
     — CTA slide still uses .reveal class
  ══════════════════════════════════════════ */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });

  $$('.reveal').forEach(el => revealObserver.observe(el));


  /* ══════════════════════════════════════════
     9. HOVER SHURIKEN BURST (member cards)
  ══════════════════════════════════════════ */
  function attachHoverSparks() {
    // Re-query all member cards including newly injected ones
    $$('.member-card').forEach(card => {
      if (card._sparkAttached) return;
      card._sparkAttached = true;
      card.addEventListener('mouseenter', () => {
        if (!REDUCE_MOTION) {
          const rect = card.getBoundingClientRect();
          const cxc = rect.left + rect.width  / 2;
          const cyc = rect.top  + rect.height / 2;
          for (let i = 0; i < 6; i++) {
            const angle = Math.PI + rand(-Math.PI / 4, Math.PI / 4);
            const speed = rand(1, 3);
            sparks.push({
              x: cxc, y: cyc,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 0.65, decay: rand(0.02, 0.04),
              size: rand(0.8, 1.8), hue: '255,122,0'
            });
          }
        }
      });
    });
  }
  attachHoverSparks();





  /* ══════════════════════════════════════════
     INITIALIZE TEAM STAGE
  ══════════════════════════════════════════ */
  (function init() {
    goToPage(0, true);
    applyNavCardClasses();

    // Set initial track position (no animation)
    trackTargetX = computeTrackOffset(0);
    trackCurrentX = trackTargetX;
    tsNavTrack.style.transform = `translateX(${trackCurrentX}px)`;

    updateMainContent(0);
  })();

})();
