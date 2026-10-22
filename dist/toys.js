/* Toy Merchant's wooden glider: a user-triggered, single-flight Easter egg. */
(() => {
  'use strict';
  function initialize() {
    const triggers = [...document.querySelectorAll('.glider-trigger')];
    const flight = document.querySelector('.game-stage > .glider-flight');
    const stage = document.querySelector('.game-stage');
    if (!triggers.length || !flight || !stage || flight.dataset.gliderReady) return;
    flight.dataset.gliderReady = 'true';
    const controls = triggers.map(trigger => {
      const label = trigger.querySelector('span');
      return {
        trigger, label, idleText: label?.textContent || '放飞木制飞翼',
        idleAriaLabel: trigger.getAttribute('aria-label'),
        idleAriaBusy: trigger.getAttribute('aria-busy'),
        idleDisabled: trigger.disabled
      };
    });
    const root = document.documentElement;
    const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReduced = () => root.classList.contains('reduced-motion') ||
      (!root.classList.contains('full-motion') && systemMotion.matches);

    const craft = document.createElement('div');
    craft.className = 'glider-flight__craft';
    craft.innerHTML = `<svg viewBox="0 0 260 174" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sky-toy-canvas" x1="0" y1="0" x2=".35" y2="1">
          <stop stop-color="#bbae8a"/><stop offset=".45" stop-color="#d6c6a0"/><stop offset="1" stop-color="#87785d"/>
        </linearGradient>
        <linearGradient id="sky-toy-wood" x1="0" y1="0" x2="1" y2=".4">
          <stop stop-color="#422e22"/><stop offset=".45" stop-color="#b18c5f"/><stop offset="1" stop-color="#5a3e29"/>
        </linearGradient>
      </defs>
      <g stroke-linejoin="round" stroke-linecap="round">
        <path d="M128 34 119 144 147 148 139 36Z" fill="#3b2e25" stroke="#b18c5f" stroke-width="1.3"/>
        <path d="M119 132 96 158Q116 154 130 164Q143 156 165 160L143 135Z" fill="#a99b78" stroke="#64523d" stroke-width="1.6"/>
        <path d="m130 138 0 24" stroke="#493827" stroke-width="3"/>
        <path d="M15 78Q33 36 78 25Q111 15 130 20Q153 13 188 26Q230 40 248 78L215 98Q195 86 176 104Q153 92 132 113Q109 95 87 105Q67 88 45 99Z"
          fill="url(#sky-toy-canvas)" stroke="#544333" stroke-width="2"/>
        <path d="M16 78Q44 39 80 27L88 103Q65 88 45 98Z" fill="#817255" opacity=".5"/>
        <path d="M131 21 132 112Q154 92 177 103L188 27Q156 15 131 21Z" fill="#e0d0a6" opacity=".55"/>
        <path d="m53 68 27-8 8 27-27 5Z" fill="#b8a985" stroke="#6b5b43" stroke-width="1"/>
        <path d="m57 70 20-6 7 19-20 6Z" fill="none" stroke="#5b503c" stroke-width=".8" stroke-dasharray="2.1 3"/>
        <path d="M18 78Q39 34 79 25Q111 16 131 20Q157 14 190 27Q230 41 246 77"
          fill="none" stroke="#30271f" stroke-width="6"/>
        <path d="M18 77Q40 35 79 26Q111 17 131 21Q157 15 190 28Q228 42 246 77"
          fill="none" stroke="url(#sky-toy-wood)" stroke-width="3.7"/>
        <path d="m79 27 8 75m44-81 1 89m57-81-13 73M19 78l112-45 114 44" fill="none" stroke="#66503a" stroke-width="2.1"/>
        <path d="m80 27 9 75m43-80 2 87m55-79-12 70" fill="none" stroke="#cfb485" stroke-width=".7" opacity=".8"/>
        <path d="m46 96 85-61 83 60M88 103l44-68 44 68" fill="none" stroke="#4d4535" stroke-width=".7" opacity=".8"/>
        <path d="m20 80 24 16q22-11 43 6 23-9 45 8 23-18 44-8 20-17 39-7l29-16"
          fill="none" stroke="#514737" stroke-width=".85" stroke-dasharray="2.3 3.7" opacity=".8"/>
        <path d="m127 28 10 1m-10 3 10 1m-10 3 10 1m-10 3 10 1M74 26l7 2m-6 2 7 2m102-4 8 2m-9 2 8 2"
          stroke="#d3bd92" stroke-width="1.6"/>
        <path d="M99 70 112 135 151 135 164 71" fill="none" stroke="#3d3026" stroke-width="2.8"/>
        <path d="M100 70 113 134 151 134" fill="none" stroke="#b39870" stroke-width=".8"/>
        <path d="m125 112-4 21 14 8 8-12-6-17" fill="#68503e" stroke="#342920" stroke-width="2"/>
        <path d="m129 117 4 18" stroke="#b0966b" stroke-width="1.2"/>
        <path d="m136 48 10 12-7 9-10-12Z" fill="#7c4c44" opacity=".65"/>
      </g>
    </svg>`;
    flight.appendChild(craft);
    let animation = null;
    let timer = null;
    let running = false;
    let generation = 0;
    let lastReduced = prefersReduced();

    function clearFlight() {
      generation += 1;
      if (animation) animation.kill();
      animation = null;
      clearTimeout(timer);
      timer = null;
      if (window.gsap) gsap.killTweensOf(craft);
      craft.style.opacity = '0';
      flight.classList.remove('is-playing');
      running = false;
      controls.forEach(({ trigger, label, idleText, idleAriaLabel, idleAriaBusy, idleDisabled }) => {
        trigger.disabled = idleDisabled;
        trigger.classList.remove('is-flying');
        if (idleAriaBusy === null) trigger.removeAttribute('aria-busy');
        else trigger.setAttribute('aria-busy', idleAriaBusy);
        if (label) label.textContent = idleText;
        if (idleAriaLabel === null) trigger.removeAttribute('aria-label');
        else trigger.setAttribute('aria-label', idleAriaLabel);
      });
    }

    function fly(event) {
      if (running || !['home', 'lobby'].includes(stage.dataset.scene) || root.classList.contains('sky-intro-active')) return;
      const stageBounds = stage.getBoundingClientRect();
      const buttonBounds = event.currentTarget.getBoundingClientRect();
      if (!stageBounds.width || !stageBounds.height || !buttonBounds.width || !buttonBounds.height) return;
      const startX = Math.max(0, Math.min(1280, (buttonBounds.left + buttonBounds.width / 2 - stageBounds.left) * 1280 / stageBounds.width));
      const startY = Math.max(0, Math.min(720, (buttonBounds.top + buttonBounds.height / 2 - stageBounds.top) * 720 / stageBounds.height));
      clearFlight();
      running = true;
      const token = generation;
      const done = () => { if (token === generation) clearFlight(); };
      controls.forEach(({ trigger, label }) => {
        trigger.disabled = true;
        trigger.classList.add('is-flying');
        trigger.setAttribute('aria-busy', 'true');
        trigger.setAttribute('aria-label', '木制飞翼已放飞');
        if (label) label.textContent = '木翼已放飞';
      });
      flight.classList.add('is-playing');

      if (prefersReduced() || !window.gsap) {
        // A small, stationary acknowledgment preserves the interaction without a flight.
        craft.style.transform = `translate(${startX}px, ${startY}px) translate(-50%, -50%) rotate(-8deg) scale(.48)`;
        if (window.gsap) {
          animation = gsap.timeline({ onComplete: done });
          animation.to(craft, { opacity: .85, duration: .16 })
            .to(craft, { opacity: 0, duration: .22, delay: .6 });
        } else {
          craft.style.opacity = '.85';
          timer = setTimeout(done, 850);
        }
        return;
      }

      const progress = { value: 0 };
      const direction = startX >= 640 ? -1 : 1;
      const firstX = startX + direction * 130;
      const secondX = direction < 0 ? 410 : 870;
      const endX = direction < 0 ? -180 : 1460;
      const liftY = Math.max(88, startY - 250);
      const endY = Math.max(200, Math.min(400, startY - 75));
      const setPose = gsap.quickSetter(craft, 'css');
      gsap.set(craft, { xPercent: -50, yPercent: -50, x: startX, y: startY, scale: .74, rotation: direction * 9, opacity: 0 });
      animation = gsap.timeline({ onComplete: done });
      animation.to(craft, { opacity: 1, duration: .22, ease: 'power1.out' }, 0)
        .to(progress, {
          value: 1, duration: 3.9, ease: 'power1.inOut',
          onUpdate() {
            const t = progress.value;
            const u = 1 - t;
            // A broad cubic arc lifts over the room and leaves the opposite edge.
            const x = u * u * u * startX + 3 * u * u * t * firstX + 3 * u * t * t * secondX + t * t * t * endX;
            const y = u * u * u * startY + 3 * u * u * t * liftY + 3 * u * t * t * 135 + t * t * t * endY;
            const bank = (-9 - Math.sin(t * Math.PI * 1.15) * 12 + t * 20) * -direction;
            const scale = .74 + Math.sin(t * Math.PI) * .3;
            setPose({ x, y, rotation: bank, scale });
          }
        }, 0)
        .to(craft, { opacity: 0, duration: .45, ease: 'power1.in' }, 3.45);
    }

    triggers.forEach(trigger => trigger.addEventListener('click', fly));
    window.addEventListener('sky:scenechange', clearFlight);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearFlight(); });
    const motionChanged = () => {
      const next = prefersReduced();
      if (next !== lastReduced || root.classList.contains('sky-intro-active')) clearFlight();
      lastReduced = next;
    };
    new MutationObserver(motionChanged).observe(root, { attributes: true, attributeFilter: ['class'] });
    systemMotion.addEventListener('change', motionChanged);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
