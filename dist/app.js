(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const diaryReady = import('./assets/diary-original/diary-transition.js?v=20261023-18').then(api => {
    window.SkyDiary = api;
    api.preload();
    return api;
  }).catch(() => null);
  // Deferred module loading must also finish when a visitor clicks immediately.
  const roomReady = new Promise(resolve => {
    const loaded = () => resolve(window.SkyRoom?.whenReady);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loaded, { once: true });
    else loaded();
  });
  // The manor always plays its game animations, including after an older visit
  // saved a reduced-motion choice. Background-tab suspension remains independent.
  document.documentElement.classList.remove('reduced-motion');
  document.documentElement.classList.add('full-motion');
  try { localStorage.removeItem('sky-motion'); } catch (_) {}

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
  const titles = { home: '序章', lobby: '个人大厅', about: '关于我', work: '作品集', study: '专业学习', interests: '兴趣爱好', games: '游戏合集', recommendations: '项目珍藏', people: '名人墙', pets: '宠物小屋' };
  const lobby = $('#lobby');
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
  let diaryInProgress = false;
  const readingOrder = ['about', 'work', 'study', 'interests', 'games', 'recommendations', 'people', 'pets'];
  const visibleScene = id => !readingOrder.includes(id) || window.SkyContent?.isVisible(id) !== false;
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
    $('.scene-caption').textContent = id === 'home' ? window.SkyContent?.data?.profile.footer ?? '启迪于 UNSW Builder Space Club' : id === 'lobby' ? '' : titles[id];
    document.title = `${window.SkyContent?.data?.profile.name || 'Sky 天'} · ${titles[id]}`;
  };
  const focusScene = (id) => $(`#${id}`).querySelector('h1,h2').focus({ preventScroll: true });
  const transitionTo = async (id, updateHistory = true) => {
    if (!Object.hasOwn(titles, id)) id = 'home';
    if (!visibleScene(id)) id = 'lobby';
    if (transitioning) {
      if (updateHistory) return;
      navigationVersion += 1;
      window.SkyIntro?.skip();
      window.SkyDiary?.cancel();
      window.SkyAudio?.stopAll('navigation');
      stage.inert = false;
      diaryInProgress = false;
      transitioning = false;
    }
    if (id === currentScene) {
      if (!updateHistory) { showScene(id); focusScene(id); }
      return;
    }
    const version = ++navigationVersion;
    const fromScene = currentScene;
    transitioning = true;
    const reading = !['home', 'lobby'].includes(id);
    const wasReading = !['home', 'lobby'].includes(fromScene);
    window.SkyAudio?.stopAll('intro');
    window.SkyAudio?.stopAll('navigation');
    const pageSound = readingOrder.indexOf(id) < readingOrder.indexOf(fromScene) ? 'pageBack' : 'pageTurn';
    window.SkyAudio?.play(fromScene === 'lobby' && reading ? 'diaryOpen' : id === 'lobby' && wasReading ? 'diaryClose' : wasReading && reading ? pageSound : 'click', { group: 'navigation' });
    window.dispatchEvent(new CustomEvent('sky:transitionstart'));
    closeMenu();
    try {
      if (fromScene === 'lobby' && reading) {
        diaryInProgress = true;
        stage.inert = true;
        const diary = await diaryReady;
        if (version !== navigationVersion) return;
        await diary?.play({ title: titles[id], onReveal: () => {
          if (version === navigationVersion) showScene(id);
        } });
        if (version !== navigationVersion) return;
        // Missing assets and a mid-transition motion preference still reveal the page.
        if (currentScene !== id) showScene(id);
      } else if (id === 'lobby' && fromScene === 'home' && window.SkyIntro) {
        await SkyIntro.play({
          caption: '',
          ready: roomReady,
          onCovered: () => showScene(id),
          onReveal: () => revealLobby()
        });
      } else {
        showScene(id);
        if (window.gsap) {
          gsap.fromTo(`#${id} > .container`, { x: id === 'home' ? -30 : 40, opacity: 0 }, { x: 0, opacity: 1, duration: .7, ease: 'power2.out', clearProps: 'transform,opacity' });
        }
      }
      if (version !== navigationVersion) return;
      if (updateHistory) {
        try { history.pushState({ scene: id }, '', `#${id}`); }
        catch (_) { location.hash = id; }
      }
      stage.inert = false;
      focusScene(id);
    } finally {
      if (version === navigationVersion) {
        transitioning = false;
        diaryInProgress = false;
        stage.inert = false;
      }
    }
  };
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const id = link.getAttribute('href').slice(1);
    if (!Object.hasOwn(titles, id)) return;
    link.addEventListener('click', event => { event.preventDefault(); transitionTo(id); });
  });
  window.addEventListener('popstate', () => transitionTo(location.hash.slice(1) || 'home', false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && diaryInProgress) {
      navigationVersion += 1;
      window.SkyDiary?.cancel();
      window.SkyAudio?.stopAll('navigation');
      diaryInProgress = transitioning = false;
      stage.inert = false;
      showScene('lobby');
      focusScene('lobby');
      return;
    }
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
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const updateFullscreen = () => {
    const active = Boolean(fullscreenElement());
    const label = active ? '退出全屏' : '进入全屏';
    fullscreenButton.setAttribute('aria-label', label);
    fullscreenButton.setAttribute('aria-pressed', String(active));
    fullscreenButton.title = label;
    fitStage();
  };
  fullscreenButton.addEventListener('click', async () => {
    if (fullscreenButton.disabled) return;
    fullscreenButton.disabled = true;
    try {
      const active = fullscreenElement();
      const target = active ? document : document.documentElement;
      const action = active ? document.exitFullscreen || document.webkitExitFullscreen : target.requestFullscreen || target.webkitRequestFullscreen;
      if (!action) { notify('当前浏览器不支持网页全屏，可使用浏览器菜单或横屏查看。'); return; }
      await action.call(target);
      updateFullscreen();
    } catch (_) { notify('浏览器未允许进入全屏，请在浏览器菜单中开启全屏。'); }
    finally { fullscreenButton.disabled = false; }
  });
  document.addEventListener('fullscreenchange', updateFullscreen);
  document.addEventListener('webkitfullscreenchange', updateFullscreen);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !fullscreenElement()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) Promise.resolve(exit.call(document)).catch(() => notify('请点击全屏按钮退出。'));
  }, true);
  updateFullscreen();

  document.addEventListener('click', event => {
    const connectButton = event.target.closest('.connection-toggle');
    if (!connectButton) return;
    const demo = connectButton.closest('.project-visual');
    const connected = demo.classList.toggle('disconnected') === false;
    connectButton.setAttribute('aria-pressed', String(connected));
    connectButton.firstChild.textContent = connected ? '断开副屏' : '连接副屏';
    demo.querySelector('#screen-status').textContent = connected ? '双屏已连接' : '副屏已断开 · 壁纸已切换';
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
  let soundUserChanged = false;
  let audioAttempt = 0;
  let audioPending = false;
  const soundButton = $('.sound-button');
  const updateSound = () => {
    soundButton.setAttribute('aria-pressed', String(audioOn));
    soundButton.setAttribute('aria-label', audioOn ? '关闭声音，包括音乐和音效' : '开启声音，包括音乐和音效');
    soundButton.title = soundButton.getAttribute('aria-label');
    $('.sound-label').textContent = audioOn ? '声音开' : '声音关';
  };
  const startMusic = async (silent = false) => {
    if (!audioOn || document.hidden || audioPending || !lobbyMusic.paused) return;
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
          if (!silent) notify(window.SkyLanguage?.language === 'en' ? 'The music could not start. Please try the sound button again.' : '背景音乐暂未播放，请再次点击声音开关。');
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
  const switchSceneMusic = (scene) => {
    const track = scene === 'home' ? 'login' : 'apartment';
    const source = `assets/audio/identity-v-${track}.mp3`;
    if (lobbyMusic.getAttribute('src') !== source) {
      // Reuse the media element unlocked by the visitor's first gesture. Abort
      // the old pending play before replacing its source, so tracks never overlap.
      pauseMusic();
      lobbyMusic.src = source;
      lobbyMusic.load();
    }
    lobbyMusic.dataset.musicScene = track;
    if (audioOn && !document.hidden) startMusic(true);
  };
  window.addEventListener('sky:scenechange', event => switchSceneMusic(event.detail.scene));
  soundButton.addEventListener('click', () => {
    soundUserChanged = true;
    audioOn = !audioOn;
    window.SkyAudio?.setEnabled(audioOn);
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
  document.addEventListener('click', event => {
    const control = event.target.closest('button,a[href]');
    // Navigation, E and the touch-read button share transitionTo's single accepted cue.
    if (!control || control.disabled || control.matches('.sound-button,.room-interact,.room-touch-read,a[href^="#"]')) return;
    window.SkyAudio?.play('click', { group: 'interface' });
  });
  updateSound();
  switchSceneMusic(currentScene);

  const applyPublishedContent = () => {
    const content = window.SkyContent?.data;
    if (!content) return;
    for (const key of readingOrder) titles[key] = content.sections[key].title;
    lobbyMusic.volume = content.settings.musicVolume;
    if (!soundUserChanged) {
      audioOn = content.settings.musicEnabled;
      window.SkyAudio?.setEnabled(audioOn);
      updateSound();
      if (audioOn) startMusic(true); else pauseMusic();
    }
    if (!visibleScene(currentScene)) {
      navigationVersion += 1;
      window.SkyDiary?.cancel();
      window.SkyAudio?.stopAll('navigation');
      transitioning = diaryInProgress = false;
      stage.inert = false;
      showScene('lobby');
    } else showScene(currentScene);
  };
  window.addEventListener('sky:contentchange', applyPublishedContent);
  applyPublishedContent();

  const revealLobby = () => {
    if (!window.gsap) return;
    gsap.fromTo('.lobby-hotspot', { opacity: 0 }, { opacity: 1, duration: 1.1, stagger: .12, ease: 'power2.out', clearProps: 'opacity' });
  };
  const revealHero = () => {
    if (!window.gsap) return;
    gsap.fromTo('.hero-copy', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power2.out', clearProps: 'opacity,transform' });
    gsap.fromTo('.merchant-display', { opacity: 0 }, { opacity: 1, duration: 1.3, ease: 'power2.out', clearProps: 'opacity' });
  };
  if (currentScene === 'home') revealHero();
})();
