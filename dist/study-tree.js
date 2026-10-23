const ASSET_ROOT = new URL('./assets/persona-original/', import.meta.url);
const STATUS = { completed: '已完成', current: '正在学习', planned: '计划学习' };
const GROUPS = [
  { key: 'math', title: '数学', icon: 'calm', points: [[360, 140], [120, 140], [120, 45], [360, 45]], junction: [480, 95], label: [230, 209] },
  { key: 'comp', title: '计算机科学', icon: 'persistent', points: [[748, 140], [988, 140], [988, 45], [748, 45]], junction: [628, 95], label: [870, 209] },
  { key: 'physics', title: '物理与工程设计', icon: 'friendly', points: [[360, 278], [120, 278], [120, 373], [360, 373]], junction: [480, 323], label: [230, 209] },
  { key: 'elec', title: '电气工程', icon: 'brave', points: [[748, 278], [988, 278], [748, 373], [988, 373]], junction: [628, 323], label: [870, 209] },
];
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const groupOf = code => /^MATH/i.test(code) ? 'math' : /^COMP/i.test(code) ? 'comp' : /^ELEC/i.test(code) ? 'elec' : 'physics';
const safeURL = value => {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''; }
  catch { return ''; }
};
const svg = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
const RENDER_LISTENERS = new WeakMap();

/** The lines group subjects visually. They do not encode university prerequisites. */
export function renderStudyTree(container, study = {}) {
  if (!container) return;
  RENDER_LISTENERS.get(container)?.abort();
  const listeners = new AbortController();
  RENDER_LISTENERS.set(container, listeners);
  container.classList.add('study-persona');
  const courses = (study.courses || []).filter(course => course.visible !== false);
  const completed = courses.filter(course => course.status === 'completed').length;
  const current = courses.filter(course => course.status === 'current').length;
  const head = el('header', 'persona-intro');
  const title = el('div');
  const heading = el('div', 'persona-heading-row');
  heading.append(el('p', 'persona-university', study.university || 'UNSW'));
  let introduction;
  if (typeof study.description === 'string' && study.description.trim()) {
    introduction = el('details', 'persona-introduction');
    const summary = el('summary');
    summary.setAttribute('aria-label', '展开专业介绍');
    summary.append(el('span', '', study.description.trim()));
    introduction.append(summary, el('p', 'persona-introduction-text', study.description.trim()));
    heading.append(introduction);
  }
  title.append(heading, el('p', 'persona-degree', study.major || ''));
  const progress = el('p', 'persona-progress');
  progress.append(el('span', '', `${completed} 门已完成`), el('span', '', `${current} 门正在学习`));
  head.append(title, progress);
  const main = el('div', 'persona-body');
  const chart = el('div', 'persona-chart');
  chart.setAttribute('role', 'group');
  chart.setAttribute('aria-label', '按学科排列的课程脉络；点击课程查看详情');
  const map = el('div', 'persona-map');
  const lines = svg('svg');
  lines.classList.add('persona-lines');
  lines.setAttribute('viewBox', '0 0 1108 430');
  lines.setAttribute('aria-hidden', 'true');
  const hub = el('div', 'persona-hub');
  hub.setAttribute('aria-hidden', 'true');
  hub.append(el('span', '', '本科'), el('strong', '', '学习脉络'));
  const detail = el('aside', 'persona-detail');
  detail.id = 'study-course-detail';
  detail.hidden = true;
  detail.tabIndex = -1;
  detail.setAttribute('role', 'region');
  detail.setAttribute('aria-label', '课程详情');
  detail.setAttribute('aria-live', 'polite');
  detail.setAttribute('aria-atomic', 'true');
  const legend = el('div', 'persona-legend');
  for (const key of ['completed', 'current', 'planned']) {
    if (key === 'planned' && !courses.some(course => course.status === key)) continue;
    const item = el('span', `persona-legend-${key}`, STATUS[key]);
    item.prepend(el('i')); legend.append(item);
  }
  legend.append(el('small', '', '按学科分组'));
  const pager = el('div', 'persona-pager');
  const controls = el('div', 'persona-chart-bottom');
  controls.append(legend, pager);
  chart.append(map, controls);
  main.append(chart, detail);
  container.replaceChildren(head, main);
  const groups = GROUPS.map(group => ({ ...group, courses: courses.filter(course => groupOf(course.code || '') === group.key) }));
  const pages = Math.max(1, ...groups.map(group => Math.ceil(group.courses.length / 4)));
  let page = 0;
  let selectedId = courses.find(course => course.status === 'current')?.id || courses[0]?.id;
  let buttons = [];
  function closeDetails() {
    detail.hidden = true;
    buttons.find(item => item.course.id === selectedId)?.button.focus({ preventScroll: true });
  }
  container.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !detail.hidden) { event.preventDefault(); event.stopPropagation(); closeDetails(); }
    else if (event.key === 'Escape' && introduction?.open) {
      event.preventDefault(); event.stopPropagation(); introduction.open = false;
      introduction.querySelector('summary').focus({ preventScroll: true });
    }
  }, { signal: listeners.signal });
  function choose(course, button, play = true) {
    if (introduction) introduction.open = false;
    selectedId = course.id;
    for (const item of buttons) item.button.setAttribute('aria-pressed', String(item.course.id === selectedId));
    const status = STATUS[course.status] || '课程记录';
    const group = GROUPS.find(item => item.key === groupOf(course.code || ''));
    const symbol = el('img', 'persona-detail-symbol');
    symbol.src = new URL(`ico_survivortype_${group.icon}.png`, ASSET_ROOT).href; symbol.alt = '';
    const badge = el('p', `persona-detail-status persona-status-${course.status || 'record'}`, status);
    const name = el('h3', '', course.name || course.code || '课程');
    const code = el('p', 'persona-detail-code', course.code || '');
    const subject = el('p', 'persona-detail-subject', group.title);
    const close = el('button', 'persona-detail-close', '返回脉络');
    close.type = 'button'; close.addEventListener('click', closeDetails);
    detail.replaceChildren(close, symbol, badge, name, code, subject);
    if (course.notes) detail.append(el('p', 'persona-course-notes', course.notes));
    const url = safeURL(course.url);
    if (url) {
      const link = el('a', 'persona-handbook', '查看课程手册');
      link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      detail.append(link);
    }
    if (play) { detail.hidden = false; detail.focus({ preventScroll: true }); window.SkyAudio?.play('click', { group: 'ui' }); }
    if (button) button.setAttribute('aria-pressed', 'true');
  }
  function renderMap() {
    buttons = [];
    lines.replaceChildren();
    map.replaceChildren(lines, hub);
    for (const group of groups) {
      const visible = group.courses.slice(page * 4, page * 4 + 4);
      const positions = visible.map((course, index) => ({ course, point: group.points[index] }));
      positions.forEach(({ course, point }, index) => {
        const line = svg('path');
        const anchorX = point[0] - 84;
        line.setAttribute('d', `M 554 209 L ${group.junction[0]} ${group.junction[1]} L ${anchorX} ${group.junction[1]} L ${anchorX} ${point[1]}`);
        line.classList.add(`persona-path-${course.status || 'record'}`);
        lines.append(line);
        const button = el('button', `persona-node persona-node-${course.status || 'record'}`);
        button.type = 'button';
        button.style.left = `${point[0] / 11.08}%`; button.style.top = `${point[1] / 4.3}%`;
        button.dataset.courseCode = course.code || '';
        button.setAttribute('aria-label', `${course.code || ''} ${course.name || ''}，${STATUS[course.status] || '课程记录'}`);
        button.setAttribute('aria-controls', detail.id);
        button.setAttribute('aria-pressed', String(course.id === selectedId));
        const emblem = el('span', 'persona-node-emblem');
        emblem.setAttribute('aria-hidden', 'true');
        const icon = el('img'); icon.src = new URL(`ico_survivortype_${group.icon}.png`, ASSET_ROOT).href; icon.alt = ''; icon.decoding = 'async';
        emblem.append(icon);
        const label = el('span', 'persona-node-label');
        label.append(el('strong', 'persona-node-name', course.name || course.code || '课程'), el('small', 'persona-node-code', course.code || ''));
        button.append(emblem, label);
        button.addEventListener('click', () => choose(course, button));
        buttons.push({ button, course, point });
        map.append(button);
      });
    }
    const labels = [
      ['数学', 235, 3], ['计算机科学', 875, 3],
      ['物理与工程设计', 235, 418], ['电气工程', 875, 418],
    ];
    for (const [text, x, y] of labels) {
      const label = el('span', 'persona-branch-label', text);
      label.style.left = `${x / 11.08}%`; label.style.top = `${y / 4.3}%`;
      map.append(label);
    }
    pager.replaceChildren();
    if (pages > 1) {
      const prev = el('button', '', '上一页'); prev.type = 'button'; prev.disabled = page === 0;
      const next = el('button', '', '下一页'); next.type = 'button'; next.disabled = page === pages - 1;
      prev.addEventListener('click', () => { page--; renderMap(); });
      next.addEventListener('click', () => { page++; renderMap(); });
      pager.append(prev, el('span', '', `${page + 1} / ${pages}`), next);
    }
    const active = buttons.find(item => item.course.id === selectedId) || buttons.find(item => item.course.status === 'current') || buttons[0];
    if (active) choose(active.course, active.button, false);
    else detail.replaceChildren(el('h3', '', '学习脉络'), el('p', 'persona-course-notes', '课程记录尚未公开。'));
  }
  // Arrow keys follow the visible diagram rather than a fabricated prerequisite order.
  map.addEventListener('keydown', event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    const origin = buttons.find(item => item.button === event.target);
    if (!direction || !origin) return;
    const target = buttons.filter(item => item !== origin).map(item => {
      const dx = item.point[0] - origin.point[0], dy = item.point[1] - origin.point[1];
      const forward = dx * direction[0] + dy * direction[1];
      const sideways = Math.abs(dx * direction[1] - dy * direction[0]);
      return { ...item, score: forward > 0 ? Math.hypot(dx, dy) + sideways * 1.6 : Infinity };
    }).sort((a, b) => a.score - b.score)[0];
    if (target && target.score < Infinity) { event.preventDefault(); target.button.focus({ preventScroll: true }); }
  });
  renderMap();
}
