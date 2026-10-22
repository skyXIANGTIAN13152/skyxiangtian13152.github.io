(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let storedMotion = null;
  try { storedMotion = localStorage.getItem('sky-motion'); } catch (_) {}
  let reducedMotion = storedMotion === null ? systemMotion.matches : storedMotion === 'reduced';
  const motionButton = $('.motion-toggle');
  const applyMotion = () => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    document.documentElement.classList.toggle('full-motion', !reducedMotion);
    motionButton.setAttribute('aria-pressed', String(reducedMotion));
    motionButton.textContent = reducedMotion ? '恢复动效' : '减少动效';
    $('.entrance-motion-note').hidden = !reducedMotion;
    if (reducedMotion) window.SkyIntro?.skip();
  };
  applyMotion();
  motionButton.addEventListener('click', () => {
    reducedMotion = !reducedMotion;
    storedMotion = reducedMotion ? 'reduced' : 'full';
    try { localStorage.setItem('sky-motion', reducedMotion ? 'reduced' : 'full'); } catch (_) {}
    applyMotion();
  });
  systemMotion.addEventListener('change', (event) => {
    if (storedMotion === null) { reducedMotion = event.matches; applyMotion(); }
  });

  const menu = $('.menu-toggle');
  const mobileNav = $('.mobile-nav');
  const closeMenu = () => { menu.setAttribute('aria-expanded', 'false'); mobileNav.hidden = true; };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); mobileNav.hidden = !open;
  });
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menu.focus(); }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) closeMenu();
  });

  const stage = $('.game-stage');
  const fitStage = () => {
    stage.style.setProperty('--stage-scale', Math.min(innerWidth / 1280, innerHeight / 720));
  };
  fitStage();
  window.addEventListener('resize', fitStage, { passive: true });
  const sections = [...document.querySelectorAll('main > section')];
  const navLinks = [...document.querySelectorAll('.desktop-nav a, .scene-progress a')];
  const titles = { home: '序章', lobby: '个人大厅', about: '关于我', work: '作品集', study: '专业学习', interests: '兴趣爱好' };
  const lobby = $('#lobby');
  const room = $('.lobby-room');
  const hotspots = [...document.querySelectorAll('.lobby-hotspot')];
  hotspots.forEach(link => {
    const highlight = () => { lobby.dataset.highlight = link.dataset.prop; };
    const clearHighlight = () => { delete lobby.dataset.highlight; };
    link.addEventListener('pointerenter', highlight);
    link.addEventListener('pointerleave', clearHighlight);
    link.addEventListener('focus', highlight);
    link.addEventListener('blur', clearHighlight);
  });
  let currentScene = 'home';
  let transitioning = false;
  let navigationVersion = 0;
  const showScene = (id) => {
    currentScene = id;
    stage.dataset.scene = id;
    lobby.classList.remove('is-entering');
    delete lobby.dataset.highlight;
    window.dispatchEvent(new CustomEvent('sky:scenechange', { detail: { scene: id } }));
    sections.forEach(section => {
      const visible = section.id === id;
      section.classList.toggle('is-active', visible);
      section.inert = !visible;
      section.setAttribute('aria-hidden', String(!visible));
    });
    navLinks.forEach(link => {
      const active = link.hash === `#${id}`;
      link.classList.toggle('active', active);
      link.classList.toggle('current', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('.scene-caption').textContent = id === 'home' ? '在 UNSW builder space 制作' : id === 'lobby' ? '点击大厅中的文字，开始探索' : titles[id];
    document.title = `Sky 天 · ${titles[id]}`;
  };
  const focusScene = (id) => $(`#${id}`).querySelector('h1,h2').focus({ preventScroll: true });
  const transitionTo = async (id, updateHistory = true) => {
    if (!Object.hasOwn(titles, id)) id = 'home';
    if (transitioning) {
      if (updateHistory) return;
      navigationVersion += 1;
      window.SkyIntro?.skip();
      lobby.classList.remove('is-entering');
      transitioning = false;
    }
    if (id === currentScene) return;
    const version = ++navigationVersion;
    const fromScene = currentScene;
    transitioning = true;
    closeMenu();
    try {
      if (fromScene === 'lobby' && id !== 'lobby' && id !== 'home' && !reducedMotion) {
        const entrance = hotspots.find(link => link.hash === `#${id}`);
        room.style.transformOrigin = entrance?.dataset.camera || '50% 50%';
        lobby.classList.add('is-entering');
        await new Promise(resolve => setTimeout(resolve, 300));
        if (version !== navigationVersion) return;
      }
      if (id === 'lobby' && fromScene === 'home' && !reducedMotion && window.SkyIntro) {
        await SkyIntro.play({
          caption: '匹配成功',
          onCovered: () => showScene(id),
          onReveal: () => revealLobby()
        });
      } else {
        showScene(id);
        if (!reducedMotion && window.gsap) {
          gsap.fromTo(`#${id} > .container`, { x: id === 'home' ? -30 : 40, opacity: 0 }, { x: 0, opacity: 1, duration: .7, ease: 'power2.out', clearProps: 'transform,opacity' });
        }
      }
      if (version !== navigationVersion) return;
      if (updateHistory) {
        try { history.pushState({ scene: id }, '', `#${id}`); }
        catch (_) { location.hash = id; }
      }
      focusScene(id);
    } finally { if (version === navigationVersion) transitioning = false; }
  };
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const id = link.getAttribute('href').slice(1);
    if (!Object.hasOwn(titles, id)) return;
    link.addEventListener('click', event => { event.preventDefault(); transitionTo(id); });
  });
  $('.restore-entrance').addEventListener('click', () => {
    reducedMotion = false;
    storedMotion = 'full';
    try { localStorage.setItem('sky-motion', 'full'); } catch (_) {}
    applyMotion();
    transitionTo('lobby');
  });
  window.addEventListener('popstate', () => transitionTo(location.hash.slice(1) || 'home', false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !transitioning && currentScene !== 'home' && currentScene !== 'lobby') transitionTo('lobby');
  });
  // A shared room URL must still start with the cover and its entrance sequence.
  // Scene hashes remain available for navigation within the current visit.
  showScene('home');
  if (location.hash && location.hash !== '#home') {
    try { history.replaceState({ scene: 'home' }, '', location.pathname + location.search); }
    catch (_) { /* The cover remains usable if history updates are unavailable. */ }
  }
  const fullscreenButton = $('.fullscreen-button');
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) { notify('可使用浏览器的全屏功能打开。'); }
  });
  document.addEventListener('fullscreenchange', () => {
    const label = document.fullscreenElement ? '退出全屏' : '进入全屏';
    fullscreenButton.setAttribute('aria-label', label);
    fullscreenButton.title = label;
    fitStage();
  });

  const demo = $('.project-visual');
  const connectButton = $('.connection-toggle');
  let connected = true;
  connectButton.addEventListener('click', () => {
    connected = !connected;
    demo.classList.toggle('disconnected', !connected);
    connectButton.setAttribute('aria-pressed', String(connected));
    connectButton.firstChild.textContent = connected ? '断开副屏' : '连接副屏';
    $('#screen-status').textContent = connected ? '双屏已连接' : '副屏已断开 · 壁纸已切换';
  });

  const notify = (message) => {
    const node = $('.notification');
    node.textContent = message;
    node.classList.add('visible');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => node.classList.remove('visible'), 3000);
  };
  const lobbyMusic = $('#lobby-music');
  lobbyMusic.volume = .35;
  let audioOn = true;
  let audioAttempt = 0;
  let audioPending = false;
  const soundButton = $('.sound-button');
  const updateSound = () => {
    soundButton.setAttribute('aria-pressed', String(audioOn));
    soundButton.setAttribute('aria-label', audioOn ? '关闭大厅音乐' : '开启大厅音乐');
    soundButton.title = `${audioOn ? '关闭' : '开启'}大厅音乐 · 庄园`;
    $('.sound-label').textContent = audioOn ? '声音开' : '声音关';
  };
  const startMusic = async (silent = false) => {
    if (!audioOn || audioPending || !lobbyMusic.paused) return;
    audioPending = true;
    const attempt = ++audioAttempt;
    soundButton.setAttribute('aria-busy', 'true');
    try {
      await lobbyMusic.play();
    } catch (error) {
      if (attempt === audioAttempt && audioOn) {
        // Autoplay policy postpones playback until the first visitor gesture;
        // it does not turn the visitor's music preference off.
        if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
          audioOn = false;
          updateSound();
          if (!silent) notify('音乐暂未播放，请再次点击声音开关。');
        }
      }
    } finally {
      if (attempt === audioAttempt) {
        audioPending = false;
        soundButton.setAttribute('aria-busy', 'false');
      }
    }
  };
  const pauseMusic = () => {
    audioAttempt += 1;
    audioPending = false;
    lobbyMusic.pause();
    soundButton.setAttribute('aria-busy', 'false');
  };
  soundButton.addEventListener('click', () => {
    audioOn = !audioOn;
    updateSound();
    if (audioOn) startMusic();
    else pauseMusic();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseMusic();
    else if (audioOn) startMusic();
  });
  const beginOnGesture = (event) => {
    if (event.target.closest('.sound-button') || document.hidden) return;
    if (event.type === 'keydown' && (event.ctrlKey || event.metaKey || event.altKey)) return;
    if (audioOn && lobbyMusic.paused) startMusic(true);
  };
  document.addEventListener('click', beginOnGesture);
  document.addEventListener('keydown', beginOnGesture);
  updateSound();
  startMusic(true);

  const revealLobby = () => {
    if (!window.gsap || reducedMotion) return;
    gsap.fromTo('.lobby-hotspot', { opacity: 0 }, { opacity: 1, duration: 1.1, stagger: .12, ease: 'power2.out', clearProps: 'opacity' });
  };
  const revealHero = () => {
    if (!window.gsap || reducedMotion) return;
    gsap.fromTo('.hero-copy', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power2.out', clearProps: 'opacity,transform' });
    gsap.fromTo('.merchant-display', { opacity: 0 }, { opacity: 1, duration: 1.3, ease: 'power2.out', clearProps: 'opacity' });
  };
  const playIntro = async (replay = false) => {
    if (transitioning) return;
    if (reducedMotion) { if (replay) notify('已启用减少动效，可点击底部恢复动效后重播。'); return; }
    if (!window.SkyIntro) { revealLobby(); return; }
    const version = ++navigationVersion;
    transitioning = true;
    try {
      await window.SkyIntro.play({ caption: '匹配成功', onCovered: () => showScene('lobby') });
      if (version === navigationVersion) revealLobby();
    } finally { if (version === navigationVersion) transitioning = false; }
  };
  $('.replay').addEventListener('click', () => playIntro(true));
  if (currentScene === 'home') revealHero();
})();
