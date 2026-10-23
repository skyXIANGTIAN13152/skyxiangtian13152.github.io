/**
 * Original 2022 hall_ei_entrance.csb entrance/exit keyframes.
 * Original CSB MD5: 0b0cfbe48c73e54a7c33bd3e0f9fb7e9.
 * Only the three original appearance sprites, leaf ornaments and title tracks
 * are transferred. Personal text, viewport placement and the dark page mask
 * are browser adaptations. This is NOT a claim of the entire old diary scene.
 */
const FOG_URL = new URL('./diary-fog.png', import.meta.url).href;
const SIDE_URL = new URL('./diary-side.png', import.meta.url).href;
const CSS_URL = new URL('./diary-transition.css', import.meta.url).href;
const FPS = 60 * 0.5; // Cocos ActionTimeline frame interval 1/60, source speed .5.
const IN_END = 15;
const OUT_START = 35;
const OUT_END = 50;
let active = null;
let assetPromise = null;
let stylePromise = null;

function imageReady(url) {
  return new Promise(resolve => {
    const image = new Image();
    const finish = () => { clearTimeout(timeout); image.onload = image.onerror = null; resolve(image.naturalWidth > 0); };
    const timeout = setTimeout(finish, 4000);
    image.onload = image.onerror = finish;
    image.src = url;
  });
}

export function preload() {
  if (!stylePromise) {
    stylePromise = new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS_URL;
      link.dataset.originalDiaryStyle = '';
      const finish = success => { clearTimeout(timeout); link.onload = link.onerror = null; resolve(success); };
      const timeout = setTimeout(() => finish(false), 4000);
      link.onload = () => finish(true);
      link.onerror = () => finish(false);
      document.head.append(link);
    });
  }
  assetPromise ||= Promise.all([stylePromise, imageReady(FOG_URL), imageReady(SIDE_URL)]);
  return assetPromise;
}

// All listed source keyframes use linear easing (0), or no easing (-1).
function sample(keys, frame) {
  if (frame <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (frame <= b[0]) {
      const t = (frame - a[0]) / (b[0] - a[0]);
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * t);
    }
  }
  return keys.at(-1).slice(1);
}

const FOG = [
  { name: 'ani_fog_1', flips: [1, 1], scale: [[0, .8, .8], [5, 1.5, 1.5], [15, 2.2, 2.2]], position: [[0, 105, 45], [5, 100, 45], [15, 80, 45]] },
  { name: 'ani_fog_2', flips: [-1, -1], scale: [[0, .8, .8], [5, 1.5, 1.5], [15, 2.2, 2.2]], position: [[0, 95, 45], [5, 100, 45], [15, 120, 45]] },
  { name: 'ani_fog_3', flips: [1, -1], scale: [[0, 1.2, .8], [5, 1.2, 1.5], [15, 1.6, 3]], position: [[0, 100, 45]] },
];
const FOG_ALPHA = [[0, 0], [5, 1], [15, 0]];
const TITLE_ALPHA = [[5, 0], [15, 1]];
const BUTTON_SCALE = [[5, .9], [15, 1], [35, 1], [50, 1.1]];
const BUTTON_ALPHA = [[35, 1], [50, 0]];

function createLayer(title) {
  const layer = document.createElement('div');
  layer.className = 'original-diary-transition';
  layer.setAttribute('aria-hidden', 'true');
  const mask = document.createElement('div');
  mask.className = 'original-diary-mask';
  const stage = document.createElement('div');
  stage.className = 'original-diary-stage';
  const button = document.createElement('div');
  button.className = 'original-diary-source-button';
  const fog = FOG.map(spec => {
    const image = document.createElement('img');
    image.className = 'original-diary-fog';
    image.src = FOG_URL;
    image.alt = '';
    image.draggable = false;
    image.dataset.sourceNode = spec.name;
    button.append(image);
    return image;
  });
  const text = document.createElement('span');
  text.className = 'original-diary-personal-title';
  text.textContent = title;
  text.dataset.sourceNode = 'img_text_ei';
  button.append(text);
  const sides = [false, true].map((flipped, i) => {
    const image = document.createElement('img');
    image.className = 'original-diary-side';
    image.src = SIDE_URL;
    image.alt = '';
    image.draggable = false;
    image.style.left = `${i ? 156 : 44}px`;
    image.style.transform = `translate(-50%, -50%) scale(${flipped ? -.6 : .6}, .6)`;
    image.dataset.sourceNode = `img_side_${i + 1}`;
    button.append(image);
    return image;
  });
  stage.append(button);
  layer.append(mask, stage);
  document.body.append(layer);
  return { layer, mask, button, text, fog, sides };
}

function draw(nodes, frame, exiting = false) {
  const contentAlpha = sample(TITLE_ALPHA, frame)[0];
  nodes.text.style.opacity = contentAlpha;
  for (const side of nodes.sides) side.style.opacity = contentAlpha;
  nodes.button.style.transform = `scale(${sample(BUTTON_SCALE, frame)[0]})`;
  nodes.button.style.opacity = sample(BUTTON_ALPHA, frame)[0];
  FOG.forEach((spec, i) => {
    const [x, y] = sample(spec.position, frame);
    const [sx, sy] = sample(spec.scale, frame);
    nodes.fog[i].style.left = `${x}px`;
    nodes.fog[i].style.top = `${90 - y}px`;
    nodes.fog[i].style.opacity = sample(FOG_ALPHA, frame)[0];
    nodes.fog[i].style.transform = `translate(-50%, -50%) scale(${sx * spec.flips[0]}, ${sy * spec.flips[1]})`;
  });
  // Only this viewport-wide black mask is added for navigation in the website.
  nodes.mask.style.opacity = exiting ? Math.max(0, (OUT_END - frame) / (OUT_END - OUT_START)) : Math.min(1, frame / IN_END);
}

/** Cancel pending loads, animation and callback. Never reveals a cancelled page. */
export function cancel() {
  const state = active;
  if (!state) return;
  active = null;
  cancelAnimationFrame(state.raf);
  state.nodes?.layer.remove();
  state.signal?.removeEventListener('abort', state.abort);
  state.resolve({ completed: false, revealed: state.revealed });
}

/**
 * Resolves after the original 15-frame entrance + 15-frame exit (1000 ms).
 * onReveal runs exactly once after the entrance; it may return a Promise.
 * The gap between the two source clips is a browser navigation boundary.
 */
export function play({ onReveal = () => {}, title = '个人档案', signal } = {}) {
  cancel();
  return new Promise(resolve => {
    const state = { resolve, signal, nodes: null, raf: 0, revealed: false, abort: null };
    active = state;
    state.abort = cancel;
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', state.abort, { once: true });
    const isActive = () => active === state;
    const finish = () => {
      if (!isActive()) return;
      active = null;
      cancelAnimationFrame(state.raf);
      state.nodes?.layer.remove();
      signal?.removeEventListener('abort', state.abort);
      resolve({ completed: true, revealed: state.revealed });
    };
    const fail = error => {
      if (!isActive()) return;
      cancel();
      // Do not leave the navigation callback unhandled or an opaque layer stuck.
      console.error('Diary navigation failed', error);
    };
    const reveal = async () => {
      if (!isActive() || state.revealed) return false;
      state.revealed = true;
      await onReveal();
      return isActive();
    };
    const exit = () => {
      const started = performance.now();
      const tick = now => {
        if (!isActive()) return;
        const frame = Math.min(OUT_END, OUT_START + (now - started) * FPS / 1000);
        draw(state.nodes, frame, true);
        if (frame >= OUT_END) finish(); else state.raf = requestAnimationFrame(tick);
      };
      state.raf = requestAnimationFrame(tick);
    };
    preload().then(async loaded => {
      if (!isActive()) return;
      if (!loaded.every(Boolean)) {
        if (await reveal()) finish();
        return;
      }
      state.nodes = createLayer(title);
      draw(state.nodes, 0);
      const started = performance.now();
      const tick = now => {
        if (!isActive()) return;
        const frame = Math.min(IN_END, (now - started) * FPS / 1000);
        draw(state.nodes, frame);
        if (frame >= IN_END) reveal().then(ok => { if (ok) exit(); }).catch(fail);
        else state.raf = requestAnimationFrame(tick);
      };
      state.raf = requestAnimationFrame(tick);
    }).catch(fail);
  });
}
