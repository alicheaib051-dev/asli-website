/* Asli Beirut — scroll motion layer (vanilla, no dependencies). Runs after site.js.
   - platter: pinned zoom-in (framed photo → full-bleed while the image zooms out), copy + count-up
   - mosaic:  pinned zoom-out (one dish fills the screen → the whole spread)
   - cards:   scroll-linked zoom (gently in toward screen centre, back out as they leave)
   - headings: word-by-word rise; menu rows stagger in; ticker leans with scroll velocity
   Everything is transform/opacity/clip-path only; CSS custom properties carry the state.
   prefers-reduced-motion: nothing here runs and the CSS falls back to static layouts. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var clamp = function (x, a, b) { return Math.min(b, Math.max(a, x)); };
  var smooth = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var vh = window.innerHeight;

  /* ---------------------------------------------------------------- headings: word split */
  document.querySelectorAll('.h2.rv').forEach(function (h) {
    var idx = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement('span'); w.className = 'w';
            var i = document.createElement('span'); i.textContent = p; i.style.setProperty('--wi', idx++);
            w.appendChild(i); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) { walk(n); }
      });
    })(h);
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
  });

  /* ---------------------------------------------------------------- menu rows stagger */
  var cats = document.querySelectorAll('.mcat');
  if (cats.length && 'IntersectionObserver' in window) {
    cats.forEach(function (c) { c.querySelectorAll('.mitem').forEach(function (it, i) { it.style.setProperty('--i', i); }); });
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); cio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    cats.forEach(function (c) { cio.observe(c); });
  } else { cats.forEach(function (c) { c.classList.add('is-in'); }); }

  /* ---------------------------------------------------------------- pinned scenes */
  var platter = document.querySelector('.platter');
  var countEl = platter && platter.querySelector('[data-count]');
  var counted = false;
  var mosaic = document.querySelector('.mosaic');
  var mGrid = mosaic && mosaic.querySelector('.mosaic__grid');
  var mHero = mosaic && mosaic.querySelector('.mosaic__cell--hero');

  function progress(sec) {
    var r = sec.getBoundingClientRect();
    var span = sec.offsetHeight - vh;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }

  function sizeMosaic() {
    if (!mosaic || !mHero) return;
    // scale at which the centre cell covers the whole viewport
    var cw = mHero.offsetWidth, ch = mHero.offsetHeight;
    var S = Math.max(window.innerWidth / cw, window.innerHeight / ch) * 1.04;
    mosaic.style.setProperty('--S', S.toFixed(3));
  }

  function countUp() {
    if (counted || !countEl) return;
    counted = true;
    var to = parseInt(countEl.getAttribute('data-count'), 10), t0 = performance.now(), dur = 1100;
    (function step(now) {
      var k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      countEl.textContent = Math.round(to * e);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------------------------------------------------------------- card zoom (visible only) */
  var media = Array.prototype.slice.call(document.querySelectorAll('.card__media, [data-zoom]'));
  var phero = document.querySelector('.phero__inner');
  var visible = new Set();
  if ('IntersectionObserver' in window) {
    var mio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
    }, { rootMargin: '10% 0px 10% 0px' });
    media.forEach(function (m) { mio.observe(m); });
  }

  /* ---------------------------------------------------------------- ticker lean */
  var strip = document.querySelector('.strip');
  var lastY = window.scrollY, vel = 0;

  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY;

    if (platter) {
      var p = progress(platter);
      var e = smooth(p / 0.55);
      var t = smooth((p - 0.5) / 0.28);
      platter.style.setProperty('--e', e.toFixed(4));
      platter.style.setProperty('--t', t.toFixed(4));
      platter.classList.toggle('is-live', t > 0.6);
      if (t > 0.45) countUp();
    }
    if (mosaic) {
      var q = progress(mosaic);
      mosaic.style.setProperty('--m', smooth((q - 0.06) / 0.7).toFixed(4));
      mosaic.style.setProperty('--m2', smooth((q - 0.74) / 0.16).toFixed(4));
    }
    if (phero) {
      var hp = clamp(y / (vh * 0.9), 0, 1);
      phero.style.setProperty('--pz', (1 - 0.14 * hp).toFixed(4));
      phero.style.setProperty('--po', (1 - 1.15 * hp).toFixed(4));
    }
    visible.forEach(function (m) {
      var r = m.getBoundingClientRect();
      var k = clamp(((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
      m.style.setProperty('--z', (1 + 0.12 * k * k).toFixed(4));
    });
    if (strip) {
      vel += ((y - lastY) - vel) * 0.2; lastY = y;
      strip.style.transform = 'skewX(' + clamp(-vel * 0.12, -10, 10).toFixed(2) + 'deg)';
      if (Math.abs(vel) > 0.05) request();
    }
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { vh = window.innerHeight; sizeMosaic(); request(); });
  window.addEventListener('load', function () { sizeMosaic(); request(); });
  sizeMosaic();
  request();
})();
