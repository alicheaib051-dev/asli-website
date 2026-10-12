/* Asli Beirut — page behaviour. Vanilla, no dependencies.
   - mounts the scroll film (assets/js/scroll-film.js) from window.ASLI_FILM
   - renders the full menu from window.ASLI_MENU (data/menu.js, built from the Printing sheet)
   - header state, mobile nav, reveal-on-scroll, play-on-hover dish cards, footer embers */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hdr = document.querySelector('.hdr');
  var bar = document.querySelector('.hdr__progress');
  var mark = document.querySelector('.film-mark');
  function setHdrH() { if (hdr) document.documentElement.style.setProperty('--hdr-h', hdr.offsetHeight + 'px'); }
  setHdrH(); window.addEventListener('resize', setHdrH);

  /* ------------------------------------------------------------ film */
  var film = document.getElementById('film');
  if (film && window.mountScrollWorld && window.ASLI_FILM) {
    var cfg = window.ASLI_FILM;
    cfg.onProgress = function (p, idx, out) {
      if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (hdr) hdr.classList.toggle('is-solid', out > 0.85);
      if (mark) {
        // the أصلي wordmark greets on landing and dissolves as the first beat's copy arrives
        var y = window.scrollY || 0, vh = window.innerHeight;
        var o = Math.max(0, 1 - y / (0.42 * vh));
        mark.style.opacity = o.toFixed(3);
        mark.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      }
    };
    window.mountScrollWorld(film, cfg);
  } else if (hdr) {
    hdr.classList.add('is-solid');
  }

  /* ------------------------------------------------------------ mobile nav */
  var tgl = document.querySelector('.hdr__menu');
  if (tgl && hdr) {
    tgl.addEventListener('click', function () {
      var open = hdr.classList.toggle('is-open');
      tgl.setAttribute('aria-expanded', open ? 'true' : 'false');
      tgl.setAttribute('aria-label', open ? 'Close site navigation' : 'Site navigation');
    });
    hdr.querySelectorAll('.hdr__nav a').forEach(function (a) {
      a.addEventListener('click', function () { hdr.classList.remove('is-open'); tgl.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ------------------------------------------------------------ menu */
  var M = window.ASLI_MENU;
  var tabs = document.getElementById('menu-tabs');
  var cats = document.getElementById('menu-cats');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  if (M && tabs && cats) {
    var tabHtml = '', catHtml = '';
    M.categories.forEach(function (c, ci) {
      tabHtml += '<button class="tab' + (ci === 0 ? ' is-active' : '') + '" type="button" data-cat="' + esc(c.id) + '">' +
        esc(c.en) + ' <span lang="ar" dir="rtl">' + esc(c.ar) + '</span></button>';
      catHtml += '<div class="mcat" id="m-' + esc(c.id) + '"><div class="mcat__title"><h3 tabindex="-1">' + esc(c.en) + '</h3>' +
        '<span lang="ar" dir="rtl">' + esc(c.ar) + '</span></div><ul class="mlist">';
      c.items.forEach(function (it) {
        var thumb = it.photo
          ? '<img class="mitem__thumb" src="' + esc(it.photo) + '" alt="" loading="lazy" decoding="async" width="64" height="64">'
          : '<span class="mitem__thumb mitem__thumb--none" aria-hidden="true">✦</span>';
        catHtml += '<li class="mitem">' + thumb +
          '<div class="mitem__names"><div class="mitem__en">' + esc(it.en) + '</div>' +
          '<span class="mitem__ar" lang="ar" dir="rtl">' + esc(it.ar) + '</span></div>' +
          '<div class="mitem__price"><small>AED</small>' + esc(it.price) + '</div></li>';
      });
      catHtml += '</ul></div>';
    });
    tabs.innerHTML = tabHtml;
    cats.innerHTML = catHtml;
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('.tab'); if (!b) return;
      var t = document.getElementById('m-' + b.getAttribute('data-cat'));
      if (t) {
        window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - (hdr ? hdr.offsetHeight : 72) - 70, behavior: reduce ? 'auto' : 'smooth' });
        var h3 = t.querySelector('h3'); if (h3) h3.focus({ preventScroll: true });
      }
    });
    // active tab follows scroll
    if ('IntersectionObserver' in window) {
      var tabBtns = tabs.querySelectorAll('.tab');
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = en.target.id.slice(2);
          tabBtns.forEach(function (b) {
            var on = b.getAttribute('data-cat') === id;
            b.classList.toggle('is-active', on);
            if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
            if (on && b.scrollIntoView && tabs.scrollWidth > tabs.clientWidth) {
              tabs.scrollTo({ left: b.offsetLeft - 20, behavior: reduce ? 'auto' : 'smooth' });
            }
          });
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      cats.querySelectorAll('.mcat').forEach(function (c) { io.observe(c); });
    }
  }

  /* ------------------------------------------------------------ reveal */
  var rv = document.querySelectorAll('.rv');
  if (!reduce && 'IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); rio.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (n) { rio.observe(n); });
  } else {
    rv.forEach(function (n) { n.classList.add('is-in'); });
  }

  /* ------------------------------------------------------------ platter parallax */
  var pimg = document.querySelector('.platter__media img');
  if (pimg && !reduce) {
    var pt = false;
    var pmove = function () {
      var r = pimg.parentNode.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) { pt = false; return; }
      var k = (r.top + r.height / 2 - vh / 2) / vh;      // -1..1 around centre
      pimg.style.transform = 'scale(1.1) translate3d(0,' + (k * -4).toFixed(2) + '%,0)';
      pt = false;
    };
    window.addEventListener('scroll', function () { if (!pt) { pt = true; requestAnimationFrame(pmove); } }, { passive: true });
    pmove();
  }

  /* ------------------------------------------------------------ play-on-hover dish cards */
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll('.card[data-clip]').forEach(function (card) {
    if (reduce) return;
    var media = card.querySelector('.card__media');
    var v = null;
    function ensure() {
      if (v) return v;
      v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      v.src = card.getAttribute('data-clip');
      media.appendChild(v);
      return v;
    }
    function play() { var x = ensure(); var p = x.play(); card.classList.add('is-playing'); if (p && p.catch) p.catch(function () {}); }
    function stop() { if (!v) return; v.pause(); card.classList.remove('is-playing'); }
    if (canHover) {
      card.addEventListener('mouseenter', play);
      card.addEventListener('mouseleave', stop);
    } else if ('IntersectionObserver' in window) {
      // touch: play while the card is centred on screen
      new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { if (en.isIntersecting) play(); else stop(); });
      }, { rootMargin: '-35% 0px -35% 0px' }).observe(card);
    }
  });

  /* ------------------------------------------------------------ footer embers */
  var em = document.querySelector('.embers');
  if (em && !reduce) {
    var seeds = [7, 19, 31, 44, 52, 63, 71, 83, 91, 12, 27, 38, 57, 68, 77, 88];
    seeds.forEach(function (s, k) {
      var i = document.createElement('i');
      i.style.left = s + '%';
      i.style.setProperty('--dx', ((s % 7) - 3) * 12 + 'px');
      i.style.animationDuration = (6 + (s % 9)) + 's';
      i.style.animationDelay = (-(s % 11)) + 's';
      i.style.width = i.style.height = (2 + (k % 3)) + 'px';
      em.appendChild(i);
    });
  }

  /* ------------------------------------------------------------ year */
  var yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
