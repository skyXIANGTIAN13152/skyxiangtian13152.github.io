/* Small, isolated browser demonstrations. No account, file-system or microphone access. */
const mounted = new WeakMap();
let serial = 0;
const el = (tag, className = '', text) => {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const button = (label, action, className = '') => {
  const control = el('button', className, label); control.type = 'button';
  if (action) control.addEventListener('click', action);
  return control;
};
const safeLink = value => {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
};
const image = (src, alt, className = '') => { const node = el('img', className); node.src = src; node.alt = alt; node.loading = 'lazy'; node.decoding = 'async'; return node; };
const originalAsset = name => new URL(`./assets/${name}`, import.meta.url).href;
const ui = (host, name, className) => {
  const panel = el('div', `project-app ${className}`);
  const title = el('div', 'app-titlebar'); title.append(el('span', '', name), el('span', 'app-window-marks', '—　□　×'));
  panel.append(title);
  host.append(panel); return panel;
};
const status = text => { const node = el('p', 'demo-feedback', text); node.setAttribute('role', 'status'); return node; };
const select = (label, entries, onChange) => {
  const wrap = el('label', 'app-select'); wrap.append(el('span', '', label));
  const input = el('select'); input.setAttribute('aria-label', label);
  entries.forEach(([value, text]) => { const option = el('option', '', text); option.value = value; input.append(option); });
  input.addEventListener('change', () => onChange(input.value)); wrap.append(input); return wrap;
};

function syncWallpaper(host) {
  const panel = ui(host, '屏序 SyncWallpaper', 'sync-app');
  const layout = el('div', 'sync-layout');
  const rail = el('aside', 'sync-rail');
  rail.append(el('strong', '', '屏序'), el('span', '', '概览'), el('span', 'selected', '壁纸组合'), el('span', '', '显示器识别'), el('span', '', '壁纸档案库'));
  const workspace = el('div', 'sync-workspace');
  const heading = el('div', 'sync-heading'); heading.append(el('strong', '', '我的壁纸组合'), el('span', '', '自动匹配'));
  const screens = el('div', 'sync-screens');
  ['主屏', '副屏'].forEach((label, i) => {
    const screen = el('div', `sync-screen ${i ? 'secondary' : 'primary'}`);
    const view = el('div', 'sync-wallpaper'); view.append(el('span', '', label)); screen.append(view, el('i', 'sync-stand')); screens.append(screen);
  });
  const schemes = el('div', 'sync-schemes');
  ['暮色秘境', '深海夜航', '晨雾山间'].forEach((label, i) => {
    const choice = button(label, () => {
      panel.dataset.wallpaper = String(i);
      schemes.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === choice)));
      feedback.textContent = `已应用「${label}」示例组合`;
    }); choice.setAttribute('aria-pressed', String(i === 0)); schemes.append(choice);
  });
  let connected = true;
  const feedback = status('双屏已连接 · 已匹配示例组合');
  const connection = button('断开副屏', () => {
    connected = !connected; panel.classList.toggle('one-screen', !connected);
    connection.textContent = connected ? '断开副屏' : '连接副屏'; connection.setAttribute('aria-pressed', String(connected));
    feedback.textContent = connected ? '检测到副屏 · 自动恢复双屏壁纸' : '副屏已断开 · 主屏壁纸保留';
  }, 'app-action'); connection.setAttribute('aria-pressed', 'true');
  const toolbar = el('div', 'app-toolbar');
  toolbar.append(select('主题', [['manor', '秘境'], ['graphite', '石墨'], ['cloud', '云白']], value => { panel.dataset.theme = value; }), connection);
  workspace.append(heading, screens, schemes, toolbar, feedback); layout.append(rail, workspace); panel.append(layout);
}

function usageMonitor(host) {
  const panel = el('div', 'usage-app'); host.append(panel);
  const toolbar = el('div', 'usage-toolbar'); toolbar.append(el('span', '', '迪迦额度显示器'), el('small', '', '演示额度 · 非真实账号'));
  const content = el('div', 'usage-content');
  const figure = image(originalAsset('projects/tiga-full.png'), '迪迦满能量状态', 'tiga-figure');
  const accounts = el('div', 'usage-accounts');
  const values = { codex: 78, claude: 62 }; const meters = {};
  for (const [key, name] of [['codex', 'Codex'], ['claude', 'Claude Code']]) {
    const account = el('div', `usage-account ${key}`); account.append(el('strong', '', name));
    const meter = el('div', 'usage-meter'); const amount = el('span'); const track = el('div', 'usage-track'); track.append(el('i'));
    meter.append(amount, track); const period = el('small', '', '五小时剩余 · 示例');
    account.append(meter, period); accounts.append(account); meters[key] = { meter, amount, track };
  }
  const feedback = status('拖动滑块，观察原版人物三种状态');
  function update() {
    Object.entries(values).forEach(([key, value]) => {
      const { meter, amount, track } = meters[key]; amount.textContent = `${value}%`; meter.style.setProperty('--energy', `${value}%`); track.firstChild.style.width = `${value}%`; meter.dataset.low = String(value < 50);
    });
    const energy = Math.round((values.codex + values.claude) / 2), state = energy === 0 ? 'stone' : energy <= 20 ? 'low' : 'full';
    figure.src = originalAsset(`projects/tiga-${state}.png`); figure.alt = { stone: '迪迦石化状态', low: '迪迦红灯状态', full: '迪迦满能量状态' }[state];
  }
  const controls = el('div', 'usage-controls');
  for (const [key, name] of [['codex', 'Codex'], ['claude', 'Claude']]) {
    const label = el('label'); label.append(el('span', '', name)); const slider = el('input'); slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.value = String(values[key]); slider.setAttribute('aria-label', `${name} 示例额度`);
    slider.addEventListener('input', () => { values[key] = Number(slider.value); update(); feedback.textContent = `示例额度已调整，人物根据两个账号的平均值变化`; }); label.append(slider); controls.append(label);
  }
  let ring = false; const toggle = button('切换光能环', () => { ring = !ring; panel.classList.toggle('ring-mode', ring); toggle.textContent = ring ? '切换光能条' : '切换光能环'; toggle.setAttribute('aria-pressed', String(ring)); }, 'app-action'); toggle.setAttribute('aria-pressed', 'false');
  const empty = button('预览石化', () => { values.codex = 0; values.claude = 0; controls.querySelectorAll('input').forEach(input => { input.value = '0'; }); update(); feedback.textContent = '0% 示例额度 · 石化状态'; }, 'app-action');
  content.append(figure, accounts); panel.append(toolbar, content, controls); const actions = el('div', 'app-toolbar'); actions.append(toggle, empty); panel.append(actions, feedback); update();
}

function cseHelper(host) {
  const panel = ui(host, 'CSE 空间助手', 'cse-app');
  const body = el('div', 'cse-body'); body.append(el('strong', 'cse-title', '▱  CSE 空间助手'), el('p', 'cse-caption', '扫描服务器占用，清理旧开发组件，让作业有地方保存。'));
  const feedback = status('安全示例数据 · 不连接学校账户');
  const rows = el('div', 'cse-rows');
  const items = [{ label: '旧版 VS Code Server', size: 640 }, { label: '旧开发扩展缓存', size: 256 }, { label: '包管理器下载缓存', size: 128 }];
  const selected = new Set(); let scanned = false;
  const meter = el('div', 'cse-quota'); meter.append(el('span', '', '示例存储占用'), el('strong', '', '1.6 GB / 2.0 GB')); const track = el('div', 'cse-track'); track.append(el('i')); meter.append(track);
  function redraw() {
    rows.replaceChildren();
    items.forEach((item, index) => {
      const label = el('label', 'cse-row'); const check = el('input'); check.type = 'checkbox'; check.disabled = !scanned || item.size === 0; check.checked = selected.has(index);
      check.addEventListener('change', () => { check.checked ? selected.add(index) : selected.delete(index); clean.disabled = !selected.size; });
      label.append(check, el('span', '', item.label), el('small', '', item.size ? `${item.size} MB` : '已清理')); rows.append(label);
    });
  }
  const scan = button('扫描示例空间', () => { scanned = true; redraw(); feedback.textContent = '扫描完成 · 勾选要清理的示例缓存'; }, 'cse-primary');
  const clean = button('清理选中项', () => {
    const total = [...selected].reduce((sum, index) => sum + items[index].size, 0); selected.forEach(index => { items[index].size = 0; }); selected.clear(); clean.disabled = true; redraw();
    const remaining = 600 + items.reduce((sum, item) => sum + item.size, 0); meter.querySelector('strong').textContent = `${(remaining / 1024).toFixed(1)} GB / 2.0 GB`; track.firstChild.style.width = `${remaining / 20.48}%`; feedback.textContent = `已释放 ${total} MB 示例空间 · 真实文件未受影响`;
  }, 'app-action'); clean.disabled = true;
  const tools = el('div', 'app-toolbar'); tools.append(scan, clean); body.append(meter, rows, tools, feedback); panel.append(body); redraw();
}

const pinyinWords = { nihao: ['你好', '拟好'], sky: ['Sky', '天空'], tian: ['天', '田', '填'], zhuangyuan: ['庄园', '状元'], wuji: ['无极', '无际', '无忌'], xuexi: ['学习', '学系'], codex: ['Codex'], ni: ['你', '拟'], hao: ['好', '号'] };
function wujiKeyboard(host) {
  const panel = el('div', 'wuji-app'); host.append(panel);
  const entry = el('div', 'wuji-entry'); const output = el('output', '', ''); output.setAttribute('aria-label', '示例输入结果'); entry.append(el('span', '', 'SKY.无极输入法'), output);
  const composition = el('div', 'wuji-composition'); const input = el('input'); input.type = 'text'; input.placeholder = '试试 nihao / wuji / tian'; input.setAttribute('aria-label', '示例拼音'); input.autocomplete = 'off'; input.spellcheck = false; input.maxLength = 30;
  const candidates = el('div', 'wuji-candidates');
  const choose = value => { output.textContent = (output.textContent + value).slice(-100); input.value = ''; update(); };
  function update() { const value = input.value.trim().toLowerCase(); candidates.replaceChildren(); (pinyinWords[value] || (value ? [value] : ['你好', '无极', '天'])).forEach((word, index) => { candidates.append(button(`${index + 1} ${word}`, () => choose(word))); }); }
  input.addEventListener('input', update);
  input.addEventListener('keydown', event => { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); choose((pinyinWords[input.value.trim().toLowerCase()] || [input.value || ' '])[0]); } event.stopPropagation(); });
  composition.append(input, candidates);
  const keyboard = el('div', 'cherry-keyboard');
  ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].forEach((letters, index) => {
    const row = el('div', `cherry-row row-${index}`);
    for (const letter of letters) row.append(button(letter, () => { input.value = (input.value + letter).slice(0, 30); update(); }, 'cherry-key'));
    if (index === 2) row.append(button('⌫', () => { if (input.value) input.value = input.value.slice(0, -1); else output.textContent = output.textContent.slice(0, -1); update(); }, 'cherry-key red-key'));
    keyboard.append(row);
  });
  const bottom = el('div', 'cherry-row'); bottom.append(button('清空', () => { output.textContent = ''; input.value = ''; update(); }, 'cherry-key red-key'), button('SPACE · SKY.无极', () => choose((pinyinWords[input.value.trim().toLowerCase()] || [input.value || ' '])[0]), 'cherry-key space-key'), button('↵', () => choose(input.value || '\n'), 'cherry-key red-key'));
  keyboard.append(bottom); panel.append(entry, composition, keyboard, el('small', 'keyboard-note', '交互演示 · 示例词表，非完整输入引擎')); update();
}

function perch(host) {
  const desktop = el('div', 'perch-desktop'); host.append(desktop);
  const window = el('div', 'perch-window'); const title = el('div', 'perch-title'); title.append(el('span', '', '栖窗 Perch'));
  const feedback = status('点击最小化，再点击任务栏图标还原'); let minimized = false;
  const minimize = () => { minimized = true; desktop.classList.add('perch-minimized'); window.inert = true; window.setAttribute('aria-hidden', 'true'); task.setAttribute('aria-expanded', 'false'); feedback.textContent = '窗口已收拢 · 点击任务栏中的「栖窗」还原'; task.focus({ preventScroll: true }); };
  const min = button('—', minimize); min.setAttribute('aria-label', '最小化演示窗口'); title.append(min);
  const settings = el('div', 'perch-settings'); settings.append(el('h4', '', '窗口动画'));
  settings.append(select('动画效果', [['modern', '现代神奇效果'], ['classic', '经典神奇效果']], value => { desktop.dataset.style = value; }));
  const duration = el('label', 'perch-duration'); const durationLabel = el('span', '', '动画时长'); const slider = el('input'); slider.type = 'range'; slider.min = '50'; slider.max = '2000'; slider.step = '50'; slider.value = '500'; slider.setAttribute('aria-label', '动画时长'); const value = el('output', '', '500 ms');
  slider.addEventListener('input', () => { value.textContent = `${slider.value} ms`; desktop.style.setProperty('--perch-duration', `${slider.value}ms`); }); duration.append(durationLabel, slider, value);
  const checkbox = el('label', 'perch-check'); const check = el('input'); check.type = 'checkbox'; check.checked = true; check.addEventListener('change', () => desktop.classList.toggle('no-restore-motion', !check.checked)); checkbox.append(check, el('span', '', '启用还原动画'));
  settings.append(duration, checkbox, button('预览最小化', minimize, 'perch-primary'));
  window.append(title, settings); const taskbar = el('div', 'perch-taskbar'); taskbar.append(el('span', 'perch-start', '⊞'));
  const task = button('▱ 栖窗', () => { if (minimized) { minimized = false; desktop.classList.remove('perch-minimized'); window.inert = false; window.setAttribute('aria-hidden', 'false'); task.setAttribute('aria-expanded', 'true'); feedback.textContent = '窗口已还原 · 可切换效果再次体验'; } else minimize(); }); task.setAttribute('aria-expanded', 'true'); taskbar.append(task, el('span', 'taskbar-spacer'), el('small', '', 'Windows 交互演示'));
  desktop.append(window, feedback, taskbar);
}

function voiceKeyboard(host) {
  const panel = el('div', 'voice-app'); host.append(panel);
  const header = el('div', 'voice-title'); header.append(el('strong', '', '说点啥'), el('span', '', 'Sky 无极君特供版'));
  const transcription = el('output', 'voice-output', '点击开始，观看一段示例语音转文字。'); transcription.setAttribute('aria-live', 'polite');
  const waves = el('div', 'voice-waves'); waves.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 39; i++) { const bar = el('i'); bar.style.setProperty('--height', `${12 + Math.sin(i * 1.7) ** 2 * 43}px`); bar.style.setProperty('--delay', `${i * -37}ms`); waves.append(bar); }
  const controls = el('div', 'voice-controls'); let timer, running = false, count = 0; const text = '欢迎来到我的庄园。沧海星辰，尽在我手。';
  function stop() { clearInterval(timer); timer = undefined; running = false; panel.classList.remove('is-recording'); start.textContent = '● 开始示例'; start.setAttribute('aria-pressed', 'false'); }
  const start = button('● 开始示例', () => {
    if (running) { stop(); if (count) transcription.textContent = text.slice(0, count); return; }
    running = true; count = 0; transcription.textContent = '正在识别示例语音…'; panel.classList.add('is-recording'); start.textContent = '■ 停止示例'; start.setAttribute('aria-pressed', 'true');
    timer = setInterval(() => { count++; transcription.textContent = text.slice(0, count); if (count >= text.length) stop(); }, 135);
  }, 'cherry-key red-key'); start.setAttribute('aria-pressed', 'false');
  const clear = button('CLEAR', () => { stop(); count = 0; transcription.textContent = '点击开始，观看一段示例语音转文字。'; }, 'cherry-key');
  controls.append(clear, start, button('BACK', () => { stop(); transcription.textContent = '示例已结束，可以重新开始。'; }, 'cherry-key'));
  panel.append(header, transcription, waves, controls, el('small', 'keyboard-note', '交互演示 · 播放预设文字，不启用麦克风'));
  return stop;
}

function manor(host) {
  const panel = el('div', 'manor-mini'); host.append(panel);
  panel.style.backgroundImage = `url("${originalAsset('original/lobby-render.png')}")`;
  const veil = el('div', 'manor-mini-shade'); const heading = el('span', 'manor-mini-title', 'Sky 天的庄园'); const hot = el('div', 'manor-mini-hotspots');
  const card = el('div', 'manor-mini-card'); card.hidden = true;
  const title = el('h4'); const body = el('p'); const close = button('合上档案', () => { card.hidden = true; hot.hidden = false; }); card.append(title, body, close);
  const entries = [['关于我', '在这里认识 Sky 天，阅读个人档案。'], ['作品集', '打开作品档案，亲手体验每个项目。'], ['名人墙', '记录重要的人，以及他们的故事。']];
  entries.forEach(([name, copy]) => { const target = button(name, () => { title.textContent = name; body.textContent = copy; card.hidden = false; hot.hidden = true; close.focus({ preventScroll: true }); }); hot.append(target); });
  panel.append(veil, heading, hot, card, el('small', 'manor-mini-note', '交互演示 · 点击大厅入口')); return () => {};
}

const demos = { syncwallpaper: syncWallpaper, 'usage-monitor': usageMonitor, 'cse-helper': cseHelper, 'wuji-ime': wujiKeyboard, perch, 'bibi-keyboard': voiceKeyboard, manor };

export function renderProjectShowcase(host, projects, { mediaURL = value => value } = {}) {
  const old = mounted.get(host); const previous = old?.selected; old?.dispose();
  const visible = projects.filter(project => project.visible); host.replaceChildren();
  if (!visible.length) { host.append(el('p', 'content-empty', '作品尚未公开。')); return; }
  const id = `project-showcase-${++serial}`, controller = new AbortController(); let stopDemo = () => {}, selectedIndex = Math.max(0, visible.findIndex(project => project.id === previous));
  const index = el('div', 'showcase-index'); index.setAttribute('role', 'tablist'); index.setAttribute('aria-label', '选择作品'); index.setAttribute('aria-orientation', 'vertical');
  const page = el('section', 'showcase-page'); page.id = `${id}-panel`; page.setAttribute('role', 'tabpanel');
  const tabs = [];
  function show(position, focus = false) {
    stopDemo(); stopDemo = () => {}; selectedIndex = position; const project = visible[position];
    mounted.get(host).selected = project.id; page.replaceChildren(); page.setAttribute('aria-labelledby', `${id}-tab-${position}`);
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === position)); tab.tabIndex = i === position ? 0 : -1; });
    const surface = el('div', 'showcase-demo'); const badge = el('span', 'showcase-demo-badge', demos[project.demo] ? '交互演示' : '作品展示'); surface.append(badge);
    const demoHost = el('div', 'showcase-demo-content'); surface.append(demoHost);
    if (demos[project.demo]) stopDemo = demos[project.demo](demoHost) || (() => {});
    else if (project.cover) demoHost.append(image(mediaURL(project.cover), project.title, 'showcase-cover'));
    else { const fallback = el('div', 'showcase-fallback'); fallback.append(el('span', '', project.category), el('strong', '', project.title)); demoHost.append(fallback); }
    const copy = el('div', 'showcase-copy'); const identity = el('div', 'showcase-identity'); identity.append(el('h3', '', project.title), el('span', 'showcase-category', project.category));
    const link = safeLink(project.url); if (link) { const source = el('a', 'showcase-source', new URL(link).hostname === 'github.com' ? '查看 GitHub 项目 ↗' : '查看作品 ↗'); source.href = link; source.target = '_blank'; source.rel = 'noopener noreferrer'; identity.append(source); }
    copy.append(identity, el('p', 'showcase-summary', project.summary));
    if (project.body || project.images?.length || (project.cover && demos[project.demo])) {
      const details = el('details', 'showcase-details'); details.append(el('summary', '', '项目说明与图片'));
      const expanded = el('div', 'showcase-detail-content'); if (project.body) expanded.append(el('p', '', project.body));
      const sources = [project.cover, ...(project.images || [])].filter(Boolean);
      if (sources.length) { const gallery = el('div', 'showcase-gallery'); sources.forEach((src, i) => { gallery.append(image(mediaURL(src), `${project.title} · 图片 ${i + 1}`)); }); expanded.append(gallery); }
      details.append(expanded); copy.append(details);
    }
    page.append(surface, copy); if (focus) tabs[position].focus({ preventScroll: true });
  }
  visible.forEach((project, i) => {
    const tab = button('', () => show(i), 'showcase-tab'); tab.id = `${id}-tab-${i}`; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', page.id);
    const mark = el('span', 'showcase-tab-mark', ({ syncwallpaper: '▱', 'usage-monitor': '◉', 'cse-helper': '⌘', 'wuji-ime': '文', perch: '▧', 'bibi-keyboard': '◍', manor: '✦' })[project.demo] || '◇'); mark.setAttribute('aria-hidden', 'true');
    const labels = el('span'); labels.append(el('strong', '', project.title), el('small', '', project.category)); tab.append(mark, labels); index.append(tab); tabs.push(tab);
    tab.addEventListener('keydown', event => {
      const next = { ArrowDown: (selectedIndex + 1) % visible.length, ArrowRight: (selectedIndex + 1) % visible.length, ArrowUp: (selectedIndex + visible.length - 1) % visible.length, ArrowLeft: (selectedIndex + visible.length - 1) % visible.length, Home: 0, End: visible.length - 1 }[event.key];
      if (next !== undefined) { event.preventDefault(); event.stopPropagation(); show(next, true); }
    });
  });
  mounted.set(host, { selected: visible[selectedIndex].id, dispose() { stopDemo(); controller.abort(); } });
  const pause = () => stopDemo();
  window.addEventListener('sky:scenechange', event => { if (event.detail?.scene !== 'work') pause(); }, { signal: controller.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, { signal: controller.signal });
  host.append(index, page); show(selectedIndex);
}
