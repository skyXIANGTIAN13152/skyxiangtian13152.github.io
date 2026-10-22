/* A short, skippable frosted-mirror entrance. No framework or network dependency. */
(function () {
  'use strict';
  var active = null;
  var paths = [
    'M450 252 C442 231 429 215 430 191 C431 173 451 168 458 153 C463 139 448 128 436 132 C420 136 421 153 431 160 C442 168 450 159 446 152',
    'M450 252 C454 223 467 214 488 204 C508 194 533 180 533 164 C531 149 513 142 501 151 C486 161 493 176 505 176 C513 176 518 169 514 163',
    'M450 252 C471 230 497 226 521 231 C543 236 546 215 559 216 C575 216 580 233 568 245 C552 260 533 249 514 247 C492 244 477 254 450 252',
    'M450 252 C481 251 504 265 516 283 C527 300 551 308 560 296 C571 281 550 269 538 278 C529 285 537 293 542 290',
    'M450 252 C468 269 466 287 482 307 C497 326 511 335 504 347 C497 361 480 355 476 345 C472 333 482 327 490 333',
    'M450 252 C442 278 454 303 442 324 C429 344 424 360 409 357 C394 354 396 334 408 328 C418 322 426 331 420 338',
    'M450 252 C433 275 415 280 394 282 C375 285 365 310 350 307 C332 305 330 284 342 276 C354 267 366 278 360 288',
    'M450 252 C425 256 411 244 395 231 C374 214 354 204 341 216 C325 228 332 246 345 247 C358 247 366 237 359 228',
    'M450 252 C429 232 407 220 405 199 C404 182 397 153 380 153 C364 153 358 168 366 181 C373 195 390 192 393 183 C396 175 389 169 383 172'
  ];
  var fractures = [
    'M450 252 L458 196 L471 124 L484 68 L499 0',
    'M450 252 L504 186 L560 113 L612 44 L657 0',
    'M450 252 L522 272 L613 303 L698 336 L798 365 L900 401',
    'M450 252 L506 287 L566 330 L639 375 L720 428 L814 477 L900 528',
    'M450 252 L471 315 L516 377 L548 450 L591 524 L628 600',
    'M450 252 L388 307 L322 360 L249 412 L173 464 L101 499 L0 525',
    'M450 252 L363 242 L282 234 L172 233 L82 230 L0 230',
    'M450 252 L368 240 L307 230 L229 217 L143 205 L0 176',
    'M471 124 L536 103 L612 44',
    'M388 307 L333 323 L327 237',
    'M566 330 L613 303 L698 336',
    'M322 360 L274 373 L249 412'
  ];
  var pieces = [
    ['50% 42%,0 29.3%,0 0,55.5% 0', '-42vw', '-46vh', '210px', '-36deg', '-16deg', '-17deg', '0ms'],
    ['50% 42%,55.5% 0,73% 0', '8vw', '-61vh', '300px', '34deg', '-19deg', '12deg', '20ms'],
    ['50% 42%,73% 0,100% 0,100% 66.8%', '52vw', '-33vh', '240px', '-21deg', '37deg', '17deg', '35ms'],
    ['50% 42%,100% 66.8%,100% 88%', '68vw', '4vh', '350px', '-25deg', '28deg', '21deg', '5ms'],
    ['50% 42%,100% 88%,100% 100%,69.8% 100%', '45vw', '53vh', '320px', '18deg', '31deg', '23deg', '55ms'],
    ['50% 42%,69.8% 100%,40% 100%,43.1% 51.2%', '5vw', '76vh', '270px', '42deg', '-13deg', '-14deg', '15ms'],
    ['43.1% 51.2%,40% 100%,0 100%,0 87.5%,27.7% 68.7%', '-41vw', '58vh', '180px', '24deg', '-25deg', '-21deg', '45ms'],
    ['50% 42%,43.1% 51.2%,27.7% 68.7%,0 87.5%,0 38.3%,36.3% 39.5%,37% 53.8%', '-70vw', '14vh', '350px', '-29deg', '-31deg', '11deg', '10ms'],
    ['50% 42%,37% 53.8%,36.3% 39.5%', '-23vw', '24vh', '520px', '68deg', '-51deg', '-38deg', '0ms'],
    ['50% 42%,36.3% 39.5%,0 38.3%,0 29.3%', '-63vw', '-15vh', '270px', '17deg', '-42deg', '-23deg', '25ms']
  ];
  function sealMarkup() {
    var lines = paths.map(function (d, i) {
      return '<path class="sky-intro__line" pathLength="1" d="' + d + '" style="transition-delay:' + (i * 30) + 'ms"/>';
    }).join('');
    return '<svg class="sky-intro__seal" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<g class="sky-intro__ink" fill="#091116"><path d="M247 151 Q412 121 602 103 Q650 103 624 145 L605 169 Q665 174 647 208 L621 225 Q654 244 630 267 L625 286 Q661 321 629 343 L608 347 Q638 388 591 387 L326 377 Q289 371 300 347 L320 323 Q284 315 290 285 L305 256 Q306 242 294 227 L267 214 Q227 208 238 179 Q217 158 247 151Z"/></g>' +
      '<g>' + lines + '</g><g transform="translate(1.8,-1.6)">' + lines.replace(/sky-intro__line/g, 'sky-intro__line sky-intro__line--echo') + '</g></svg>';
  }
  function crackMarkup() {
    return '<svg class="sky-intro__cracks" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + fractures.map(function(d, i) {
      return '<path class="sky-intro__fracture' + (i > 7 ? ' sky-intro__fracture--fine' : '') + '" pathLength="1" d="' + d + '" style="transition-delay:' + ((i % 4) * 24) + 'ms"/>';
    }).join('') + '</svg>';
  }
  function callOnce(state, name) {
    var called = name + 'Called';
    if (state[called]) return;
    state[called] = true;
    if (typeof state[name] !== 'function') return;
    try {
      state[name]();
    } catch (error) {
      // A scene callback must not strand the visitor behind the loading cover.
      console.error('[SkyIntro] ' + name + ' callback failed.', error);
    }
  }
  function finish() {
    if (!active || active.finishing) return;
    var state = active;
    state.finishing = true;
    state.timers.forEach(clearTimeout);
    // Skipping shortens the transition, but still reaches the intended scene.
    callOnce(state, 'onCovered');
    callOnce(state, 'onReveal');
    if (state.overlay) {
      document.removeEventListener('keydown', state.keydown, true);
      document.body.style.overflow = state.overflow;
      state.siblings.forEach(function (item) { if (item.element.isConnected) item.element.inert = item.inert; });
      var hadFocus = state.overlay.contains(document.activeElement);
      state.overlay.remove();
      document.documentElement.classList.remove('sky-intro-active');
      if (hadFocus && state.previousFocus && state.previousFocus.isConnected && state.previousFocus !== document.body) {
        state.previousFocus.focus({ preventScroll: true });
      }
    }
    active = null;
    document.dispatchEvent(new CustomEvent('sky:intro-complete'));
    state.resolve();
  }
  function play(options) {
    if (active) return active.promise;
    options = options || {};
    if (!document.body) return new Promise(function (resolve) {
      document.addEventListener('DOMContentLoaded', function () { play(options).then(resolve); }, { once: true });
    });
    var resolvePromise;
    var promise = new Promise(function (resolve) { resolvePromise = resolve; });
    var state = {
      promise: promise, resolve: resolvePromise, timers: [], overlay: null,
      onCovered: options.onCovered, onReveal: options.onReveal,
      onCoveredCalled: false, onRevealCalled: false, finishing: false
    };
    active = state;
    if (document.documentElement.classList.contains('reduced-motion')) {
      Promise.resolve().then(function () { if (active === state) finish(); });
      return promise;
    }
    var overlay = document.createElement('div');
    overlay.className = 'sky-intro';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '缪斯印记过场动画');
    overlay.innerHTML = '<div class="sky-intro__veil"></div><div class="sky-intro__still"></div>' + sealMarkup() +
      pieces.map(function (piece) { return '<div class="sky-intro__shard" style="clip-path:polygon(' + piece[0] + ');--dx:' + piece[1] + ';--dy:' + piece[2] + ';--dz:' + piece[3] + ';--rx:' + piece[4] + ';--ry:' + piece[5] + ';--rz:' + piece[6] + ';--lag:' + piece[7] + '"></div>'; }).join('') +
      crackMarkup() + '<p class="sky-intro__caption">正在翻开档案</p><button type="button" class="sky-intro__skip">跳过</button>';
    if (typeof options.caption === 'string') overlay.querySelector('.sky-intro__caption').textContent = options.caption;
    var skipButton = overlay.querySelector('.sky-intro__skip');
    var keydown = function (event) {
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
      if (event.key === 'Tab') { event.preventDefault(); skipButton.focus(); }
    };
    var siblings = Array.from(document.body.children).map(function (element) { return { element: element, inert: element.inert }; });
    state.overlay = overlay;
    state.overflow = document.body.style.overflow;
    state.siblings = siblings;
    state.keydown = keydown;
    state.previousFocus = document.activeElement;
    siblings.forEach(function (item) { item.element.inert = true; });
    document.body.appendChild(overlay);
    skipButton.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('sky-intro-active');
    document.addEventListener('keydown', keydown, true);
    skipButton.addEventListener('click', finish);
    function later(delay, callback) { state.timers.push(setTimeout(function () { if (active === state && !state.finishing) callback(); }, delay)); }
    later(50, function () {
      // The opaque mirror has been mounted before the underlying scene changes.
      callOnce(state, 'onCovered');
      if (active === state && !state.finishing) overlay.classList.add('is-developing');
    });
    later(1270, function () { overlay.classList.add('is-cracked'); });
    later(1530, function () {
      callOnce(state, 'onCovered');
      if (active !== state || state.finishing) return;
      overlay.classList.add('is-breaking');
      callOnce(state, 'onReveal');
    });
    later(2660, finish);
    // A visibility change should never leave a loading cover over a usable page.
    var onVisibility = function () { if (document.hidden && active === state) finish(); document.removeEventListener('visibilitychange', onVisibility); };
    document.addEventListener('visibilitychange', onVisibility);
    promise.then(function () { document.removeEventListener('visibilitychange', onVisibility); });
    return promise;
  }
  window.SkyIntro = { play: play, skip: finish };
})();
