/* Original Toy Merchant: two short, user-triggered cover interactions. */
(() => {
  'use strict';
  function initialize() {
    const stage = document.querySelector('.game-stage');
    const mount = document.querySelector('.game-stage > .glider-flight');
    const figure = document.querySelector('.merchant-figure');
    const triggers = [...document.querySelectorAll('.toybox-trigger, .glider-trigger')];
    if (!stage || !mount || !figure || !triggers.length || mount.dataset.toysReady) return;
    mount.dataset.toysReady = 'true';
    const root = document.documentElement;
    const controls = triggers.map(trigger => ({ trigger, label: trigger.querySelector('span'),
      text: trigger.querySelector('span')?.textContent, disabled: trigger.disabled }));
    let runtime = null;
    let loading = null;
    let moduleRetries = 0;
    let generation = 0;
    let running = false;
    const status = document.createElement('span');
    status.className = 'toy-action-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    figure.parentElement.appendChild(status);
    async function loadStageModule() {
      let failure;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        // Chromium remembers a rejected import by URL for the whole page.
        // A fresh request is essential after a temporary download failure.
        const moduleUrl = './toy-merchant-stage.js?v=20261023-22'
          + (moduleRetries ? `&retry=${moduleRetries}` : '');
        try { return await import(moduleUrl); }
        catch (error) { failure = error; moduleRetries += 1; }
      }
      const error = new Error('Toy Merchant module download failed.', { cause: failure });
      error.code = 'TOY_MODULE_LOAD';
      throw error;
    }
    function failureMessage(error) {
      const english = window.SkyLanguage?.language === 'en';
      if (error.code === 'TOY_GRAPHICS_UNAVAILABLE') return english
        ? 'The browser could not start the 3D animation. Reload or check hardware acceleration.'
        : '浏览器暂时无法启动 3D 动画，请刷新页面或检查硬件加速。';
      if (error.code === 'TOY_MODULE_LOAD' || error.code === 'TOY_ASSET_LOAD') return english
        ? 'The toy animation could not download. Check your connection and try again.'
        : '玩具动作下载失败，请检查网络后重试。';
      if (error.code === 'TOY_ASSET_DECODE') return english
        ? 'The toy assets could not be read. Please reload and try again.'
        : '玩具素材未能读取，请刷新页面后重试。';
      return english ? 'The toy animation could not play. Please reload and try again.'
        : '玩具动作未能播放，请刷新页面后重试。';
    }
    function restore() {
      generation += 1;
      runtime?.stop();
      running = false;
      mount.classList.remove('is-playing');
      figure.classList.remove('is-performing');
      controls.forEach(({ trigger, label, text, disabled }) => {
        trigger.disabled = disabled;
        trigger.removeAttribute('aria-busy');
        trigger.classList.remove('is-flying');
        if (label) label.textContent = text;
      });
    }
    async function run(event) {
      if (running || stage.dataset.scene !== 'home' || root.classList.contains('sky-intro-active')) return;
      const kind = event.currentTarget.classList.contains('toybox-trigger') ? 'springboard' : 'glider';
      running = true;
      const token = ++generation;
      status.textContent = '';
      delete status.dataset.errorCode;
      controls.forEach(({ trigger, label }) => {
        trigger.disabled = true;
        trigger.setAttribute('aria-busy', 'true');
        if (trigger === event.currentTarget && label) label.textContent = runtime ? '安妮准备出发' : '安妮正在准备';
      });
      try {
        if (!loading) loading = loadStageModule()
          .then(module => module.createToyMerchantStage(mount))
          .then(value => { runtime = value; return value; })
          .catch(error => { loading = null; throw error; });
        const player = await loading;
        if (token !== generation || stage.dataset.scene !== 'home' || document.hidden) return;
        const bounds = stage.getBoundingClientRect();
        const rect = figure.getBoundingClientRect();
        if (!bounds.width || !rect.height) { restore(); return; }
        mount.classList.add('is-playing');
        figure.classList.add('is-performing');
        controls.forEach(({ trigger }) => trigger.classList.add('is-flying'));
        await player.play(kind, { x: (rect.left + rect.width / 2 - bounds.left) * 1280 / bounds.width,
          footY: (rect.bottom - bounds.top) * 720 / bounds.height,
          height: rect.height * 720 / bounds.height });
        if (token === generation) restore();
      } catch (error) {
        console.warn('Toy Merchant action failed.', error.code || 'TOY_ANIMATION_FAILED', error);
        if (token !== generation) return;
        restore();
        status.dataset.errorCode = error.code || 'TOY_ANIMATION_FAILED';
        status.textContent = failureMessage(error);
      }
    }
    triggers.forEach(trigger => trigger.addEventListener('click', run));
    window.addEventListener('sky:scenechange', () => { restore(); status.textContent = ''; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) restore(); });
    new MutationObserver(() => {
      if (root.classList.contains('sky-intro-active')) restore();
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('pagehide', () => { restore(); runtime?.dispose(); runtime = null; loading = null; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
