(() => {
  'use strict';
  const dialog = document.querySelector('#visitor-choice');
  const cards = [...dialog.querySelectorAll('[data-visitor]')];
  const confirm = dialog.querySelector('.visitor-confirm');
  const cancel = dialog.querySelector('.visitor-cancel');
  const status = dialog.querySelector('.visitor-status');
  const formButton = document.querySelector('.visitor-form-button');
  const formStatus = document.querySelector('.visitor-form-status');
  const storageKey = 'sky-visitor-avatar';
  const valid = id => id === 'male' || id === 'female';
  const words = {
    zh: { title:'选择访客', group:'访客形象', male:'男性访客', female:'女性访客', maleSkin:'别样魅力', femaleSkin:'未至之人', enter:'进入大厅', back:'返回封面', preparing:'正在准备访客…', retry:'准备访客时遇到问题，请再试一次。', unavailable:'大厅正在准备，请稍后重试。', selected:'已选择', hood:'兜帽', removeHood:'摘下兜帽', wearHood:'戴上兜帽', formPreparing:'正在更换形态…', formRetry:'形态未能切换，请再试一次。' },
    en: { title:'Choose your visitor', group:'Visitor appearance', male:'Male visitor', female:'Female visitor', maleSkin:'Villain Charm', femaleSkin:'On the Way', enter:'Enter the lobby', back:'Back to cover', preparing:'Preparing your visitor…', retry:'Your visitor could not be prepared. Please try again.', unavailable:'The lobby is still preparing. Please try again shortly.', selected:'Selected', hood:'Hood', removeHood:'Lower hood', wearHood:'Raise hood', formPreparing:'Changing appearance…', formRetry:'The appearance could not be changed. Please try again.' },
  };
  let selected = null;
  try { const stored = localStorage.getItem(storageKey); if (valid(stored)) selected = stored; } catch { /* The choice works when storage is unavailable. */ }
  let pending = null;
  let sequence = 0;
  let busy = false;
  let statusKey = '';
  let previousFocus = null;
  let formBusy = false;
  let formSequence = 0;
  let formError = false;
  const language = () => window.SkyLanguage?.language === 'en' || document.documentElement.lang === 'en' ? 'en' : 'zh';
  const copy = () => words[language()];

  function update() {
    const text = copy();
    dialog.querySelector('#visitor-choice-title').textContent = text.title;
    dialog.querySelector('.visitor-options').setAttribute('aria-label', text.group);
    for (const card of cards) {
      const id = card.dataset.visitor;
      const checked = id === selected;
      card.setAttribute('aria-checked', String(checked));
      card.tabIndex = checked || (!selected && id === 'male') ? 0 : -1;
      card.disabled = busy;
      card.querySelector('.visitor-kind').textContent = text[id];
      card.querySelector('.visitor-skin').textContent = text[`${id}Skin`];
      card.querySelector('.visitor-selected-label').textContent = checked ? text.selected : '';
      card.querySelector('img').alt = `${text[id]} · ${text[`${id}Skin`]}`;
    }
    confirm.disabled = busy || !valid(selected);
    confirm.textContent = busy ? text.preparing : text.enter;
    confirm.setAttribute('aria-busy', String(busy));
    cancel.textContent = text.back;
    status.textContent = statusKey ? text[statusKey] : '';
    status.hidden = !statusKey;
    const visitor = window.SkyRoom?.visitor;
    formButton.hidden = visitor?.id !== 'female';
    formButton.disabled = formBusy || Boolean(pending);
    formButton.setAttribute('aria-busy', String(formBusy));
    formButton.textContent = formBusy ? `${text.hood}…` : text.hood;
    const formAction = formBusy ? text.formPreparing : text[visitor?.form === 'hoodless' ? 'wearHood' : 'removeHood'];
    formButton.setAttribute('title', formAction);
    formButton.setAttribute('aria-label', formAction);
    formStatus.textContent = formError ? text.formRetry : '';
    formStatus.hidden = !formError || visitor?.id !== 'female';
  }

  function finish(result = null) {
    if (!pending) return;
    const resolve = pending.resolve;
    pending = null;
    sequence += 1;
    if (!result) window.SkyRoom?.cancelVisitorSelection?.();
    busy = false;
    statusKey = '';
    if (dialog.open) dialog.close();
    document.documentElement.classList.remove('sky-visitor-choice-open');
    window.dispatchEvent(new CustomEvent('sky:visitorchoicechange', { detail: { open:false } }));
    update();
    if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus({ preventScroll:true });
    previousFocus = null;
    resolve(result);
  }

  function request() {
    if (document.querySelector('.game-stage')?.dataset.scene !== 'home') return Promise.resolve(null);
    if (pending) return pending.promise;
    if (formBusy) window.SkyRoom?.cancelVisitorSelection?.();
    formSequence += 1;
    formBusy = false;
    formError = false;
    const current = window.SkyRoom?.visitor?.id;
    if (valid(current)) selected = current;
    busy = false;
    statusKey = '';
    previousFocus = document.activeElement;
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    pending = { resolve, promise };
    sequence += 1;
    update();
    document.documentElement.classList.add('sky-visitor-choice-open');
    window.dispatchEvent(new CustomEvent('sky:visitorchoicechange', { detail: { open:true } }));
    try {
      dialog.showModal();
      (cards.find(card => card.dataset.visitor === selected) || cards[0]).focus({ preventScroll:true });
    } catch (error) {
      console.warn('[SkyVisitorChoice] Could not open the appearance choice.', error);
      finish();
    }
    return promise;
  }

  function choose(id, focus = false) {
    if (busy || !valid(id)) return;
    selected = id;
    statusKey = '';
    update();
    if (focus) cards.find(card => card.dataset.visitor === id).focus({ preventScroll:true });
  }
  cards.forEach(card => card.addEventListener('click', () => choose(card.dataset.visitor)));
  dialog.querySelector('.visitor-options').addEventListener('keydown', event => {
    if (busy || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const id = event.key === 'Home' ? 'male' : event.key === 'End' ? 'female' : selected === 'male' ? 'female' : 'male';
    choose(id, true);
  });
  confirm.addEventListener('click', async () => {
    if (!pending || busy || !valid(selected)) return;
    if (document.querySelector('.game-stage')?.dataset.scene !== 'home') { finish(); return; }
    const generation = sequence;
    const id = selected;
    busy = true;
    statusKey = '';
    update();
    try {
      if (typeof window.SkyRoom?.selectVisitor !== 'function') {
        statusKey = 'unavailable';
        throw new Error('Visitor loader is not ready.');
      }
      await window.SkyRoom.selectVisitor(id);
      if (!pending || generation !== sequence) return;
      try { localStorage.setItem(storageKey, id); } catch { /* Remembering the appearance is optional. */ }
      finish(id);
    } catch (error) {
      if (!pending || generation !== sequence) return;
      console.warn('[SkyVisitorChoice] Could not prepare the selected visitor.', error);
      busy = false;
      statusKey ||= 'retry';
      update();
      confirm.focus({ preventScroll:true });
    }
  });
  cancel.addEventListener('click', () => finish());
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
  document.addEventListener('keydown', event => {
    if (!pending || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finish();
  }, true);
  // A close event is queued by the browser and may arrive after the next request.
  dialog.addEventListener('close', () => { if (!dialog.open && pending) finish(); });
  window.addEventListener('popstate', () => finish());
  window.addEventListener('sky:scenechange', event => { if (event.detail.scene !== 'home') finish(); });
  window.addEventListener('sky:languagechange', update);
  window.addEventListener('sky:visitorchange', () => { formError = false; update(); });
  formButton.addEventListener('click', async () => {
    const visitor = window.SkyRoom?.visitor;
    if (formBusy || pending || visitor?.id !== 'female') return;
    const generation = ++formSequence;
    const form = visitor.form === 'hoodless' ? 'hooded' : 'hoodless';
    formBusy = true;
    formError = false;
    update();
    try {
      if (typeof window.SkyRoom?.setVisitorForm !== 'function') throw new Error('Visitor forms are not ready.');
      await window.SkyRoom.setVisitorForm(form);
    } catch (error) {
      if (generation !== formSequence) return;
      console.warn('[SkyVisitorChoice] Could not change the visitor appearance.', error);
      formError = true;
    } finally {
      if (generation === formSequence) { formBusy = false; update(); }
    }
  });
  window.SkyVisitorChoice = { request, cancel:() => finish(), get open() { return Boolean(pending); } };
  update();
})();
