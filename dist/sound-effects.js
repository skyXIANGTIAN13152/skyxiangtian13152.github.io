/* Local, original game recordings. Asset provenance is shipped beside the audio. */
(() => {
  'use strict';
  const root = new URL('./assets/audio/game-sfx/', document.currentScript?.src || document.baseURI);
  const files = {
    click: 'ui-click.wav',
    shatter: 'muse-shatter.wav',
    diaryOpen: 'diary-open.wav',
    diaryClose: 'diary-close.wav',
    pageTurn: 'page-turn.wav',
    pageBack: 'page-back.wav',
    loadingStart: 'muse-start.wav'
  };
  // Original Wwise event gains, applied during playback without modifying the PCM.
  const decibels = { click: -3, shatter: -5, diaryOpen: -6, diaryClose: -5, pageTurn: -6, pageBack: -6, loadingStart: -3 };
  // Original detective fallback: ten equal samples at -17 dB. Alice's two
  // appearances share their own event: five equal samples at -13 dB.
  const footstepKeys = Array.from({ length: 10 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const key = `footstep${number}`;
    files[key] = `footsteps/sourceDefault-${number}.wav`;
    decibels[key] = -17;
    return key;
  });
  const femaleFootstepRoot = new URL('../../visitors/female/footsteps/', root);
  const femaleFootstepKeys = Array.from({ length: 5 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const key = `femaleFootstep${number}`;
    files[key] = new URL(`sourceDefault-${number}.wav`, femaleFootstepRoot).href;
    decibels[key] = -13;
    return key;
  });
  const previousFootstep = { male: -1, female: -1 };
  const bytes = new Map(), buffers = new Map(), decoding = new Map();
  const voices = new Set(), lastPlayed = new Map();
  let context, master, unlocking = null, enabled = true, generation = 0;

  function emit(key, state, extra = {}) {
    document.dispatchEvent(new CustomEvent('sky:sound', { detail: { key, state, ...extra } }));
  }
  function getContext() {
    if (context) return context;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = enabled ? 0.75 : 0;
    master.connect(context.destination);
    return context;
  }
  function load(key) {
    if (!Object.hasOwn(files, key)) return Promise.reject(new Error('Unknown game sound.'));
    if (bytes.has(key)) return bytes.get(key);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const request = fetch(new URL(files[key], root), { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Game sound unavailable.'); return response.arrayBuffer(); })
      .finally(() => clearTimeout(timeout));
    bytes.set(key, request);
    request.catch(() => { if (bytes.get(key) === request) bytes.delete(key); });
    return request;
  }
  async function prepare(keys = Object.keys(files)) {
    const audio = getContext();
    if (!audio) return false;
    const result = await Promise.allSettled(keys.map(key => {
      if (buffers.has(key)) return buffers.get(key);
      if (decoding.has(key)) return decoding.get(key);
      const pending = load(key).then(data => audio.decodeAudioData(data.slice(0))).then(buffer => {
        buffers.set(key, buffer); return buffer;
      }).finally(() => decoding.delete(key));
      decoding.set(key, pending);
      return pending;
    }));
    return result.every(item => item.status === 'fulfilled');
  }
  function unlock(event) {
    if (!enabled || document.hidden) return Promise.resolve(false);
    let audio;
    try { audio = getContext(); } catch (_) { return Promise.resolve(false); }
    if (!audio) return Promise.resolve(false);
    // A pre-gesture resume() can remain pending on mobile. A later real input
    // must retry synchronously, rather than wait on that blocked first request.
    const gesture = event?.isTrusted || navigator.userActivation?.isActive;
    if (audio.state !== 'running' && (!unlocking || gesture)) {
      let resumed;
      try { resumed = audio.resume(); } catch (_) { return Promise.resolve(false); }
      const request = Promise.resolve(resumed).then(() => audio.state === 'running', () => false);
      unlocking = request;
      request.finally(() => { if (unlocking === request) unlocking = null; });
    }
    prepare().catch(() => {});
    return unlocking || Promise.resolve(audio.state === 'running');
  }
  function stopAll(group) {
    if (!group) generation++;
    for (const voice of [...voices]) if (!group || voice.group === group) voice.stop();
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    if (master) master.gain.setValueAtTime(enabled ? 0.75 : 0, context.currentTime);
    if (!enabled) stopAll();
    else unlock();
  }
  function play(key, options = {}) {
    if (!enabled || document.hidden || !Object.hasOwn(files, key)) return null;
    const requested = performance.now(), epoch = generation;
    const debounce = options.debounce ?? (key === 'click' ? 65 : 0);
    if (requested - (lastPlayed.get(key) ?? -Infinity) < debounce) return null;
    lastPlayed.set(key, requested);
    let source, gain, stopped = false, didStart = false;
    const voice = {
      group: options.group || 'interface',
      stop() {
        if (stopped) return;
        stopped = true;
        if (source) { try { source.stop(); } catch (_) {} source.disconnect(); }
        gain?.disconnect(); voices.delete(voice);
        if (didStart) emit(key, 'stopped', { group: voice.group });
      },
      get started() { return didStart; }
    };
    voices.add(voice);
    while (voices.size > 8) voices.values().next().value.stop();
    const start = () => {
      if (stopped || epoch !== generation || !enabled || document.hidden || context?.state !== 'running' ||
          performance.now() - requested > (options.maxDelay ?? 250)) { voice.stop(); return; }
      const buffer = buffers.get(key);
      if (!buffer) { voice.stop(); return; }
      const offset = Math.max(0, options.offset || 0);
      if (offset >= buffer.duration) { voice.stop(); return; }
      source = context.createBufferSource(); source.buffer = buffer;
      gain = context.createGain(); gain.gain.value = Math.pow(10, decibels[key] / 20) * (options.volume ?? 1);
      source.connect(gain); gain.connect(master);
      source.onended = () => voice.stop();
      source.start(0, offset);
      didStart = true;
      emit(key, 'started', { group: voice.group, duration: buffer.duration, offset });
    };
    const afterUnlock = () => {
      if (context?.state !== 'running' && unlocking) unlocking.then(start, () => voice.stop());
      else start();
    };
    if (buffers.has(key)) afterUnlock();
    else prepare([key]).then(afterUnlock, () => voice.stop());
    return voice;
  }
  function playFootstep(visitorId = 'male') {
    if (!enabled || document.hidden) return null;
    const profile = visitorId === 'female' ? 'female' : 'male';
    const keys = profile === 'female' ? femaleFootstepKeys : footstepKeys;
    const choices = keys.map((_, index) => index).filter(index => index !== previousFootstep[profile]);
    previousFootstep[profile] = choices[Math.floor(Math.random() * choices.length)];
    // Original Audio3D notifiers disallow overlap. Also cancels undecoded voices.
    stopAll('footsteps');
    return play(keys[previousFootstep[profile]], { group: 'footsteps', maxDelay: 80 });
  }
  // A hidden tab suspends active samples with the animation; muted voices are discarded.
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) context.suspend().catch(() => {});
    else if (enabled) unlock();
  });
  const gestureOptions = { capture: true, passive: true };
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') unlock(event);
  }, gestureOptions);
  // Touch/pen activation occurs on release. click also covers keyboard,
  // assistive controls and browsers without Pointer Events.
  document.addEventListener('pointerup', event => {
    if (event.pointerType !== 'mouse') unlock(event);
  }, gestureOptions);
  document.addEventListener('touchend', unlock, gestureOptions);
  document.addEventListener('click', unlock, gestureOptions);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' && !event.ctrlKey && !event.metaKey && !event.altKey) unlock(event);
  }, true);
  window.SkyAudio = { prepare, unlock, play, playFootstep, stopAll, setEnabled,
    get enabled() { return enabled; },
    isReady: key => buffers.has(key),
    duration: key => buffers.get(key)?.duration || 0
  };
  // Fetching does not play audio or attempt to bypass the browser's gesture policy.
  Object.keys(files).forEach(key => load(key).catch(() => {}));
})();
