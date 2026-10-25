/* Original Identity V loading.csb imagery and timeline. See assets/muse-original/provenance.json. */
(function () {
  'use strict';
  var active = null;
  var assetPromise = null;
  var scriptURL = document.currentScript && document.currentScript.src;
  var assetRoot = new URL('assets/muse-original/', scriptURL || document.baseURI).href;
  var symbolFrames = [[56,13],[58,16],[60,19],[62,22],[64,25],[66,28],[68,31],[70,34],[72,37],[74,40],[76,43],[78,46],[80,46],[82,52],[84,55],[86,58],[88,61],[90,61],[92,61],[94,61],[96,73],[98,76],[100,79],[102,82],[104,85],[106,88],[108,91],[110,91],[112,91],[114,100],[116,103],[118,106],[120,109],[122,112],[124,115],[126,115],[128,115],[130,124],[132,127],[134,130],[136,133],[138,136],[140,139],[142,139],[144,145],[145,146],[147,148],[149,150],[151,152],[153,154],[155,156],[157,158],[159,160]];
  var glassFrames = [[158,2],[159,3],[160,4],[161,5],[162,6]];
  // The original CSB runs at 60 fps with speed 0.666700005531311.
  var frameRate = 60 * 0.666700005531311;
  var firstFrame = 48;
  var lastFrame = 220;
  var maxCanvasPixels = 8 * 1024 * 1024;
  function textureName(prefix, number) { return prefix + String(number).padStart(4, '0'); }
  function preload() {
    if (assetPromise) return assetPromise;
    var names = new Set(['bg_loading']);
    symbolFrames.forEach(function (frame) { names.add(textureName('symbol', frame[1])); });
    glassFrames.forEach(function (frame) { names.add(textureName('glassbroken', frame[1])); });
    var images = Object.create(null);
    assetPromise = Promise.all(Array.from(names).map(function (name) {
      return new Promise(function (resolve, reject) {
        var image = new Image();
        var done = false;
        var timeout = setTimeout(function () { settle(new Error('Animation image timed out: ' + name)); }, 12000);
        function settle(error) {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          image.onload = image.onerror = null;
          if (error) reject(error);
          else { images[name] = image; resolve(); }
        }
        image.onload = function () {
          if (!image.naturalWidth) { settle(new Error('Animation image is empty: ' + name)); return; }
          if (image.decode) image.decode().then(function () { settle(); }, function () { settle(); });
          else settle();
        };
        image.onerror = function () { settle(new Error('Animation image unavailable: ' + name)); };
        image.src = assetRoot + name + '.webp?v=pc-20261023';
      });
    })).then(function () { return images; }, function (error) {
      assetPromise = null;
      throw error;
    });
    return assetPromise;
  }
  function callOnce(state, name) {
    if (state[name + 'Called']) return;
    state[name + 'Called'] = true;
    if (typeof state[name] !== 'function') return;
    try { state[name](); }
    catch (error) { console.error('[SkyIntro] ' + name + ' callback failed.', error); }
  }
  function finish(cancelled) {
    if (!active || active.finishing) return;
    var state = active;
    state.finishing = true;
    cancelAnimationFrame(state.raf);
    // The original six-second glass sample has a long tail after the room appears.
    // Keep that tail on normal completion; skipping/cancelling must stop it.
    if (cancelled !== false) window.SkyAudio?.stopAll('intro');
    state.timers.forEach(clearTimeout);
    callOnce(state, 'onCovered');
    callOnce(state, 'onReveal');
    if (state.overlay) {
      document.removeEventListener('keydown', state.keydown, true);
      document.removeEventListener('visibilitychange', state.visibility);
      window.removeEventListener('resize', state.resize);
      document.body.style.overflow = state.overflow;
      state.siblings.forEach(function (item) { if (item.element.isConnected) item.element.inert = item.inert; });
      var hadFocus = state.overlay.contains(document.activeElement);
      state.overlay.remove();
      document.documentElement.classList.remove('sky-intro-active');
      if (hadFocus && state.previousFocus && state.previousFocus.isConnected && !state.previousFocus.closest('[inert]')) {
        state.previousFocus.focus({ preventScroll: true });
      }
    }
    active = null;
    document.dispatchEvent(new CustomEvent('sky:intro-complete'));
    state.resolve();
  }
  function alpha(frame, start, end, from, to) {
    var progress = Math.max(0, Math.min(1, (frame - start) / (end - start)));
    return from + (to - from) * progress;
  }
  function atFrame(frames, frame) {
    var current = frames[0][1];
    for (var i = 0; i < frames.length && frames[i][0] <= frame; i++) current = frames[i][1];
    return current;
  }
  function render(state, frame) {
    var c = state.context;
    var w = state.canvas.width;
    var h = state.canvas.height;
    c.clearRect(0, 0, w, h);
    var scale = Math.min(w / 1334, h / 750);
    var ox = (w - 1334 * scale) / 2;
    var oy = (h - 750 * scale) / 2;
    var backdropAlpha = alpha(frame, 208, 220, 1, 0);
    var panelAlpha = alpha(frame, 208, 215, 1, 0);
    c.globalAlpha = backdropAlpha;
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
    c.drawImage(state.images.bg_loading, ox, oy, 1334 * scale, 750 * scale);
    function sprite(image, cx, cy, width, height, opacity) {
      c.globalAlpha = opacity;
      c.drawImage(image, ox + (cx - width / 2) * scale, oy + (cy - height / 2) * scale, width * scale, height * scale);
    }
    // Coordinates, 1.43 scale, and opacity tracks come directly from loading.csb.
    sprite(state.images[textureName('symbol', atFrame(symbolFrames, frame))],
      659.000500202179, 359.001000404358, 434 * 1.4299999475479126, 296 * 1.4299999475479126,
      panelAlpha * alpha(frame, 48, 56, 0, 1));
    sprite(state.images[textureName('glassbroken', atFrame(glassFrames, frame))],
      670, 381, 934 * 1.4299999475479126, 525 * 1.4299999475479126,
      panelAlpha * alpha(frame, 157, 158, 0, 1));
    c.globalAlpha = 1;
    state.caption.style.opacity = String(backdropAlpha);
    state.caption.style.top = ((oy + 695 * scale) / state.pixelRatio) + 'px';
    state.overlay.dataset.frame = frame.toFixed(2);
    state.overlay.dataset.phase = frame < 157 ? 'wiping' : frame < 208 ? 'cracked' : 'revealing';
  }
  function play(options) {
    if (active) return active.promise;
    window.SkyAudio?.stopAll('intro');
    options = options || {};
    if (!document.body) return new Promise(function (resolve) {
      document.addEventListener('DOMContentLoaded', function () { play(options).then(resolve); }, { once: true });
    });
    var resolvePromise;
    var promise = new Promise(function (resolve) { resolvePromise = resolve; });
    var state = {
      promise: promise, resolve: resolvePromise, timers: [], overlay: null,
      onCovered: options.onCovered, onReveal: options.onReveal,
      finishing: false, elapsed: 0, lastTime: null, raf: 0, loadingSoundPlayed: false, glassSoundPlayed: false
    };
    active = state;
    var overlay = document.createElement('div');
    overlay.className = 'sky-intro is-preparing';
    overlay.dataset.phase = 'preparing';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '缪斯印记过场动画');
    overlay.innerHTML = '<canvas class="sky-intro__canvas" aria-hidden="true"></canvas>' +
      '<p class="sky-intro__caption" role="status">正在进入大厅</p>' +
      '<button type="button" class="sky-intro__skip">跳过</button>';
    var skipButton = overlay.querySelector('.sky-intro__skip');
    state.caption = overlay.querySelector('.sky-intro__caption');
    state.canvas = overlay.querySelector('canvas');
    state.context = state.canvas.getContext('2d', { alpha: true });
    state.keydown = function (event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); finish(); }
      if (event.key === 'Tab') { event.preventDefault(); event.stopImmediatePropagation(); skipButton.focus(); }
    };
    state.resize = function () {
      var width = Math.max(1, window.innerWidth);
      var height = Math.max(1, window.innerHeight);
      state.pixelRatio = Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(maxCanvasPixels / (width * height)));
      state.canvas.width = Math.max(1, Math.floor(width * state.pixelRatio));
      state.canvas.height = Math.max(1, Math.floor(height * state.pixelRatio));
      // Resizing clears the context state. Restore quality after both dimensions
      // change, without altering the original textures, layout or animation clock.
      if (state.context) {
        state.context.imageSmoothingEnabled = true;
        state.context.imageSmoothingQuality = 'high';
      }
      if (state.images && state.context) render(state, firstFrame + state.elapsed * frameRate / 1000);
    };
    // A background tab pauses the original timeline; returning never skips the entrance.
    state.visibility = function () { state.lastTime = null; };
    state.siblings = Array.from(document.body.children).map(function (element) { return { element: element, inert: element.inert }; });
    state.overlay = overlay;
    state.overflow = document.body.style.overflow;
    state.previousFocus = document.activeElement;
    state.siblings.forEach(function (item) { item.element.inert = true; });
    document.body.appendChild(overlay);
    skipButton.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('sky-intro-active');
    document.dispatchEvent(new CustomEvent('sky:intro-start'));
    document.addEventListener('keydown', state.keydown, true);
    document.addEventListener('visibilitychange', state.visibility);
    window.addEventListener('resize', state.resize, { passive: true });
    skipButton.addEventListener('click', finish);
    state.resize();
    function fallback(error) {
      if (active !== state || state.finishing) return;
      console.warn('[SkyIntro] Original animation unavailable; entering the lobby.', error);
      overlay.dataset.phase = 'fallback';
      callOnce(state, 'onCovered');
      state.timers.push(setTimeout(function () { if (active === state) finish(); }, 180));
    }
    if (!state.context) { fallback('Canvas unavailable'); return promise; }
    Promise.all([preload(), window.SkyAudio?.prepare(['loadingStart', 'shatter']).catch(function () { return false; }), options.ready]).then(function (resources) {
      var images = resources[0];
      if (active !== state || state.finishing) return;
      state.images = images;
      state.caption.textContent = typeof options.caption === 'string' ? options.caption : '正在进入大厅';
      render(state, firstFrame);
      overlay.classList.remove('is-preparing');
      callOnce(state, 'onCovered');
      function tick(now) {
        if (active !== state || state.finishing) return;
        if (!document.hidden) {
          // Keep the visual clock aligned with the native audio even after a slow frame.
          if (state.lastTime !== null) state.elapsed += Math.max(0, now - state.lastTime);
          state.lastTime = now;
          var liveFrame = firstFrame + state.elapsed * frameRate / 1000;
          var frame = Math.min(lastFrame, liveFrame);
          render(state, frame);
          if (!state.loadingSoundPlayed) {
            state.loadingSoundPlayed = true;
            window.SkyAudio?.play('loadingStart', { group: 'intro', maxDelay: 100, offset: (liveFrame - 48) / frameRate });
          }
          // UILoading starts sound ID 113 with stage 2 at frame 145. Its original
          // sample contains the lead-in before the visible glass at frame 158.
          if (frame >= 145 && !state.glassSoundPlayed) {
            state.glassSoundPlayed = true;
            window.SkyAudio?.play('shatter', { group: 'intro', maxDelay: 100, offset: (liveFrame - 145) / frameRate });
          }
          if (frame >= 208) callOnce(state, 'onReveal');
          if (frame >= lastFrame) { finish(false); return; }
        } else state.lastTime = null;
        state.raf = requestAnimationFrame(tick);
      }
      state.raf = requestAnimationFrame(tick);
    }).catch(fallback);
    return promise;
  }
  window.SkyIntro = { play: play, skip: finish };
  // Preload local images without playing anything; every entry remains a full playback.
  preload().catch(function () {});
})();
