(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'className') node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  /* ---------- Theme ---------- */
  var toggle = $('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---------- Email (kept obfuscated in the HTML source) ---------- */
  $$('.js-email').forEach(function (a) {
    var addr = (a.getAttribute('data-email') || '').replace(/\(dot\)/g, '.').replace(/\(at\)/g, '@').replace(/\s/g, '');
    if (addr.indexOf('@') > 0) a.setAttribute('href', 'mailto:' + addr);
  });

  /* ---------- Nav: border on scroll + active section ---------- */
  var nav = $('.nav');
  function onScroll() { if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window) {
    var links = {};
    $$('.nav-links a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || !links[entry.target.id]) return;
        Object.keys(links).forEach(function (id) { links[id].classList.toggle('is-active', id === entry.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Counters ---------- */
  function runCounter(node) {
    if (node.dataset.counted) return;
    node.dataset.counted = '1';
    var raw = node.getAttribute('data-count');
    var target = parseFloat(raw);
    if (isNaN(target)) return;
    var decimals = (raw.split('.')[1] || '').length;
    var suffix = node.getAttribute('data-suffix') || '';
    if (reduceMotion) { node.textContent = target.toFixed(decimals) + suffix; return; }
    var start = null, duration = 1400;
    function frame(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Reveal on scroll ---------- */
  function settle(node) {
    // Drop reveal classes once shown so hover transitions use the tile's own timing.
    setTimeout(function () { node.classList.remove('reveal', 'is-in'); node.style.transitionDelay = ''; }, 900);
  }
  function show(node, delay) {
    node.style.transitionDelay = delay ? delay + 'ms' : '';
    node.classList.add('is-in');
    $$('[data-count]', node).forEach(runCounter);
    settle(node);
  }
  var revealables = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (entry, i) {
        show(entry.target, Math.min(i, 6) * 70);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (n) { io.observe(n); });
  } else {
    revealables.forEach(function (n) { show(n, 0); });
  }

  /* ---------- Tile spotlight ---------- */
  var pending = null;
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var tile = e.target.closest && e.target.closest('.tile');
    if (!tile) return;
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(function () {
      var r = tile.getBoundingClientRect();
      tile.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      tile.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }, { passive: true });

  /* ---------- Dates & durations ---------- */
  var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  var now = new Date();
  var nowMonth = now.getFullYear() * 12 + now.getMonth();

  function parseRange(text) {
    var re = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})/gi, m, found = [];
    while ((m = re.exec(text || ''))) found.push(parseInt(m[2], 10) * 12 + MONTHS[m[1].toLowerCase()]);
    if (!found.length) return null;
    var present = /present/i.test(text);
    return { start: found[0], end: present ? nowMonth : (found[1] != null ? found[1] : found[0]), present: present };
  }
  function formatDuration(months) {
    var y = Math.floor(months / 12), mo = months % 12, out = [];
    if (y) out.push(y + (y === 1 ? ' yr' : ' yrs'));
    if (mo) out.push(mo + (mo === 1 ? ' mo' : ' mos'));
    return out.join(' ') || '1 mo';
  }

  var dated = $$('[data-dates]').map(function (tile) {
    var range = parseRange(tile.getAttribute('data-dates'));
    if (range) {
      tile._range = range;
      tile._duration = formatDuration(range.end - range.start + 1);
      $$('.role-duration', tile).forEach(function (n) { n.textContent = tile._duration; });
    }
    return tile;
  }).filter(function (t) { return t._range; });

  /* ---------- Detail dialog ---------- */
  var dialog = $('#detail');
  var dialogBody = dialog && $('.detail-body', dialog);
  function openDetail(tile) {
    var tpl = $('template.detail-tpl', tile);
    if (!dialog || !tpl) return;
    dialogBody.innerHTML = '';
    dialogBody.appendChild(tpl.content.cloneNode(true));
    $$('.role-duration', dialogBody).forEach(function (n) { n.textContent = tile._duration || ''; });
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    dialogBody.scrollTop = 0;
  }
  function closeDetail() { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }
  if (dialog) {
    $('.detail-close', dialog).addEventListener('click', closeDetail);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDetail(); });
  }
  $$('.tile-open').forEach(function (btn) {
    btn.addEventListener('click', function () { openDetail(btn.closest('.tile')); });
  });

  /* ---------- Journey timeline ---------- */
  var journey = $('.journey');
  var chart = journey && $('.journey-chart', journey);
  var bars = [];
  if (chart && dated.length) {
    var TRACKS = ['Industry', 'Research & Teaching', 'Education'];
    var minMonth = Math.min.apply(null, dated.map(function (t) { return t._range.start; }));
    var startYear = Math.floor(minMonth / 12);
    var domainStart = startYear * 12;
    var domainEnd = nowMonth + 3;
    var span = domainEnd - domainStart;
    // Recent years get more room (they hold more, shorter roles); tick spacing shows the stretch.
    var pos = function (m) { var u = (m - domainStart) / span; return (u + u * u * u) / 2 * 100; };
    var pct = function (m) { return pos(m).toFixed(3) + '%'; };

    var tip = el('div', { className: 'journey-tip', role: 'tooltip' });
    document.body.appendChild(tip);
    function showTip(bar, x, y) {
      tip.innerHTML = '';
      tip.appendChild(el('strong', { text: bar._title }));
      tip.appendChild(el('span', { text: bar._sub }));
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
      tip.classList.add('is-visible');
    }
    function hideTip() { tip.classList.remove('is-visible'); }

    TRACKS.forEach(function (track) {
      var items = dated.filter(function (t) { return t.getAttribute('data-track') === track; })
        .sort(function (a, b) { return a._range.start - b._range.start; });
      if (!items.length) return;
      var lanes = [];
      items.forEach(function (t) {
        var lane = lanes.find(function (l) { return l.end < t._range.start; });
        if (!lane) { lane = { end: -1, items: [] }; lanes.push(lane); }
        lane.items.push(t);
        lane.end = t._range.end;
      });

      var lanesEl = el('div', { className: 'journey-lanes' });
      lanes.forEach(function (lane) {
        var laneEl = el('div', { className: 'journey-lane' });
        lane.items.forEach(function (t) {
          var titleEl = $('.role-title', t);
          var label = t.getAttribute('data-label');
          var bar = el('button', {
            type: 'button',
            className: 'journey-bar' + (t._range.present ? ' is-now' : ''),
            style: 'left:' + pct(t._range.start) + ';width:' + (pos(t._range.end + 1) - pos(t._range.start)).toFixed(3) + '%;--hue:' + (getComputedStyle(t).getPropertyValue('--hue').trim() || 240),
            'aria-label': (titleEl ? titleEl.textContent + ', ' : '') + label + ', ' + t.getAttribute('data-dates'),
            text: label
          });
          bar._tile = t;
          bar._title = (titleEl ? titleEl.textContent : '') + ' · ' + label;
          bar._sub = t.getAttribute('data-dates') + ' · ' + t._duration;
          bar.addEventListener('mouseenter', function (e) { showTip(bar, e.clientX, bar.getBoundingClientRect().top); });
          bar.addEventListener('mousemove', function (e) { showTip(bar, e.clientX, bar.getBoundingClientRect().top); });
          bar.addEventListener('mouseleave', hideTip);
          bar.addEventListener('focus', function () { var r = bar.getBoundingClientRect(); showTip(bar, r.left + r.width / 2, r.top); });
          bar.addEventListener('blur', hideTip);
          bar.addEventListener('click', function () { hideTip(); openDetail(t); });
          laneEl.appendChild(bar);
          bars.push(bar);
        });
        lanesEl.appendChild(laneEl);
      });
      chart.appendChild(el('div', { className: 'journey-row' }, [
        el('div', { className: 'journey-track-label', text: track }), lanesEl
      ]));
    });

    var ticks = el('div', { className: 'journey-ticks', 'aria-hidden': 'true' });
    var lastTick = -100;
    for (var y = startYear + 1; pos(y * 12) < 97; y++) {
      if (pos(y * 12) - lastTick < 4.5) continue;  // keep labels from colliding where years are compressed
      lastTick = pos(y * 12);
      ticks.appendChild(el('span', { style: 'left:' + pct(y * 12), text: String(y) }));
    }
    chart.appendChild(el('div', { className: 'journey-axis' }, [el('div'), ticks]));
    chart.setAttribute('role', 'group');
    journey.hidden = false;
    // On narrow screens the chart scrolls sideways; start at the most recent roles.
    var journeyScroll = $('.journey-scroll', journey);
    journeyScroll.scrollLeft = journeyScroll.scrollWidth;

    // Bars too narrow for their name fall back to the tile's initials (the tooltip still names them).
    function fitLabels() {
      bars.forEach(function (b) {
        b.textContent = b._tile.getAttribute('data-label');
        b.classList.remove('is-tight');
        b.style.color = '';
        if (b.scrollWidth <= b.clientWidth + 1) return;
        var mono = $('.monogram', b._tile);
        b.innerHTML = mono ? mono.innerHTML : '';
        b.classList.add('is-tight');
        if (b.scrollWidth > b.clientWidth + 1) b.style.color = 'transparent';
      });
    }
    requestAnimationFrame(fitLabels);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLabels);
    var resizeTimer;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitLabels, 150); });
    window.addEventListener('scroll', hideTip, { passive: true });
  }

  /* ---------- Work filters ---------- */
  var chips = $$('.filters .chip');
  var roles = $$('.work-grid .role');
  var empty = $('#work .empty-state');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var key = chip.getAttribute('data-filter');
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var shown = 0;
      roles.forEach(function (r) {
        var match = key === 'all' || (' ' + r.getAttribute('data-area') + ' ').indexOf(' ' + key + ' ') > -1;
        r.classList.toggle('is-hidden', !match);
        if (match) {
          shown++;
          r.classList.remove('reveal');
          r.style.opacity = '';
          if (!reduceMotion && r.animate) r.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(0.22,1,0.36,1)' });
        }
      });
      bars.forEach(function (b) {
        var area = b._tile.getAttribute('data-area');
        var match = key === 'all' || (area && (' ' + area + ' ').indexOf(' ' + key + ' ') > -1);
        b.classList.toggle('is-dim', !match);
      });
      if (empty) empty.hidden = shown > 0;
    });
  });

  /* ---------- Live data (GitHub, Stack Overflow) ---------- */
  function getJSON(url) {
    var key = 'cache:' + url;
    try {
      var hit = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (hit && Date.now() - hit.t < 30 * 60 * 1000) return Promise.resolve(hit.d);
    } catch (e) {}
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (d) {
      try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
      return d;
    });
  }
  function setLive(name, parts) {
    var node = $('.profile[data-live="' + name + '"] .profile-live');
    if (!node) return;
    node.innerHTML = '';
    parts.forEach(function (p) { node.appendChild(el('span', { text: p })); });
  }
  function relTime(iso) {
    var d = new Date(iso), days = Math.round((now - d) / 864e5);
    if (days < 1) return 'today';
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    var months = Math.round(days / 30);
    if (months < 12) return months + (months === 1 ? ' month ago' : ' months ago');
    var years = Math.round(days / 365);
    return years + (years === 1 ? ' year ago' : ' years ago');
  }
  // Repo names like semantic_relationships wrap at _ and - instead of mid-word.
  function breakable(name) {
    var span = el('span');
    name.split(/([_-])/).forEach(function (part) {
      span.appendChild(document.createTextNode(part));
      if (part === '_' || part === '-') span.appendChild(document.createElement('wbr'));
    });
    return span;
  }
  var LANG = { Python: '#3572A5', TypeScript: '#3178c6', JavaScript: '#f1e05a', HTML: '#e34c26', Java: '#b07219', 'C#': '#178600', Scala: '#c22d40', Shell: '#89e051', 'Jupyter Notebook': '#DA5B0B', R: '#198CE7' };

  var liveRepos = $('.live-repos');
  var ghUser = liveRepos && liveRepos.getAttribute('data-github');
  if (ghUser && window.fetch) {
    getJSON('https://api.github.com/users/' + ghUser).then(function (u) {
      setLive('github', [u.public_repos + ' public repos', u.followers + ' followers']);
    }).catch(function () {});

    getJSON('https://api.github.com/users/' + ghUser + '/repos?per_page=100&sort=pushed').then(function (repos) {
      var site = (ghUser + '.github.io').toLowerCase();
      var picks = repos.filter(function (r) {
        return !r.fork && !r.archived && r.description && r.description.length > 25 && r.name.toLowerCase() !== site;
      }).slice(0, 6);
      if (!picks.length) return;
      var grid = $('.repo-grid', liveRepos);
      picks.forEach(function (r) {
        var meta = el('p', { className: 'repo-meta' });
        if (r.language) meta.appendChild(el('span', {}, [el('i', { className: 'lang-dot', style: 'background:' + (LANG[r.language] || 'var(--muted)') }), document.createTextNode(r.language)]));
        if (r.stargazers_count) meta.appendChild(el('span', {}, [el('i', { className: 'fa-regular fa-star', 'aria-hidden': 'true' }), document.createTextNode(String(r.stargazers_count))]));
        meta.appendChild(el('span', { text: 'Updated ' + relTime(r.pushed_at) }));
        grid.appendChild(el('a', { className: 'tile repo', href: r.html_url, target: '_blank', rel: 'noopener', style: '--hue:' + (200 + grid.children.length * 28) }, [
          el('h4', {}, [el('i', { className: 'fa-solid fa-book-bookmark', 'aria-hidden': 'true' }), breakable(r.name)]),
          el('p', { text: r.description }),
          meta,
          el('span', { className: 'tile-arrow', 'aria-hidden': 'true' }, [el('i', { className: 'fa-solid fa-arrow-up-right-from-square' })])
        ]));
      });
      liveRepos.hidden = false;
    }).catch(function () {});
  }

  var soTile = $('.profile[data-live="stackoverflow"]');
  var soMatch = soTile && soTile.getAttribute('href').match(/users\/(\d+)/);
  if (soMatch && window.fetch) {
    getJSON('https://api.stackexchange.com/2.3/users/' + soMatch[1] + '?site=stackoverflow').then(function (d) {
      var u = d.items && d.items[0];
      if (!u) return;
      var b = u.badge_counts || {};
      setLive('stackoverflow', [u.reputation.toLocaleString() + ' reputation', b.gold + ' gold · ' + b.silver + ' silver · ' + b.bronze + ' bronze']);
    }).catch(function () {});
  }

  /* ---------- Footer year ---------- */
  $$('.js-year').forEach(function (n) { n.textContent = now.getFullYear(); });
})();
