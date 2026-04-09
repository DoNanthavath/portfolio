/* ═══════════════════════════════════════════════════════
   DO NANTHAVATH PORTFOLIO — MAIN JS
════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── LOAD MEDIA (works on local server AND Cloudflare Pages) ── */
  const IMG_EXTS   = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
  const VID_EXTS   = ['mp4', 'webm'];

  // Probe a list of paths, return first that exists (HTTP 200)
  async function probe(paths) {
    for (const p of paths) {
      try {
        const r = await fetch(p, { method: 'HEAD' });
        if (r.ok) return p;
      } catch (_) {}
    }
    return null;
  }

  async function loadMedia() {
    // ── Profile photo → card front ──
    const profileSrc = await probe(IMG_EXTS.map(e => `assets/images/profile.${e}`));
    if (profileSrc) {
      const front = document.getElementById('cardFront');
      if (front) front.innerHTML = `<img src="${profileSrc}" alt="Do Nanthavath" style="width:100%;height:100%;object-fit:cover;display:block;"/>`;
    }

    // ── Flip card video → card back ──
    const flipSrc = await probe(VID_EXTS.map(e => `assets/videos/flipcard.${e}`));
    if (flipSrc) {
      const back = document.getElementById('cardBack');
      if (back) back.innerHTML = `<video src="${flipSrc}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
    }

    // ── Showreel — local video file ──
    const showSrc = await probe(VID_EXTS.map(e => `assets/videos/showreel.${e}`));
    if (showSrc) {
      const section = document.getElementById('showreel');
      const video   = document.getElementById('showreelVideo');
      if (section) section.style.display = 'block';
      if (video) { video.querySelector('source').src = showSrc; video.load(); }
    }

    // ── Showreel — Vimeo/YouTube embed (set data-vimeo or data-youtube on section) ──
    const srSection = document.getElementById('showreel');
    if (srSection && !showSrc) {
      const vimeoId   = srSection.dataset.vimeo;
      const youtubeId = srSection.dataset.youtube;
      if (vimeoId || youtubeId) {
        srSection.style.display = 'block';
        const player = document.getElementById('showreelPlayer');
        if (player && vimeoId) {
          player.innerHTML = `<iframe src="https://player.vimeo.com/video/${vimeoId}?autoplay=0&title=0&byline=0&portrait=0&color=f2f2f2" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
          player.style.position = 'relative';
        } else if (player && youtubeId) {
          player.innerHTML = `<iframe src="https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
          player.style.position = 'relative';
        }
        // Hide the local video overlay when using embed
        const overlay = document.getElementById('showreelOverlay');
        if (overlay) overlay.style.display = 'none';
      }
    }

    // ── Project thumbnails → hover preview ──
    for (let i = 1; i <= 6; i++) {
      const src = await probe(IMG_EXTS.map(e => `assets/images/project-${i}.${e}`));
      if (src) {
        const row = document.querySelector(`[data-slot="project-${i}"]`);
        if (row) row.dataset.previewSrc = src;
      }
    }
  }

  /* ── PRELOADER ─────────────────────────────────────── */
  const preloader = document.getElementById('preloader');
  const preFill   = document.querySelector('.pre-fill');
  document.body.classList.add('loading');

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { preFill.style.width = '100%'; }, 100);
    setTimeout(() => {
      preloader.classList.add('done');
      document.body.classList.remove('loading');
      initCounters();
      loadMedia();
    }, 1600);
  });

  /* ── CUSTOM CURSOR ─────────────────────────────────── */
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let mouseX = -100, mouseY = -100;
  let ringX  = -100, ringY  = -100;
  let raf;

  if (window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + 'px';
      dot.style.top  = mouseY + 'px';
    });

    function animRing() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = ringX + 'px';
      ring.style.top  = ringY + 'px';
      raf = requestAnimationFrame(animRing);
    }
    animRing();

    document.querySelectorAll('a, button, .work-row, .rate-card, .hero-card').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-link'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-link'));
    });
  }

  /* ── NAV SCROLL BEHAVIOR ───────────────────────────── */
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
    updateActiveLink();
  }, { passive: true });

  /* ── ACTIVE NAV LINK ───────────────────────────────── */
  const sections  = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('[data-nav]');

  function updateActiveLink() {
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  }

  /* ── LIVE CLOCK ────────────────────────────────────── */
  const timeEl = document.getElementById('navTime');
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    if (timeEl) timeEl.textContent = `${h}:${m}:${s}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  /* ── MOBILE MENU ───────────────────────────────────── */
  const burger  = document.getElementById('burger');
  const mobMenu = document.getElementById('mobMenu');
  burger.addEventListener('click', () => {
    const open = mobMenu.classList.toggle('open');
    burger.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.querySelectorAll('.mob-link').forEach(l => {
    l.addEventListener('click', () => {
      mobMenu.classList.remove('open');
      burger.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  /* ── HERO ROLE CYCLING ─────────────────────────────── */
  const roles = document.querySelectorAll('.hero-role');
  let roleIdx = 0;
  setInterval(() => {
    roles[roleIdx].classList.remove('active');
    roles[roleIdx].classList.add('exit');
    setTimeout(() => roles[roleIdx].classList.remove('exit'), 400);
    roleIdx = (roleIdx + 1) % roles.length;
    roles[roleIdx].classList.add('active');
  }, 2400);

  /* ── COUNTER ANIMATION ─────────────────────────────── */
  function animCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const dur    = 1400;
    const start  = performance.now();
    function step(now) {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(ease * target);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = target + (target >= 100 ? '+' : target >= 10 ? '+' : '');
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    document.querySelectorAll('.stat-num, .counter-num').forEach(el => animCount(el));
  }

  /* ── SCROLL REVEAL ─────────────────────────────────── */
  const revealEls = document.querySelectorAll(
    '.work-row, .rate-card, .about-bio, .about-pills, .about-stat-block, .contact-link-row, .section-head'
  );
  revealEls.forEach(el => el.classList.add('reveal'));

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = `${(entry.target.dataset.delay || 0)}ms`;
        entry.target.classList.add('in');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  // Staggered delays
  document.querySelectorAll('.work-row').forEach((el, i)  => el.dataset.delay = i * 60);
  document.querySelectorAll('.rate-card').forEach((el, i) => el.dataset.delay = i * 50);
  document.querySelectorAll('.contact-link-row').forEach((el, i) => el.dataset.delay = i * 80);

  revealEls.forEach(el => revealObs.observe(el));

  /* ── WORK ROW HOVER PREVIEW ────────────────────────── */
  const ghost      = document.getElementById('workPreview');
  const previewImg = document.getElementById('previewImg');
  let ghostX = 0, ghostY = 0;
  let ghostRaf;

  document.querySelectorAll('.work-row').forEach(row => {
    row.addEventListener('mouseenter', () => {
      if (row.dataset.previewSrc) {
        previewImg.style.background = '';
        previewImg.style.backgroundImage = `url(${row.dataset.previewSrc})`;
        previewImg.style.backgroundSize = 'cover';
        previewImg.style.backgroundPosition = 'center';
      } else {
        previewImg.style.backgroundImage = '';
        previewImg.style.background = row.dataset.previewBg;
      }
      ghost.classList.add('show');
    });
    row.addEventListener('mouseleave', () => {
      ghost.classList.remove('show');
    });
  });

  let px = 0, py = 0;
  document.addEventListener('mousemove', (e) => {
    px = e.clientX;
    py = e.clientY;
    if (ghost) {
      ghost.style.left = px + 'px';
      ghost.style.top  = py + 'px';
    }
  });

  /* ── SHOWREEL PLAY BUTTON ──────────────────────────── */
  const srPlayBtn = document.getElementById('srPlayBtn');
  const srOverlay = document.getElementById('showreelOverlay');
  const srVideo   = document.getElementById('showreelVideo');
  if (srPlayBtn && srVideo) {
    srPlayBtn.addEventListener('click', () => {
      srVideo.play();
      srOverlay.classList.add('hidden');
    });
    srVideo.addEventListener('pause', () => srOverlay.classList.remove('hidden'));
    srVideo.addEventListener('ended', () => srOverlay.classList.remove('hidden'));
  }

  /* ── HERO CARD FLIP ────────────────────────────────── */
  // Touch support for mobile flip
  const heroCard = document.querySelector('.hero-card');
  if (heroCard) {
    let flipped = false;
    heroCard.addEventListener('click', () => {
      flipped = !flipped;
      heroCard.classList.toggle('flipped', flipped);
    });
  }

  /* ── PROGRESS BAR ANIMATE ──────────────────────────── */
  const barObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.asb-fill').forEach(bar => {
          // trigger reflow
          bar.getBoundingClientRect();
          bar.style.width = bar.style.width;
        });
        barObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.about-right').forEach(el => barObs.observe(el));

  /* ── SMOOTH ANCHOR SCROLL ──────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

})();
