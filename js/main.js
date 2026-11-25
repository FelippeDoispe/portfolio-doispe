(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- cover: the head that follows the pointer ---------- */
  const cover = document.querySelector('.cover');
  const face = document.querySelector('.face');
  const faceInner = face && face.querySelector('.face__inner');
  const imgs = face ? [...face.querySelectorAll('img')] : [];
  let set = 'oculos';
  let pose = 'frente';
  let spinning = false;

  function show(nextPose, nextSet = set) {
    if (nextPose === pose && nextSet === set) return;
    pose = nextPose; set = nextSet;
    imgs.forEach((im) => im.classList.toggle('is-on', im.dataset.set === set && im.dataset.pose === pose));
  }

  // the no-glasses set loads once the page is idle
  const loadSecondSet = () => imgs.forEach((im) => { if (im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); } });
  window.addEventListener('load', () => ('requestIdleCallback' in window ? requestIdleCallback(loadSecondSet) : setTimeout(loadSecondSet, 600)));

  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  let lastMove = 0;

  function poseFor(dx, dy) {
    if (Math.hypot(dx, dy) < 0.16) return 'frente';
    if (Math.abs(dx) > Math.abs(dy) * 0.85) return dx > 0 ? 'direita' : 'esquerda';
    return dy < 0 ? 'cima' : 'baixo';
  }

  function aim(clientX, clientY) {
    const r = face.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.45)));
    const dy = Math.max(-1, Math.min(1, (clientY - (r.top + r.height / 2)) / (window.innerHeight * 0.45)));
    target.x = dx; target.y = dy;
    if (!spinning) show(poseFor(dx, dy));
  }

  if (face) {
    window.addEventListener('pointermove', (e) => { lastMove = performance.now(); aim(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('pointerdown', (e) => { lastMove = performance.now(); aim(e.clientX, e.clientY); }, { passive: true });

    const tick = () => {
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      if (!reduce.matches && faceInner) {
        faceInner.style.transform =
          `translate3d(${(cur.x * 12).toFixed(2)}px, ${(cur.y * 8).toFixed(2)}px, 0) rotateY(${(cur.x * 12).toFixed(2)}deg) rotateX(${(-cur.y * 8).toFixed(2)}deg)`;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // nobody moving the pointer (or a phone): he looks around by himself, and comes back to the cover pose
    const spots = [[0, 0], [0.7, -0.1], [0, 0], [-0.7, 0.05], [0.1, -0.6], [0, 0], [0, 0.6], [0.6, 0.4], [0, 0]];
    let spot = 0;
    setInterval(() => {
      if (spinning || reduce.matches) return;
      if (performance.now() - lastMove < 3500) return;
      if (cover && cover.getBoundingClientRect().bottom < 0) return;
      spot = (spot + 1) % spots.length;
      const [x, y] = spots[spot];
      target.x = x; target.y = y;
      show(poseFor(x, y));
    }, 1500);

    // click: a full turn, and the glasses come off (or back on)
    face.addEventListener('click', () => {
      if (spinning) return;
      const nextSet = set === 'oculos' ? 'olhos' : 'oculos';
      if (reduce.matches) { show('frente', nextSet); return; }
      spinning = true;
      const seq = [['esquerda', set], ['costas', set], ['direita', nextSet], ['frente', nextSet]];
      let i = 0;
      const step = () => {
        show(seq[i][0], seq[i][1]);
        i += 1;
        if (i < seq.length) setTimeout(step, 110);
        else setTimeout(() => { spinning = false; }, 400);
      };
      step();
    });
  }

  /* ---------- the nav pill turns blue with the page ---------- */
  const pill = document.querySelector('.pill');
  const firstBlue = document.querySelector('.work');
  if (pill && firstBlue) {
    // which menu item the reader is in: thumbs, motion and Super Clássico count as projetos
    const spots = [['#sobre', 'sobre'], ['#projetos', 'projetos'], ['#camisas', 'camisas'], ['#contato', 'contato']]
      .map(([sel, key]) => [document.querySelector(sel), pill.querySelector(`a[href="#${key}"]`)])
      .filter(([sec, a]) => sec && a);
    const tone = () => {
      const line = window.innerHeight * 0.6;
      pill.classList.toggle('tone-blue', firstBlue.getBoundingClientRect().top < line);
      let on = null;
      spots.forEach(([sec, a]) => { if (sec.getBoundingClientRect().top < line) on = a; });
      spots.forEach(([, a]) => { if (a === on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    };
    window.addEventListener('scroll', tone, { passive: true });
    tone();
  }

  /* ---------- about: 3D <-> real photo ---------- */
  const swap = document.querySelector('.swap');
  if (swap) {
    const btn = swap.querySelector('.swap__toggle');
    let auto = !reduce.matches;
    let timer = null;
    const setState = (state) => {
      swap.dataset.state = state;
      btn.setAttribute('aria-pressed', String(state === 'real'));
      btn.textContent = state === 'real' ? 'ver o boneco 3D' : 'ver a foto real';
      if (!reduce.matches) {
        swap.classList.remove('is-flashing');
        void swap.offsetWidth;
        swap.classList.add('is-flashing');
      }
    };
    const toggle = () => setState(swap.dataset.state === 'real' ? '3d' : 'real');
    btn.addEventListener('click', () => { auto = false; clearInterval(timer); toggle(); });
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        clearInterval(timer);
        if (en.isIntersecting && auto) timer = setInterval(toggle, 2800);
      });
    }, { threshold: 0.4 }).observe(swap);
  }

  /* ---------- copy the e-mail (mail links may not open inside a published page) ---------- */
  document.querySelectorAll('[data-copy]').forEach((b) => {
    const label = b.textContent;
    b.addEventListener('click', () => {
      const done = (msg) => { b.textContent = msg; setTimeout(() => { b.textContent = label; }, 1800); };
      const fallback = () => {
        const el = b.parentElement.querySelector('.contact__mail');
        const r = document.createRange(); r.selectNodeContents(el);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        done('selecionado, é só copiar');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(b.dataset.copy).then(() => done('copiado'), fallback);
      } else fallback();
    });
  });

  /* ---------- videos that play everywhere ---------- */
  // iPhones only play a video from a server that answers byte ranges, and the published page's
  // host does not. The first clip is probed once; if ranges are refused, each clip is fetched whole
  // when it is needed and played from memory (they are small, under 1.5 MB each).
  const clipVids = [...document.querySelectorAll('.clip video')];
  clipVids.forEach((v) => { v.dataset.src = v.getAttribute('src'); });
  let rangesOK = null;
  const probeRanges = () => {
    if (rangesOK) return rangesOK;
    const first = clipVids[0] && clipVids[0].dataset.src;
    if (!first || !window.fetch) return (rangesOK = Promise.resolve(true));
    const ctl = 'AbortController' in window ? new AbortController() : null;
    // no-store: a cached copy would answer the range itself and hide what the server does
    rangesOK = fetch(first, { headers: { Range: 'bytes=0-1' }, cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then((r) => { if (ctl) ctl.abort(); return r.status === 206; })
      .catch(() => true);
    return rangesOK;
  };
  const blobs = new Map();
  const asBlob = (src) => {
    if (!blobs.has(src)) {
      blobs.set(src, fetch(src)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
        .then((b) => URL.createObjectURL(b)));
    }
    return blobs.get(src);
  };
  // give a video a source this browser can play, then play it
  const playVideo = (v, src) => probeRanges()
    .then((ok) => (ok ? src : asBlob(src)))
    .then((url) => {
      const abs = new URL(url, location.href).href;
      if (v.src !== abs) v.src = url;
    })
    .catch(() => { if (!v.getAttribute('src')) v.src = src; })
    .then(() => v.play())
    .catch(() => {});

  /* ---------- lightbox ---------- */
  const dlg = document.querySelector('.lightbox');
  let openLightbox = () => {};
  let openLightboxVideo = () => {};
  if (dlg && typeof dlg.showModal === 'function') {
    const big = document.createElement('img');
    big.className = 'lightbox__img';
    const vid = document.createElement('video');
    vid.className = 'lightbox__video';
    vid.controls = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
    big.hidden = true; vid.hidden = true;
    dlg.append(big, vid);
    openLightbox = (src, alt) => { dlg.classList.remove('is-tall'); vid.pause(); vid.hidden = true; big.hidden = false; big.src = src; big.alt = alt || ''; dlg.showModal(); };
    openLightboxVideo = (src, label, tall, poster) => {
      big.hidden = true; vid.hidden = false;
      dlg.classList.toggle('is-tall', !!tall);
      vid.pause(); vid.removeAttribute('src'); vid.load();
      if (poster) vid.poster = poster; else vid.removeAttribute('poster');
      vid.setAttribute('aria-label', label || '');
      dlg.showModal();
      playVideo(vid, src);
    };
    dlg.addEventListener('close', () => vid.pause());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- Super Clássico ---------- */
  // the two posters open big
  document.querySelectorAll('.poster__btn').forEach((b) => {
    b.addEventListener('click', () => {
      const im = b.querySelector('img');
      openLightbox(b.dataset.full, im ? im.alt : '');
    });
  });
  // the jerseys lean toward the pointer (the slow turn itself is CSS)
  document.querySelectorAll('.kit__stage').forEach((stage) => {
    const tilt = stage.querySelector('.kit__tilt');
    if (!tilt || reduce.matches) return;
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty('--tx', `${(x * 30).toFixed(1)}deg`);
      tilt.style.setProperty('--ty', `${(-y * 18).toFixed(1)}deg`);
    });
    stage.addEventListener('pointerleave', () => { tilt.style.removeProperty('--tx'); tilt.style.removeProperty('--ty'); });
  });
  // the line-up conveyor: copy the cards once so the loop has no seam
  const elenco = document.querySelector('.elenco');
  if (elenco && !reduce.matches) {
    const track = elenco.querySelector('.elenco__track');
    [...track.children].forEach((li) => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('img').forEach((im) => { im.alt = ''; });
      track.append(c);
    });
    elenco.classList.add('is-running');
  }

  /* ---------- motion: clips play while on screen, a click opens them big ---------- */
  if (clipVids.length && !reduce.matches && 'IntersectionObserver' in window) {
    const vo = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) playVideo(en.target, en.target.dataset.src); else en.target.pause(); });
    }, { threshold: 0.35 });
    clipVids.forEach((v) => vo.observe(v));
  }
  document.querySelectorAll('.clip__btn').forEach((b) => {
    const v = b.querySelector('video');
    b.addEventListener('click', () => openLightboxVideo(b.dataset.video, b.getAttribute('aria-label'), b.dataset.tall, v ? v.getAttribute('poster') : ''));
  });

  /* ---------- thumbnails: dates read like YouTube's, "há 3 dias" ---------- */
  document.querySelectorAll('.yt time[datetime]').forEach((t) => {
    const then = new Date(`${t.getAttribute('datetime')}T12:00:00`);
    const days = Math.floor((Date.now() - then) / 864e5);
    if (!(days >= 0)) return;
    const say = (n, one, many) => `há ${n} ${n === 1 ? one : many}`;
    t.textContent = days < 1 ? 'hoje'
      : days < 7 ? say(days, 'dia', 'dias')
      : days < 30 ? say(Math.floor(days / 7), 'semana', 'semanas')
      : days < 365 ? say(Math.floor(days / 30), 'mês', 'meses')
      : say(Math.floor(days / 365), 'ano', 'anos');
  });

  /* ---------- identidades: the slides pass sideways, each one in its own brand ---------- */
  const ids = document.querySelector('[data-ids]');
  if (ids) {
    const track = ids.querySelector('.ids__track');
    const vp = ids.querySelector('.ids__viewport');
    const slides = [...track.children];
    const tabs = [...ids.querySelectorAll('.ids__tab')];
    const pauseBtn = ids.querySelector('.ids__pause');
    const DELAY = 7000;
    let cur = 0;
    let timer = null;
    let playing = !reduce.matches;
    let inView = false;
    let held = false;   // pointer over it or focus inside

    const restart = () => {
      clearTimeout(timer);
      ids.classList.remove('is-timing');
      if (playing && inView && !held) {
        void ids.offsetWidth;   // restart the tab's countdown bar
        ids.classList.add('is-timing');
        timer = setTimeout(() => go(cur + 1), DELAY);
      }
    };
    const setPlaying = (on) => {
      playing = on;
      pauseBtn.textContent = on ? 'pausar' : 'passar sozinho';
      pauseBtn.setAttribute('aria-pressed', String(!on));
      restart();
    };
    const go = (n, focusTab) => {
      cur = (n + slides.length) % slides.length;
      ids.dataset.active = String(cur);
      track.style.setProperty('--i', cur);
      slides.forEach((s, k) => { const on = k === cur; s.classList.toggle('is-active', on); s.inert = !on; });
      tabs.forEach((t, k) => { const on = k === cur; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      if (focusTab) tabs[cur].focus();
      fit();
      restart();
    };
    // on phones and tablets the window takes the height of the slide on show, so a short slide
    // leaves no empty band; on wider screens every slide keeps one height and nothing below jumps
    const narrow = window.matchMedia('(max-width: 960px)');
    // grow at once; shrink only after the slide has finished passing, so nothing is cut mid-way
    let fitTimer = null;
    function fit() {
      clearTimeout(fitTimer);
      if (!narrow.matches) { vp.style.height = ''; return; }
      const set = () => { vp.style.height = `${slides[cur].offsetHeight}px`; };
      if (reduce.matches || slides[cur].offsetHeight >= vp.offsetHeight) set();
      else fitTimer = setTimeout(set, 900);
    }
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => fit());
      slides.forEach((s) => ro.observe(s));
    }
    window.addEventListener('resize', fit);

    tabs.forEach((t, k) => {
      t.addEventListener('click', () => { setPlaying(false); go(k); });
      t.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); setPlaying(false); go(e.key === 'Home' ? 0 : slides.length - 1, true); }
        else if (step) { e.preventDefault(); setPlaying(false); go(cur + step, true); }
      });
    });
    ids.querySelectorAll('.ids__arrow').forEach((b) => b.addEventListener('click', () => { setPlaying(false); go(cur + Number(b.dataset.step)); }));
    pauseBtn.addEventListener('click', () => setPlaying(!playing));
    if (reduce.matches) setPlaying(false);

    // hold still while someone looks at it or works inside it
    ids.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { held = true; restart(); } });
    ids.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { held = false; restart(); } });
    ids.addEventListener('focusin', () => { held = true; restart(); });
    ids.addEventListener('focusout', (e) => { if (!ids.contains(e.relatedTarget)) { held = false; restart(); } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { inView = en.isIntersecting; restart(); }, { threshold: 0.4 }).observe(vp);
    }

    // swipe or drag sideways
    let x0 = null;
    let y0 = 0;
    let dx = 0;
    let dragged = false;
    vp.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      x0 = e.clientX; y0 = e.clientY; dx = 0; dragged = false;
    });
    vp.addEventListener('pointermove', (e) => {
      if (x0 === null) return;
      dx = e.clientX - x0;
      const dy = e.clientY - y0;
      if (!dragged && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { x0 = null; return; }   // the page is scrolling
      if (!dragged && Math.abs(dx) > 10) {
        dragged = true;
        ids.classList.add('is-dragging');
        try { vp.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
      }
      if (dragged) track.style.setProperty('--dx', `${dx}px`);
    });
    const release = () => {
      if (x0 === null) return;
      x0 = null;
      ids.classList.remove('is-dragging');
      track.style.setProperty('--dx', '0px');
      if (dragged && Math.abs(dx) > vp.clientWidth * 0.12) { setPlaying(false); go(cur + (dx < 0 ? 1 : -1)); }
    };
    vp.addEventListener('pointerup', release);
    vp.addEventListener('pointercancel', release);
    vp.addEventListener('click', (e) => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);

    // the pictures open big
    ids.querySelectorAll('.idc__shot').forEach((b) => {
      b.addEventListener('click', () => {
        const im = b.querySelector('img');
        openLightbox(b.dataset.full, im ? im.alt : '');
      });
    });

    go(0);
  }

  // the project viewer is wired at the end; the shirts' "ver as fotos" uses it too
  let openViewer = () => {};

  /* ---------- camisas: the ring vitrine ---------- */
  const vit = document.querySelector('.vitrine');
  if (vit) {
    const ring = vit.querySelector('.ring');
    const items = [...vit.querySelectorAll('.ring__item')];
    const btns = items.map((li) => li.querySelector('.ring__btn'));
    const label = vit.querySelector('.ring__label strong');
    const N = items.length;
    let rot = 0, goal = 0, front = 0, running = false, lastTouch = 0;

    const mod = (n) => ((n % N) + N) % N;

    function layout() {
      const W = ring.clientWidth;
      const R = Math.min(W * 0.36, 560);
      items.forEach((el, i) => {
        const a = ((i - rot) / N) * Math.PI * 2;
        const x = Math.sin(a) * R;
        const d = (Math.cos(a) + 1) / 2;           // 1 at the front, 0 at the back
        const s = 0.5 + 0.5 * d;
        const y = -(1 - d) * W * 0.05;              // the back of the ring sits a little higher
        el.style.transform = `translateX(-50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
        el.style.zIndex = String(Math.round(d * 100));
        el.style.opacity = (0.45 + 0.55 * d).toFixed(3);
      });
      const f = mod(Math.round(rot));
      if (f !== front) { front = f; label.textContent = items[f].querySelector('.ring__name').textContent; }
      btns.forEach((b, i) => {
        b.tabIndex = i === front ? 0 : -1;
        b.setAttribute('aria-label', i === front
          ? `${items[i].querySelector('.ring__name').textContent}: ver a história da camisa`
          : `Girar até ${items[i].querySelector('.ring__name').textContent}`);
      });
    }

    // timed by the clock, not by frames, so a phone in low-power mode (30 fps) spins just as fast
    // The spin is the point of the vitrine, so it turns even with Reduce Motion on, only slower:
    // a slow sideways drift, no zoom or parallax. On screen is measured each frame (an observer
    // inside an app's browser can stay silent), and a long frame still moves it the right amount.
    let lastT = 0;
    function loop(t) {
      if (vit.dataset.view !== 'ring') { running = false; return; }
      const dt = Math.min(0.25, Math.max(0, (t - lastT) / 1000)); lastT = t;
      const box = ring.getBoundingClientRect();
      const seen = box.bottom > 0 && box.top < (window.innerHeight || document.documentElement.clientHeight);
      const idle = !dragging && t - lastTouch > 2500 && seen;
      if (idle) goal += (reduce.matches ? 0.16 : 0.32) * dt;        // a shirt every 3 s (6 s with Reduce Motion)
      rot += (goal - rot) * (1 - Math.exp(-(reduce.matches ? 5 : 8) * dt));
      layout();
      requestAnimationFrame(loop);
    }
    const start = () => { if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(loop); } };

    function setView(v) {
      vit.dataset.view = v;
      vit.querySelectorAll('[data-set-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setView === v)));
      if (v === 'ring') { start(); }
      else { items.forEach((el) => { el.style.transform = ''; el.style.zIndex = ''; el.style.opacity = ''; }); btns.forEach((b) => { b.tabIndex = 0; b.removeAttribute('aria-label'); }); }
    }
    vit.querySelectorAll('[data-set-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.setView)));

    const goTo = (i) => {
      lastTouch = performance.now();
      // shortest way round to item i
      let delta = mod(i - Math.round(goal));
      if (delta > N / 2) delta -= N;
      goal = Math.round(goal) + delta;
    };
    vit.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      lastTouch = performance.now();
      goal = Math.round(goal) + Number(b.dataset.step);
    }));

    // drag sideways to spin; a mostly vertical swipe is left to the page, so scrolling past never nudges it
    let dragging = false, sx = 0, sy = 0, sGoal = 0, moved = 0, pid = null, axis = null;
    ring.addEventListener('pointerdown', (e) => {
      if (vit.dataset.view !== 'ring' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      pid = e.pointerId; axis = null; moved = 0;
      sx = e.clientX; sy = e.clientY; sGoal = goal;
    });
    ring.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'y') { pid = null; return; }
        dragging = true; moved = 8; sGoal = goal; sx = e.clientX;
        ring.classList.add('is-dragging');
        try { ring.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
        return;
      }
      moved = Math.max(moved, Math.abs(dx));
      goal = sGoal - (e.clientX - sx) / Math.max(140, ring.clientWidth * 0.18);
      lastTouch = performance.now();
    });
    const endDrag = (e) => {
      if (e && e.pointerId !== pid) return;
      pid = null;
      if (!dragging) return;
      dragging = false; ring.classList.remove('is-dragging');
      goal = Math.round(goal);
      lastTouch = performance.now();
    };
    ring.addEventListener('pointerup', endDrag);
    ring.addEventListener('pointercancel', endDrag);
    ring.addEventListener('lostpointercapture', endDrag);
    ring.addEventListener('wheel', (e) => {
      if (vit.dataset.view !== 'ring' || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      e.preventDefault(); lastTouch = performance.now();
      goal += e.deltaX / 400;
      clearTimeout(ring._snap); ring._snap = setTimeout(() => { goal = Math.round(goal); }, 160);
    }, { passive: false });
    ring.addEventListener('keydown', (e) => {
      if (vit.dataset.view !== 'ring') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goal = Math.round(goal) + 1; lastTouch = performance.now(); setTimeout(() => btns[mod(Math.round(goal))].focus(), 0); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goal = Math.round(goal) - 1; lastTouch = performance.now(); setTimeout(() => btns[mod(Math.round(goal))].focus(), 0); }
    });

    /* the receipt */
    const rc = document.querySelector('.receipt');
    let lastBtn = null;
    function openReceipt(i) {
      const li = items[i];
      rc.querySelector('.receipt__no').textContent = `peça ${String(i + 1).padStart(2, '0')} de ${String(N).padStart(2, '0')}`;
      const name = li.querySelector('.ring__name').textContent;
      const text = li.querySelector('.ring__text').textContent;
      rc.querySelector('.receipt__title').textContent = name;
      // only the rows this shirt has
      const rows = [['loja', 'loja'], ['coleção', 'colecao'], ['inspiração', 'inspiracao'], ['versões', 'versoes'], ['cor', 'cor'], ['frente', 'frente'], ['versículos', 'versiculos']]
        .filter(([, k]) => li.dataset[k])
        .map(([label, k]) => {
          const row = document.createElement('div');
          const dt = document.createElement('dt'); dt.textContent = label;
          const dd = document.createElement('dd'); dd.textContent = li.dataset[k];
          row.append(dt, dd);
          return row;
        });
      rc.querySelector('.receipt__rows').replaceChildren(...rows);
      rc.querySelector('.receipt__text').textContent = text;
      const fotos = (li.dataset.fotos || '').split(',').filter(Boolean);
      rc.querySelector('.receipt__photos').onclick = () => { closeReceipt(); openViewer({ title: name, text: [text], imgs: fotos, alt: `Camisa ${name}` }); };
      rc.hidden = false;
      rc.classList.remove('is-closing', 'is-open');
      void rc.offsetWidth;
      rc.classList.add('is-open');
      rc.querySelector('.receipt__close').focus({ preventScroll: true });
    }
    function closeReceipt() {
      if (rc.hidden) return;
      rc.classList.remove('is-open'); rc.classList.add('is-closing');
      setTimeout(() => { rc.hidden = true; rc.classList.remove('is-closing'); }, reduce.matches ? 0 : 340);
      if (lastBtn) lastBtn.focus({ preventScroll: true });
    }
    rc.querySelector('.receipt__close').addEventListener('click', closeReceipt);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !(dlg && dlg.open)) closeReceipt(); });

    btns.forEach((b, i) => b.addEventListener('click', () => {
      if (moved > 6) return;                       // it was a drag, not a click
      if (vit.dataset.view === 'ring' && i !== front) { goTo(i); return; }
      lastBtn = b;
      openReceipt(i);
    }));

    setView('ring');
  }

  /* ---------- project viewer (texts and images from Felippe's Behance) ---------- */
  const B = 'assets/behance/';   // saved from the Behance projects (published pages cannot load other hosts)
  const CASES = {
    'base-camp': {
      title: 'Base Camp',
      url: 'https://www.behance.net/gallery/258744225/Base-Camp',
      text: [
        'Esta identidade visual foi desenvolvida para o **acampamento de jovens da Poiema Taubaté**, com uma proposta criativa, divertida e nostálgica, inspirada na estética de séries e produções da Disney, como *Camp Rock* e *Gravity Falls*.',
        'Na primeira etapa, o foco foi a criação da **identidade da logo**, explorando uma linguagem visual que remetesse ao universo dos acampamentos, com uma atmosfera jovem, aventureira e descontraída. Na segunda etapa, essa mesma linguagem foi aplicada ao **line-up dos pregadores do acampamento**, trazendo uma abordagem mais ilustrativa e cartoon, com elementos gráficos que reforçam a personalidade do projeto e mantêm a unidade visual entre as peças.'
      ],
      imgs: ['1c1c24258744225.6aff28ba8714a.png', '134def258744225.6aff28ba876c2.png']
    },
    'b-side': {
      title: 'B-Side',
      url: 'https://www.behance.net/gallery/258702511/Manual-de-Marca-B-Side',
      text: [
        'Esta identidade visual foi desenvolvida para a **B-SIDE**, uma produtora audiovisual voltada a artistas independentes, com uma proposta criativa, alternativa e autêntica. O conceito parte do **lado B dos discos de vinil**, conhecido por reunir músicas mais experimentais e menos comerciais, representando a liberdade de criar fora dos padrões.',
        'A identidade traduz essa ideia por meio de uma estética inspirada no universo musical e audiovisual, explorando elementos como películas cinematográficas, discos de vinil e interfaces de gravação, combinados com uma tipografia marcante e cores contrastantes. O resultado é uma identidade **expressiva, ousada e fora do convencional**, que valoriza a originalidade e convida o público a descobrir o lado menos óbvio das coisas.'
      ],
      imgs: ['752eaa258702511.6afe0d49edf3a.png', 'e4a8a0258702511.6afe0d49ee3de.png', '8d94d0258702511.6afe0d4a00649.png', 'b340eb258702511.6afe0d49ee862.png', '8c194b258702511.6afe0d49f2869.png', '12b4fb258702511.6afe0d49eeccb.png', '969f2d258702511.6afe0d4a00205.png', 'f8661c258702511.6afe0d49ef9af.png', '338ccf258702511.6afe0d49ef109.png', '7bbbf3258702511.6afe0d49f0d39.png', 'dbc357258702511.6afe0d49f33f1.png', '514445258702511.6afe0d49f3bd4.png', '6ffb6c258702511.6afe0d49ef55d.png', '6d58de258702511.6afe0d49f1c3e.png', '45e514258702511.6afe0d49f2fbe.png', '872564258702511.6afe0d49f056c.png', '452eac258702511.6afe0d49f2407.png', '49ff5c258702511.6afe0d49f012a.png', 'f19ecd258702511.6afe0d49f1484.png', '91bb6b258702511.6afe0d49f4019.png']
    },
    'numen': {
      title: 'Numen',
      url: 'https://www.behance.net/gallery/258702005/Numen',
      text: [
        'Esta identidade visual foi desenvolvida como parte de um projeto acadêmico, com o objetivo de criar a identidade de uma **produtora audiovisual**. O conceito criativo surgiu da ideia de transmitir algo **grandioso, misterioso e inexplicável**, explorando a sensação de estar diante de algo que vai além do que podemos compreender.',
        'A proposta foi traduzir esse conceito em uma linguagem visual marcante, que despertasse curiosidade e transmitisse a força, a criatividade e as infinitas possibilidades do universo audiovisual.'
      ],
      imgs: ['fc86d8258702005.6afe0a54eb765.png', '06a2df258702005.6afe0a54ee5dd.png', '178c7b258702005.6afe0a54eecc9.png', '015a12258702005.6afe0a54ef335.png', 'ee0573258702005.6afe0a54eaeda.png', 'a1d771258702005.6afe0a54ec000.png', '20720f258702005.6afe0a54ed801.png', '7eb1df258702005.6afe0a54ed120.png', 'f86e9d258702005.6afe0a54edf02.png', '0f1df1258702005.6afe0a54ec8b9.png']
    },
    'conexao': {
      title: 'Conexão',
      url: 'https://www.behance.net/gallery/258701713/Conexao-Ministrio-de-criancas-e-pr-adolescentes',
      text: [
        'Esta identidade visual foi desenvolvida para o Conexão, ministério da Poiema Orlando voltado a crianças de 9 a 12 anos. O conceito criativo parte da ideia de estar conectado, explorando uma tipografia cursiva, fluida e dinâmica, que transmite movimento, proximidade e interação.',
        'Para reforçar esse conceito, foram incorporados elementos gráficos inspirados no universo digital e nas conexões de internet, criando uma identidade jovem, divertida e moderna, que se comunica de forma leve e autêntica com essa faixa etária.'
      ],
      imgs: ['3bc623258701713.6afe082a72dce.png', 'd66af9258701713.6afe082a720bc.png', '99b64f258701713.6afe082a71af0.png', 'b71999258701713.6afe082a7255f.png', 'e56915258701713.6afe082a71045.png', '9254bc258701713.6afe082a735e5.png', 'de9eb7258701713.6afe082a729b1.png', '98c0f1258701713.6afe082a739b4.png', '8b31ec258701713.6afe082a74159.png', '2485b3258701713.6afe082a74538.png', 'f246dc258701713.6afe082a71538.png', '84f2c4258701713.6afe082a731ab.png', '35270e258701713.6afe082a73d36.png']
    }
  };

  const viewer = document.querySelector('.viewer');
  if (viewer && typeof viewer.showModal === 'function') {
    const vTitle = viewer.querySelector('.viewer__title');
    const vText = viewer.querySelector('.viewer__text');
    const vImgs = viewer.querySelector('.viewer__imgs');
    const vLink = viewer.querySelector('.viewer__behance');
    const vBody = viewer.querySelector('.viewer__body');

    // **bold** and *italic* from the Behance text, built as nodes (no innerHTML)
    const para = (s) => {
      const p = document.createElement('p');
      s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach((part) => {
        if (part.startsWith('**')) { const b = document.createElement('strong'); b.textContent = part.slice(2, -2); p.append(b); }
        else if (part.startsWith('*')) { const i = document.createElement('em'); i.textContent = part.slice(1, -1); p.append(i); }
        else if (part) p.append(part);
      });
      return p;
    };

    openViewer = ({ title, text, imgs, url, alt }) => {
      vTitle.textContent = title;
      vImgs.classList.toggle('is-grid', !url && imgs.length > 1);   // shirt photos are portrait: two per row
      vText.replaceChildren(...text.map(para));
      vImgs.replaceChildren(...imgs.map((src, i) => {
        const im = document.createElement('img');
        im.src = src; im.loading = i < 2 ? 'eager' : 'lazy'; im.decoding = 'async';
        im.alt = `${alt || title}, imagem ${i + 1} de ${imgs.length}`;
        return im;
      }));
      vLink.hidden = !url;
      if (url) vLink.href = url;
      viewer.showModal();
      vBody.scrollTop = 0;
    };

    document.querySelectorAll('[data-case]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const c = CASES[a.dataset.case];
        if (!c) return;
        e.preventDefault();
        openViewer({ title: c.title, text: c.text, imgs: c.imgs.map((f) => B + f.replace(/\.png$/, '.webp')), url: c.url });
      });
    });
    viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });
  }
})();
