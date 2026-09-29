(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav ---------- */
  var nav = document.getElementById('nav');
  var toggle = nav.querySelector('.nav__toggle');

  function closeMenu() {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }
  toggle.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('.nav__menu a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* Active section + gliding highlight.
     The highlight follows the section in view. When a link is clicked it glides straight to
     that link, and the scroll spy is paused until the smooth scroll ends, so it does not
     step through every section passed on the way. */
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll('.nav__links a'));
  var glide = nav.querySelector('.nav__glide');
  var activeId = null, spyPaused = false;

  function placeGlide() {
    var link = activeId && nav.querySelector('.nav__links a[href="#' + activeId + '"]');
    if (!link || !glide) { if (glide) glide.classList.remove('is-on'); return; }
    glide.style.width = link.offsetWidth + 'px';
    glide.style.transform = 'translateX(' + link.offsetLeft + 'px)';
    glide.classList.add('is-on');
  }
  function setActive(id) {
    activeId = id;
    navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + id); });
    placeGlide();
  }

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      if (spyPaused) return;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        setActive(entry.target.id === 'top' ? null : entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'problem', 'solution', 'product', 'impact', 'market', 'roadmap', 'about'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  function pauseSpyUntilScrollEnds() {
    spyPaused = true;
    var done = false;
    function resume() {
      if (done) return;
      done = true;
      window.removeEventListener('scrollend', resume);
      spyPaused = false;
    }
    window.addEventListener('scrollend', resume);
    setTimeout(resume, 1600);   // fallback where scrollend is not supported
  }
  navLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      setActive(a.getAttribute('href').slice(1));
      pauseSpyUntilScrollEnds();
    });
  });
  nav.querySelector('.brand').addEventListener('click', function () { setActive(null); pauseSpyUntilScrollEnds(); });

  window.addEventListener('resize', placeGlide);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeGlide);

  /* ---------- Scroll reveal, played in both directions ----------
     Elements animate in as they enter the viewport and retract as they leave it.
     data-side remembers which edge an element left by, so it returns from that side. */
  (function () {
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    function each(sel, fn) { document.querySelectorAll(sel).forEach(fn); }

    function mark(el, type, delay) {
      if (el.hasAttribute('data-reveal')) return;
      el.setAttribute('data-reveal', type);
      if (delay) el.style.setProperty('--d', delay + 'ms');
    }

    // wrap every word in a clipping span so headlines can rise line by line
    function splitWords(el) {
      var nodes = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), i = 0;
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (node) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var outer = document.createElement('span'), inner = document.createElement('span');
          outer.className = 'w'; inner.className = 'w__i';
          inner.style.setProperty('--i', i++);
          inner.textContent = part;
          outer.appendChild(inner); frag.appendChild(outer);
        });
        node.parentNode.replaceChild(frag, node);
      });
      mark(el, 'words');
    }

    // headlines
    each('.hero h1, h2:not(.footer__h), .h3-large, .subhead, .statement p', splitWords);
    document.querySelector('.hero h1').setAttribute('data-delay', 350);   // let the photo settle first

    // Problem opener and the Solution demo
    each('.opener__lede, .opener__actions, .demo', function (el) { mark(el, 'fade'); });

    // single blocks of text
    each([
      '.lede', '.split__text > p', '.source', '.steps__note', '.edge__text > p', '.proof__intro',
      '.fit__text h3', '.fit__text p', '.note', '.target__lead', '.target__floor', '.econ h3', '.econ__sub',
      '.calc__in', '.milestones h3', '.footer__about', '.footer__nav', '.about__text p', '.about__photo'
    ].join(','), function (el) { mark(el, 'fade'); });
    mark(document.querySelector('.target__num'), 'rise');

    // members of a set are watched one by one, so tall sets (cards, phases, rows) react item by item
    each([
      '.figures', '.steps', '.safeguards', '.compare tbody', '.proof__list', '.plans', '.fit__table tbody',
      '.outcomes', '.esg__cols', '.bars', '.calc__out', '.audiences', '.path', '.pressures', '.phases', '.milestones dl'
    ].join(','), function (set) {
      Array.prototype.forEach.call(set.children, function (child) { mark(child, 'item'); });
    });

    // graphics that draw themselves
    each('.timeline, .scale, .share', function (el) { mark(el, 'grow'); });

    /* The "stage" is the viewport minus 8% at the top and 16% at the bottom.
       An element retracts as soon as it has fully left the stage, while it is still visible
       in the bottom (or top) band of the screen, so the exit is clearly seen. The hidden
       offset moves the element away from the stage, which gives a natural hysteresis and
       prevents flicker at the boundary. */
    var io = new IntersectionObserver(function (entries) {
      var entering = [];
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting) {
          if (!el.classList.contains('is-in')) entering.push(e);
        } else {
          var top = e.rootBounds ? e.rootBounds.top : 0;
          el.setAttribute('data-side', e.boundingClientRect.top < top ? 'above' : 'below');
          el.classList.remove('is-in');
        }
      });
      // stagger only among elements that arrive together, in reading order
      entering.sort(function (a, b) {
        return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left);
      });
      entering.forEach(function (e, k) {
        var fixed = e.target.getAttribute('data-delay');
        e.target.style.setProperty('--d', (fixed !== null ? +fixed : Math.min(k, 6) * 90) + 'ms');
        e.target.classList.add('is-in');
      });
    }, { rootMargin: '-8% 0px -16% 0px', threshold: 0 });

    // wait two frames so the hidden state is painted before anything animates in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        each('[data-reveal]', function (el) { io.observe(el); });
      });
    });

    /* Photos are scroll-linked rather than timed: how much of each photo is revealed is a
       direct function of where it sits on screen, so it cannot lag, jump or glitch when the
       scroll direction changes. */
    var photos = Array.prototype.slice.call(document.querySelectorAll('.split__photo, .edge__photo'));
    photos.forEach(function (p) { p.setAttribute('data-scrub', ''); });
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function smooth(v) { return v * v * (3 - 2 * v); }
    var pending = false;
    function scrub() {
      pending = false;
      var vh = window.innerHeight;
      photos.forEach(function (p) {
        var r = p.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;               // far off screen: nothing to update
        // the mask always opens from the edge that is on screen: the top edge while the photo rises
        // into view, and it gives way from the top again as the photo leaves through the top
        var enter = smooth(clamp01((vh - r.top) / (vh * 0.55)));
        var leave = smooth(clamp01(r.bottom / (vh * 0.45)));
        p.style.setProperty('--clip-b', ((1 - enter) * 100).toFixed(2) + '%');
        p.style.setProperty('--clip-t', ((1 - leave) * 100).toFixed(2) + '%');
        p.style.setProperty('--zoom', (1 + 0.12 * (1 - Math.min(enter, leave))).toFixed(4));
      });
    }
    function requestScrub() { if (!pending) { pending = true; requestAnimationFrame(scrub); } }
    window.addEventListener('scroll', requestScrub, { passive: true });
    window.addEventListener('resize', requestScrub);
    scrub();
  })();

  /* ---------- Calls to action: go to contact and highlight it ---------- */
  var contact = document.getElementById('contact');
  document.querySelectorAll('[data-contact]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var done = false;
      function flash() {
        if (done) return;
        done = true;
        window.removeEventListener('scrollend', flash);
        contact.focus({ preventScroll: true });
        contact.classList.add('is-flash');
        setTimeout(function () { contact.classList.remove('is-flash'); }, 2400);
      }
      window.addEventListener('scrollend', flash);
      setTimeout(flash, reduceMotion ? 50 : 1400);
      contact.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      history.replaceState(null, '', '#contact');
    });
  });

  /* ---------- Savings estimator ---------- */
  var EUI = 105.9, HVAC_SHARE = 0.55, PRICE = 4000, GRID = 0.6592, FX = 25000, GAIN = 0.15;
  var AREA_MIN = 1000, AREA_MAX = 100000, REF_AREA = 15000;
  var area = document.getElementById('area');
  var areaRange = document.getElementById('areaRange');
  var areaErr = document.getElementById('area-err');
  var rates = document.querySelectorAll('input[name="rate"]');
  var out = {
    kwh: document.getElementById('oKwh'), vnd: document.getElementById('oVnd'), usd: document.getElementById('oUsd'),
    co2: document.getElementById('oCo2'), owner: document.getElementById('oOwner'), airai: document.getElementById('oAirai')
  };

  function fmtVnd(v) { return v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : (v / 1e6).toFixed(1) + 'M'; }
  function currentRate() {
    var r = 0.2;
    rates.forEach(function (x) { if (x.checked) r = parseFloat(x.value); });
    return r;
  }
  function paintRange() {
    var pct = (areaRange.value - areaRange.min) / (areaRange.max - areaRange.min) * 100;
    areaRange.style.setProperty('--p', pct + '%');
  }
  function calc() {
    paintRange();
    var a = parseFloat(area.value);
    var valid = !isNaN(a) && a >= AREA_MIN && a <= AREA_MAX;
    area.setAttribute('aria-invalid', String(!valid));
    areaErr.hidden = valid;
    if (!valid) return;
    var kwh = a * EUI * HVAC_SHARE * currentRate();
    var vnd = kwh * PRICE;
    out.kwh.textContent = Math.round(kwh).toLocaleString('en-US');
    out.vnd.textContent = fmtVnd(vnd);
    out.usd.textContent = 'about USD ' + (Math.round(vnd / FX / 100) * 100).toLocaleString('en-US');
    out.co2.textContent = (kwh / 1000 * GRID).toFixed(1);
    out.owner.textContent = fmtVnd(vnd * (1 - GAIN)) + ' VND';
    out.airai.textContent = fmtVnd(vnd * GAIN) + ' VND';
  }
  area.addEventListener('input', function () {
    var a = parseFloat(area.value);
    if (!isNaN(a)) areaRange.value = Math.min(Math.max(a, AREA_MIN), +areaRange.max);
    calc();
  });
  areaRange.addEventListener('input', function () { area.value = areaRange.value; calc(); });
  rates.forEach(function (r) { r.addEventListener('change', calc); });
  document.getElementById('estReset').addEventListener('click', function () {
    area.value = REF_AREA; areaRange.value = REF_AREA;
    rates.forEach(function (r) { r.checked = r.value === '0.20'; });
    calc();
  });
  calc();

  /* ---------- Hero: building cross-section with airflow ---------- */
  var canvas = document.getElementById('building');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // Illustrative occupancy per floor, top floor first. Four floors are empty.
  var OCC = [0.85, 0, 0.4, 1, 0, 0.6, 0.15, 0, 0.9];
  var MIN_AIR = 0.05; // fresh-air minimum AirAI keeps on empty floors
  var CAPTIONS = {
    fixed: 'On a fixed schedule every floor is cooled all day, full or empty. The amber floors have no one in them.',
    ai: 'With AirAI the air follows the people. Empty floors ease back to minimum ventilation and busy floors are served first.'
  };
  var LABELS = {
    fixed: 'Illustration of a nine-floor office building. On a fixed schedule, conditioned air flows into every floor, including four empty ones.',
    ai: 'Illustration of the same building with AirAI. Air flows mainly to occupied floors; the four empty floors receive only minimum ventilation.'
  };

  var mode = 'fixed';
  var flow = OCC.map(function () { return 1; });
  var parts = [];
  var W = 0, H = 0, g = null, running = true, raf = 0, interacted = false;
  var caption = document.getElementById('vizCaption');
  var buttons = document.querySelectorAll('.toggle button');

  function target(i) { return mode === 'fixed' ? 1 : Math.max(MIN_AIR, OCC[i]); }

  function layout() {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = OCC.length;
    var bx = W * 0.06, bw = W * 0.88, roof = H * 0.1, ground = H * 0.97;
    var fh = (ground - roof) / n, shaft = Math.max(12, bw * 0.06);
    var x0 = bx + shaft + bw * 0.1, x1 = bx + bw - bw * 0.06;
    g = { n: n, bx: bx, bw: bw, roof: roof, ground: ground, fh: fh, shaft: shaft, start: bx + shaft, end: bx + bw - 4, people: [] };
    for (var i = 0; i < n; i++) {
      var count = Math.round(OCC[i] * 7), row = [];
      for (var k = 0; k < count; k++) {
        var jitter = (((k * 37 + i * 13) % 10) / 10 - 0.5) * 0.5;
        row.push(x0 + (x1 - x0) * ((k + 0.5 + jitter) / 7));
      }
      g.people.push(row);
    }
    if (reduceMotion) seedStatic();
  }

  function spawn(i, x) {
    var y = g.roof + g.fh * (i + 0.5) + (Math.random() - 0.5) * g.fh * 0.5;
    // each streak crosses the floor in roughly 1.5 to 2.5 seconds, whatever the canvas width
    var frames = 90 + Math.random() * 60;
    parts.push({ i: i, x: x, y: y, v: (g.end - g.start) / frames, len: 8 + Math.random() * 14 });
  }

  function seedStatic() {
    parts = [];
    for (var i = 0; i < g.n; i++) {
      var c = Math.round(target(i) * 14);
      for (var k = 0; k < c; k++) spawn(i, g.start + (g.end - g.start) * ((k + 0.5) / 14));
      flow[i] = target(i);
    }
  }

  function drawFrame(t) {
    ctx.clearRect(0, 0, W, H);
    var line = 'rgba(232,240,246,0.22)';

    // rooftop plant
    ctx.strokeStyle = 'rgba(232,240,246,0.35)'; ctx.lineWidth = 1;
    for (var u = 0; u < 3; u++) {
      var ux = g.bx + g.bw * (0.5 + u * 0.14), uw = g.bw * 0.1, uh = g.fh * 0.42;
      ctx.strokeRect(ux + 0.5, g.roof - uh + 0.5, uw, uh);
    }

    // empty floors glow amber in proportion to the air still being sent there
    for (var i = 0; i < g.n; i++) {
      if (OCC[i] === 0) {
        var waste = (flow[i] - MIN_AIR) / (1 - MIN_AIR);
        var gy = g.roof + g.fh * i + 1;
        var wash = ctx.createLinearGradient(g.start, 0, g.bx + g.bw, 0);
        wash.addColorStop(0, 'rgba(244,184,96,' + (0.34 * waste).toFixed(3) + ')');
        wash.addColorStop(1, 'rgba(244,184,96,' + (0.12 * waste).toFixed(3) + ')');
        ctx.fillStyle = wash;
        ctx.fillRect(g.start, gy, g.bw - g.shaft, g.fh - 1);
      }
    }

    // shell and floor plates
    ctx.strokeStyle = 'rgba(232,240,246,0.5)';
    ctx.strokeRect(g.bx + 0.5, g.roof + 0.5, g.bw, g.ground - g.roof);
    ctx.strokeStyle = line;
    for (var f = 1; f < g.n; f++) {
      var fy = Math.round(g.roof + g.fh * f) + 0.5;
      ctx.beginPath(); ctx.moveTo(g.bx, fy); ctx.lineTo(g.bx + g.bw, fy); ctx.stroke();
    }

    // supply shaft
    ctx.fillStyle = 'rgba(107,207,237,0.07)';
    ctx.fillRect(g.bx + 1, g.roof + 1, g.shaft, g.ground - g.roof - 1);
    ctx.strokeStyle = 'rgba(107,207,237,0.4)';
    ctx.beginPath(); ctx.moveTo(g.start + 0.5, g.roof); ctx.lineTo(g.start + 0.5, g.ground); ctx.stroke();
    var total = flow.reduce(function (a, b) { return a + b; }, 0) / g.n;
    ctx.fillStyle = 'rgba(107,207,237,' + (0.35 + 0.5 * total).toFixed(2) + ')';
    var step = g.fh * 0.5, off = reduceMotion ? 0 : (t / 30) % step;
    for (var sy = g.roof + off; sy < g.ground; sy += step) {
      ctx.fillRect(g.bx + g.shaft / 2 - 1, sy, 2, step * 0.45 * (0.4 + total));
    }

    // airflow streaks
    for (var p = 0; p < parts.length; p++) {
      var q = parts[p];
      var prog = (q.x - g.start) / (g.end - g.start);
      var a = Math.min(1, prog * 6) * (1 - Math.pow(prog, 3)) * 0.85;
      var grad = ctx.createLinearGradient(q.x - q.len, 0, q.x, 0);
      grad.addColorStop(0, 'rgba(107,207,237,0)');
      grad.addColorStop(1, 'rgba(107,207,237,' + a.toFixed(3) + ')');
      ctx.strokeStyle = grad; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(Math.max(g.start, q.x - q.len), q.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }

    // people
    var r = Math.max(2.5, Math.min(4.5, g.fh * 0.09));
    ctx.fillStyle = '#FFFFFF';
    for (var fl = 0; fl < g.n; fl++) {
      var py = g.roof + g.fh * (fl + 0.72);
      for (var k = 0; k < g.people[fl].length; k++) {
        ctx.beginPath(); ctx.arc(g.people[fl][k], py, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function tick(t) {
    for (var i = 0; i < g.n; i++) {
      flow[i] += (target(i) - flow[i]) * 0.03;
      if (Math.random() < flow[i] * 0.5) spawn(i, g.start);
    }
    for (var p = parts.length - 1; p >= 0; p--) {
      parts[p].x += parts[p].v;
      if (parts[p].x > g.end) parts.splice(p, 1);
    }
    drawFrame(t);
    if (running) raf = requestAnimationFrame(tick);
  }

  function setMode(m, byUser) {
    if (byUser) interacted = true;
    if (m === mode) return;
    mode = m;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    caption.textContent = CAPTIONS[m];
    canvas.setAttribute('aria-label', LABELS[m]);
    if (reduceMotion) { seedStatic(); drawFrame(0); }
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.getAttribute('data-mode'), true); });
  });

  layout();
  if (reduceMotion) {
    drawFrame(0);
  } else {
    // prefill the floors so the first frame already shows airflow
    for (var s = 0; s < 240; s++) {
      for (var i = 0; i < g.n; i++) if (Math.random() < 0.42) spawn(i, g.start);
      for (var p = parts.length - 1; p >= 0; p--) { parts[p].x += parts[p].v; if (parts[p].x > g.end) parts.splice(p, 1); }
    }
    raf = requestAnimationFrame(tick);
    var autoSwitchQueued = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        running = entries[0].isIntersecting;
        cancelAnimationFrame(raf);
        if (running) raf = requestAnimationFrame(tick);
        // one orchestrated moment: 3s after the demo is first seen, show the switch once,
        // unless the visitor gets there first
        if (running && !autoSwitchQueued) {
          autoSwitchQueued = true;
          setTimeout(function () { if (!interacted) setMode('ai', false); }, 3000);
        }
      }).observe(canvas);
    } else {
      setTimeout(function () { if (!interacted) setMode('ai', false); }, 4200);
    }
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var oldStart = g.start, oldSpan = g.end - g.start, oldRoof = g.roof, oldFh = g.fh;
      layout();
      if (!reduceMotion) parts.forEach(function (q) {
        q.x = g.start + (q.x - oldStart) / oldSpan * (g.end - g.start);
        q.y = g.roof + (q.y - oldRoof) / oldFh * g.fh;
      });
      drawFrame(performance.now());
    }, 120);
  });
})();
