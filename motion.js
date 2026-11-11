/* Interactive motion for the lower half of the homepage (founder, 11 Nov 2026:
   "the bottom part more motion graphics and animation, and even interactive").
   Progressive enhancement only: without this file every tile is the finished
   still picture. Under Reduce Motion nothing here moves; the language chips
   still work as buttons, because choosing one changes state without motion.
   Pointer effects (tilt, magnifier follow, parallax, magnet) are for a mouse
   or trackpad only. Loops run only while their tile is on screen.
   NO CLAIMS LIVE HERE: the greetings are the word "hello" in each language,
   not app output, and nothing below adds a sentence about what the app does. */
(() => {
  const motion = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const svgNS = 'http://www.w3.org/2000/svg';
  /* While the promo film is open (promo.js), every loop here stops so the film
     gets the whole screen's effort; they carry on when it closes. */
  let filmOpen = false;
  const resync = new Set();
  document.addEventListener('pharmasnap:promo', e => { filmOpen = !!(e.detail && e.detail.open); resync.forEach(fn => fn()); });
  const watch = (el, cb, threshold = 0.3) => {
    const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), {threshold});
    io.observe(el);
  };
  /* A repeating step that only runs while its element is on screen and the tab is shown. */
  const every = (ms, el, fn) => {
    let timer = 0, seen = false, held = false;
    const sync = () => {
      const run = seen && !held && !document.hidden && !filmOpen;
      if (run && !timer) timer = setInterval(fn, ms);
      if (!run && timer) { clearInterval(timer); timer = 0; }
    };
    watch(el, v => { seen = v; sync(); });
    document.addEventListener('visibilitychange', sync);
    resync.add(sync);
    return {hold(h) { held = h; sync(); }};
  };
  /* Pointer position over an element, at most once a frame. */
  const track = (el, fn) => {
    let raf = 0, last;
    el.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      last = e;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        fn((last.clientX - r.left) / r.width, (last.clientY - r.top) / r.height, last, r);
      });
    });
  };

  /* 1. LANGUAGES. Each chip becomes a button; choosing one says "hello" in that
     language over the globe. The waveform talks for the 24 read aloud and lies
     flat for the 6 shown on screen only. On screen, it steps through all 30. */
  const GREETING = {
    en: 'Hello', vi: 'Xin chào', zh: '你好', es: 'Hola', ko: '안녕하세요', hi: 'नमस्ते',
    fil: 'Kumusta', it: 'Ciao', ar: 'مرحبا', fr: 'Bonjour', de: 'Hallo', el: 'Γεια σας',
    pt: 'Olá', ru: 'Здравствуйте', ja: 'こんにちは', th: 'สวัสดี', tr: 'Merhaba', ta: 'வணக்கம்',
    id: 'Halo', ne: 'नमस्ते', ur: 'السلام علیکم', fa: 'سلام', pl: 'Dzień dobry', uk: 'Вітаю',
    pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', bn: 'নমস্কার', km: 'សួស្តី', my: 'မင်္ဂလာပါ', si: 'ආයුබෝවන්', sm: 'Tālofa',
  };
  const lists = document.querySelector('.lang-lists');
  const numeral = document.getElementById('languages');
  if (lists && numeral) {
    const tile = lists.closest('.tile');
    const say = document.createElement('p');
    say.className = 'lang-say'; say.hidden = true; say.setAttribute('aria-hidden', 'true');
    const sayText = document.createElement('span'); sayText.className = 'lang-say-text';
    const sayNote = document.createElement('span'); sayNote.className = 'lang-say-note';
    say.append(sayText, sayNote);
    const live = document.createElement('p'); live.className = 'sr'; live.setAttribute('aria-live', 'polite');
    tile.append(say, live);
    const buttons = [...lists.querySelectorAll('li[lang]')].map(li => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip-btn'; b.lang = li.lang; if (li.dir) b.dir = li.dir;
      b.textContent = li.textContent; b.setAttribute('aria-pressed', 'false');
      b.dataset.spoken = li.closest('[data-lang-list]').dataset.langList === 'spoken' ? '1' : '';
      li.textContent = ''; li.classList.add('has-btn'); li.append(b);
      return b;
    });
    let at = -1, cycle = null;
    const show = (i, byPerson) => {
      const b = buttons[i], spoken = !!b.dataset.spoken, word = GREETING[b.lang.split('-')[0]] || '';
      at = i;
      for (const x of buttons) x.setAttribute('aria-pressed', String(x === b));
      sayText.textContent = word; sayText.lang = b.lang; sayText.dir = b.dir || 'ltr';
      sayNote.textContent = spoken ? 'Read aloud' : 'On screen only';
      say.hidden = false; say.classList.toggle('is-silent', !spoken);
      numeral.classList.toggle('is-talking', spoken); numeral.classList.toggle('is-silent', !spoken);
      if (motion) say.animate([{opacity: .4, scale: .86}, {opacity: 1, scale: 1}], {duration: 420, easing: 'cubic-bezier(.16,1,.3,1)'});
      if (byPerson) live.textContent = `${b.textContent}: ${word}. ${spoken ? 'Read aloud and shown on screen.' : 'Shown on screen only.'}`;
    };
    buttons.forEach((b, i) => b.addEventListener('click', () => { if (cycle) cycle.hold(true); show(i, true); }));
    if (motion) {
      cycle = every(1700, tile, () => show((at + 1) % buttons.length));
      watch(tile, v => { if (v && at < 0) show(0); });
    }
  }

  if (!motion) return;

  /* 2. WHAT YOU CAN PHOTOGRAPH. A spotlight moves from object to object; the
     mouse takes it over, snapping to the nearest object. On phones the four
     crops take turns instead. */
  const lineup = document.querySelector('.t-lineup');
  if (lineup) {
    const items = [...lineup.querySelectorAll('.labels li')];
    const xs = items.map(li => parseFloat(li.style.getPropertyValue('--x')) || 50);
    const spot = document.createElement('span'); spot.className = 'spot'; spot.setAttribute('aria-hidden', 'true');
    lineup.querySelector('.labels').before(spot);
    let at = -1;
    const focus = i => {
      if (i === at) return;
      at = i; lineup.style.setProperty('--sx', `${xs[i]}%`); lineup.classList.add('is-spot');
      items.forEach((li, k) => li.classList.toggle('is-on', k === i));
    };
    const cycle = every(2200, lineup, () => focus((at + 1) % items.length));
    watch(lineup, v => { if (v && at < 0) focus(0); });
    track(lineup, x => {
      if (innerWidth <= 734) return;
      let best = 0;
      xs.forEach((v, k) => { if (Math.abs(v - x * 100) < Math.abs(xs[best] - x * 100)) best = k; });
      cycle.hold(true); focus(best);
    });
    lineup.addEventListener('pointerleave', () => cycle.hold(false));
    items.forEach((li, k) => li.addEventListener('click', () => focus(k)));
  }

  /* 3. HEALTH DOCUMENTS. A magnifier glides over the illustration; the mouse
     steers it, a tap moves it there for a moment. */
  const host = document.querySelector('.docs-lens-host');
  if (host) {
    const img = host.querySelector('img'), lens = host.querySelector('.lens'), ZOOM = 2.2;
    let x = .5, y = .5, tx = .5, ty = .5, steering = 0, shown = false, raf = 0, t0 = performance.now();
    const paint = () => { lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`; };
    if (img.complete) paint(); else img.addEventListener('load', paint, {once: true});
    const frame = now => {
      raf = 0;
      if (!shown || filmOpen) return;
      if (now > steering) {
        const t = (now - t0) / 1000;
        tx = .5 + .3 * Math.sin(t * .5); ty = .5 + .22 * Math.sin(t * .83 + 1);
      }
      x += (tx - x) * .12; y += (ty - y) * .12;
      const w = img.clientWidth, h = img.clientHeight, size = lens.offsetWidth;
      lens.style.translate = `${x * w - size / 2}px ${y * h - size / 2}px`;
      lens.style.backgroundSize = `${w * ZOOM}px ${h * ZOOM}px`;
      lens.style.backgroundPosition = `${size / 2 - x * w * ZOOM}px ${size / 2 - y * h * ZOOM}px`;
      raf = requestAnimationFrame(frame);
    };
    const run = () => { if (shown && !filmOpen && !raf) raf = requestAnimationFrame(frame); };
    resync.add(run);
    watch(host, v => { shown = v; host.classList.toggle('is-lens', v); run(); }, 0.15);
    document.addEventListener('visibilitychange', () => { shown = !document.hidden && host.classList.contains('is-lens'); run(); });
    const steer = (e, hold) => {
      const r = img.getBoundingClientRect();
      tx = clamp((e.clientX - r.left) / r.width, 0, 1); ty = clamp((e.clientY - r.top) / r.height, 0, 1);
      steering = performance.now() + hold;
    };
    /* A mouse keeps the lens for as long as it is over the picture; a tap holds it for a moment. */
    host.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { steer(e, Infinity); host.classList.add('is-steer'); } });
    host.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') steer(e, 2500); });
    host.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse') return;
      host.classList.remove('is-steer'); steering = 0; t0 = performance.now() - 3000;
    });
  }

  /* 4. THREADS. A spark runs along each joining line: photos into the summary,
     your record into the answer, the number down to its source. */
  for (const [i, path] of [...document.querySelectorAll('.sum .link, .me .link, .thread .line')].entries()) {
    const spark = path.cloneNode(false);
    spark.setAttribute('class', 'spark'); spark.setAttribute('pathLength', '1');
    spark.style.animationDelay = `${(i % 3) * .5}s`;
    path.after(spark);
  }

  /* 5. THE MAP. Ripples spread from the nearest pharmacy, pins bob, and the
     street layers part slightly under the mouse. */
  const map = document.querySelector('.map');
  if (map) {
    const pulse = map.querySelector('.pulse');
    for (const d of [0, 1, 2]) {
      const ring = pulse.cloneNode(false);
      ring.setAttribute('class', 'ripple'); ring.style.animationDelay = `${d}s`;
      pulse.before(ring);
    }
    map.querySelectorAll('.pin-g, .pin-near').forEach((pin, i) => {
      const bob = document.createElementNS(svgNS, 'g');
      bob.setAttribute('class', 'bob'); bob.style.animationDelay = `${i * .35}s`;
      bob.append(...pin.childNodes); pin.append(bob);
    });
    const layer = (name, from, to) => {
      const g = document.createElementNS(svgNS, 'g'); g.setAttribute('class', name);
      from.before(g);
      let n = from;
      while (n) { const next = n.nextSibling; g.append(n); if (n === to) break; n = next; }
    };
    layer('layer-far', map.querySelector('.roads-minor'), map.querySelector('.park'));
    layer('layer-near', map.querySelector('.you'), map.querySelector('.pin-near'));
    const box = map.closest('.map-box');
    track(box, (px, py) => { box.style.setProperty('--mx', (px * 2 - 1).toFixed(3)); box.style.setProperty('--my', (py * 2 - 1).toFixed(3)); });
    box.addEventListener('pointerleave', () => { box.style.setProperty('--mx', 0); box.style.setProperty('--my', 0); });
  }

  /* 6. SPEAK OR TYPE. The sphere looks toward the mouse; the question types
     itself out while the voice bars move. The full question stays in the
     page for screen readers the whole time. */
  const ask = document.querySelector('.t-ask');
  if (ask) {
    const orb = ask.querySelector('.ask-orb');
    const band = ask.closest('.band') || ask;
    if (fine && orb) {
      band.addEventListener('pointermove', e => {
        const r = orb.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 360) * 12;
        orb.style.setProperty('--ox', `${(dx / d * k).toFixed(1)}px`); orb.style.setProperty('--oy', `${(dy / d * k).toFixed(1)}px`);
      });
      band.addEventListener('pointerleave', () => { orb.style.setProperty('--ox', '0px'); orb.style.setProperty('--oy', '0px'); });
    }
    const bubble = ask.querySelector('.bubble'), label = bubble && bubble.querySelector('.sr');
    if (bubble && label) {
      const textNodes = [...bubble.childNodes].filter(n => n.nodeType === 3);
      const question = textNodes.map(n => n.textContent).join('').trim();
      textNodes.forEach(n => n.remove());
      label.textContent = `${label.textContent.trim()} ${question}`;
      const shown = document.createElement('span'); shown.setAttribute('aria-hidden', 'true');
      const typed = document.createElement('span'); typed.className = 'typed'; typed.textContent = question;
      const ghost = document.createElement('span'); ghost.className = 'ghost';
      shown.append(typed, ghost); bubble.append(shown);
      let n = question.length, pause = 0;
      const step = () => {
        if (pause > 0) { pause--; return; }
        if (n >= question.length) { n = 0; ask.classList.add('is-listening'); }
        else n++;
        typed.textContent = question.slice(0, n); ghost.textContent = question.slice(n);
        if (n >= question.length) { ask.classList.remove('is-listening'); pause = 60; }
      };
      every(60, ask, step);
    }
  }

  /* 7. SCAN. The mouse moves the scan plane across the picture. */
  const scan = document.querySelector('.scan-feature');
  if (scan && fine) {
    track(scan, px => { scan.style.setProperty('--sx', `${(px * 100).toFixed(1)}%`); scan.classList.add('is-manual'); });
    scan.addEventListener('pointerleave', () => scan.classList.remove('is-manual'));
  }

  /* 8. TILT. Tiles lean toward the mouse with a soft glare. Not the emergency
     tile, and not the two tiles that already follow the mouse. */
  if (fine) {
    for (const t of document.querySelectorAll('.band .tile:not(.t-sos):not(.t-lineup):not(.t-docs), .pfs-preview-card')) {
      const glare = document.createElement('span'); glare.className = 'glare'; glare.setAttribute('aria-hidden', 'true');
      t.append(glare); t.classList.add('is-tiltable');
      track(t, (px, py, e, r) => {
        const amp = clamp(560 / r.width * 5, 1.5, 5);
        t.style.setProperty('--ry', `${((px - .5) * amp).toFixed(2)}deg`); t.style.setProperty('--rx', `${((.5 - py) * amp).toFixed(2)}deg`);
        t.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`); t.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
        t.classList.add('is-tilt');
      });
      t.addEventListener('pointerleave', () => { t.classList.remove('is-tilt'); t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); });
    }
  }

  /* 9. CLOSING. The three words light up in turn; a glow follows the mouse and
     the logo and badge lean toward it. */
  const closing = document.querySelector('.closing');
  if (closing) {
    const h2 = closing.querySelector('h2');
    const words = h2.textContent.trim().split(/\s+/);
    h2.textContent = '';
    words.forEach((w, i) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; h2.append(s); if (i < words.length - 1) h2.append(' '); });
    if (fine) {
      const glow = document.createElement('span'); glow.className = 'closing-glow'; glow.setAttribute('aria-hidden', 'true');
      closing.prepend(glow);
      const pulls = [[closing.querySelector('.mark'), 14], [closing.querySelector('.store-badge'), 10]].filter(([el]) => el);
      track(closing, (px, py, e, r) => {
        closing.style.setProperty('--cx', `${e.clientX - r.left}px`); closing.style.setProperty('--cy', `${e.clientY - r.top}px`);
        closing.classList.add('is-glow');
        for (const [el, max] of pulls) {
          const b = el.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
          const near = Math.hypot(dx, dy) < 240;
          el.style.setProperty('--mgx', `${near ? clamp(dx * .12, -max, max).toFixed(1) : 0}px`);
          el.style.setProperty('--mgy', `${near ? clamp(dy * .12, -max, max).toFixed(1) : 0}px`);
        }
      });
      closing.addEventListener('pointerleave', () => {
        closing.classList.remove('is-glow');
        for (const [el] of pulls) { el.style.setProperty('--mgx', '0px'); el.style.setProperty('--mgy', '0px'); }
      });
    }
  }
})();
