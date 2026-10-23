import { validateContent } from '../content-model.js';

const main = document.querySelector('#main');
const announcement = document.querySelector('#announcement');
const parameters = new URLSearchParams(location.search);
const setupMode = parameters.get('setup') === 'yes';
if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`);

const chapters = {
  about: { title: '个人档案', description: '写下你的介绍。保存到草稿后，只有你能看到；发布后才会出现在庄园里。' },
  work: { title: '作品集', description: '整理你的作品、图片和链接。没有链接的作品仍可阅读，不会显示访问按钮。' },
  study: { title: '专业学习', description: '记录正在学习的课程和经历。每条内容都可以单独隐藏、调整顺序。' },
  interests: { title: '兴趣爱好', description: '记录热爱的事物，也可以在这里写下新的尝试。正文支持分段，直接输入文字即可。' },
  settings: { title: '大厅设置', description: '管理访客进入庄园时的默认设置。访客仍可以自行关闭声音或调节体验。' },
  history: { title: '发布记录', description: '查看已经发布的内容版本。恢复会先生成草稿，预览确认后再发布。' },
};
const initialChapter = parameters.get('section') === 'profile' ? 'about' : parameters.get('section');
const state = {
  session: null, content: null, version: null, updatedAt: null,
  saved: '', dirty: false, busy: false, section: chapters[initialChapter] ? initialChapter : 'about',
  notice: null, conflict: false, versions: null, publishTimer: null, publishedAt: null,
};

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const clone = value => structuredClone(value);
const githubIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .8A11.2 11.2 0 0 0 8.46 22.6c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.52-2.5-.29-5.14-1.26-5.14-5.59 0-1.23.44-2.24 1.16-3.02-.12-.29-.5-1.43.11-2.97 0 0 .95-.31 3.08 1.15a10.75 10.75 0 0 1 5.6 0c2.14-1.46 3.08-1.15 3.08-1.15.61 1.54.23 2.68.11 2.97.73.78 1.16 1.79 1.16 3.02 0 4.34-2.64 5.29-5.16 5.57.41.36.77 1.06.77 2.15v3.2c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"/></svg>';

class RequestError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers || {});
  if (method !== 'GET') headers.set('X-CSRF-Token', state.session?.csrfToken || '');
  if (options.body && !(options.body instanceof Blob)) headers.set('Content-Type', 'application/json');
  let response;
  try { response = await fetch(`/api/manor${path}`, { credentials: 'same-origin', cache: 'no-store', ...options, method, headers }); }
  catch { throw new RequestError('暂时无法连接庄园。请检查网络后重试，你尚未保存的修改仍保留在这一页。', 0); }
  let data;
  try { data = await response.json(); }
  catch { throw new RequestError('庄园暂时没有返回有效的记录。请稍后重试。', response.status); }
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : (data.message || data.error?.message);
    throw new RequestError(message || (response.status === 401 ? '登录已过期，请重新登录后继续。' : '这次操作没有完成，请稍后重试。'), response.status, data);
  }
  return data;
}

function dateLabel(value) {
  if (!value) return '尚未保存';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间暂不可用' : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function announce(message) { announcement.textContent = ''; requestAnimationFrame(() => { announcement.textContent = message; }); }
function notice(message, type = '', actions = '') { state.notice = { message, type, actions }; renderNotice(); announce(message); }
function renderNotice() {
  const host = document.querySelector('#notice');
  if (!host) return;
  const item = state.notice;
  host.innerHTML = item ? `<div class="notice ${escapeHTML(item.type)}" role="${item.type === 'error' ? 'alert' : 'status'}"><p>${escapeHTML(item.message)}</p>${item.actions ? `<div class="notice-actions">${item.actions}</div>` : ''}</div>` : '';
}

function errorNotice(error) {
  if (error.status === 409) {
    state.conflict = true;
    notice('另一页已经保存了更新。为避免覆盖，本次修改还没有保存。你可以载入最新草稿，或保留本页内容并重新确认保存。', 'error', '<button type="button" class="button" data-action="conflict-reload">载入最新草稿</button><button type="button" class="button" data-action="conflict-keep">保留本页内容</button>');
  } else if (error.status === 401 || error.status === 403) {
    notice(error.message || '登录已失效。请重新登录后继续，本页修改仍然保留。', 'error', '<a class="button" href="/api/manor/auth/login" target="_blank" rel="noopener">重新登录 GitHub</a><button type="button" class="button" data-action="refresh-session">我已完成登录</button>');
  } else notice(error.message || '操作没有完成，请稍后重试。', 'error');
}

function setBusy(busy, label = '') {
  state.busy = busy;
  document.querySelector('#editor-fields')?.toggleAttribute('disabled', busy);
  document.querySelectorAll('[data-busy-disable]').forEach(element => { element.disabled = busy; });
  const marker = document.querySelector('#busy-label');
  if (marker) { marker.textContent = busy ? label : (state.publishedAt ? `最近发布 ${dateLabel(state.publishedAt)}` : '发布前，请先预览效果。'); marker.classList.toggle('busy-marker', busy); }
  document.querySelector('.paper')?.setAttribute('aria-busy', String(busy));
  updateDraftMeta();
}

function updateDraftMeta() {
  const draftState = document.querySelector('#draft-state');
  if (draftState) {
    draftState.textContent = state.dirty ? '有未保存的修改' : '草稿已保存';
    draftState.classList.toggle('dirty', state.dirty);
  }
  const savedAt = document.querySelector('#saved-at');
  if (savedAt) savedAt.textContent = state.updatedAt ? `保存于 ${dateLabel(state.updatedAt)}` : '尚未保存草稿';
  const saveButton = document.querySelector('[data-action="save"]');
  if (saveButton) saveButton.disabled = state.busy || (!state.dirty && !!state.updatedAt);
  const previewButton = document.querySelector('[data-action="preview"]');
  const publishButton = document.querySelector('[data-action="publish"]');
  if (previewButton) previewButton.disabled = state.busy || state.conflict;
  if (publishButton) publishButton.disabled = state.busy || state.conflict;
}

function markDirty() { state.dirty = JSON.stringify(state.content) !== state.saved; updateDraftMeta(); }
function getPath(path) { return path.split('.').reduce((result, part) => result?.[part], state.content); }
function setPath(path, value) {
  const parts = path.split('.');
  let cursor = state.content;
  for (const part of parts.slice(0, -1)) cursor = cursor[part];
  cursor[parts.at(-1)] = value;
  markDirty();
}

function field(label, path, options = {}) {
  const value = getPath(path) ?? '';
  const id = `field-${path.replaceAll('.', '-')}`;
  const shared = `id="${id}" data-path="${path}"${options.max ? ` maxlength="${options.max}"` : ''}`;
  let control;
  if (options.multiline) control = `<textarea ${shared} rows="${options.rows || 5}" spellcheck="false">${escapeHTML(value)}</textarea>`;
  else control = `<input ${shared} type="${options.type || 'text'}" value="${escapeHTML(value)}" autocomplete="off"${options.required ? ' required' : ''}>`;
  return `<label class="field" for="${id}"><span class="field-label">${escapeHTML(label)}</span>${control}${options.help ? `<span class="field-help">${escapeHTML(options.help)}</span>` : ''}</label>`;
}

function checkbox(label, path, help = '') {
  return `<label class="check-field"><input type="checkbox" data-path="${path}" ${getPath(path) ? 'checked' : ''}><span>${escapeHTML(label)}${help ? `<span class="field-help">${escapeHTML(help)}</span>` : ''}</span></label>`;
}

function safeImageSource(value) {
  if (!value) return '';
  try {
    const url = new URL(value, `${location.origin}/`);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function imageField(label, path) {
  const source = safeImageSource(getPath(path));
  return `<div class="field">${field(label, path, { help: '上传 JPG、PNG、WebP 或 GIF，也可以填写已有图片的网址。单张不超过 8 MB。' })}<div class="upload-row">${source ? `<img class="image-preview" src="${escapeHTML(source)}" alt="${escapeHTML(label)}预览" loading="lazy" referrerpolicy="no-referrer">` : ''}<label class="button">上传图片<input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-upload="${path}"></label>${source ? `<button class="button quiet" type="button" data-action="clear-image" data-path="${path}">移除图片</button>` : ''}</div></div>`;
}

function sectionFields(key) {
  return `<section class="field-group"><h2>大厅入口</h2><p>入口名称和简介会同步显示在大厅，以及对应的阅读页面。</p><div class="field-grid">${field('入口名称', `sections.${key}.title`, { required: true, max: 40 })}${field('入口简介', `sections.${key}.subtitle`, { max: 160 })}</div>${checkbox('向访客展示这个入口', `sections.${key}.visible`, '隐藏后，访客无法从大厅进入这个章节。')}</section>`;
}

function entryControls(collection, index, length, title) {
  return `<div class="entry-controls"><button type="button" data-action="move" data-list="${collection}" data-index="${index}" data-step="-1" aria-label="上移${escapeHTML(title)}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-action="move" data-list="${collection}" data-index="${index}" data-step="1" aria-label="下移${escapeHTML(title)}" ${index === length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="delete" data-action="remove" data-list="${collection}" data-index="${index}" aria-label="删除${escapeHTML(title)}">×</button></div>`;
}

function renderAbout() {
  return `<section class="field-group"><h2>关于你</h2><p>这些信息会出现在网站初始界面、个人档案和页脚中。</p><div class="field-grid">${field('名字', 'profile.name', { required: true, max: 80 })}${field('一句话介绍', 'profile.tagline', { max: 300 })}</div></section><section class="field-group">${field('关于我', 'profile.bio', { multiline: true, rows: 7, max: 12000, help: '空一行可开始新的段落。这里填写真实的介绍，不需要代码。' })}${imageField('头像', 'profile.avatar')}${field('页脚文字', 'profile.footer', { max: 180 })}</section>${sectionFields('about')}`;
}

function renderProjects() {
  const items = state.content.projects;
  return `${sectionFields('work')}<section class="field-group"><h2>作品记录</h2><p>调整顺序即可改变访客阅读作品的顺序。删除只影响草稿，发布后才对访客生效。</p>${items.length ? items.map((item, index) => {
    const path = `projects.${index}`;
    return `<article class="entry" data-entry="${item.id}"><header class="entry-header"><h3>${escapeHTML(item.title || '未命名作品')}</h3>${entryControls('projects', index, items.length, item.title || '作品')}</header><div class="field-grid">${field('作品名称', `${path}.title`, { required: true, max: 160 })}${field('作品分类', `${path}.category`, { max: 120 })}</div><br>${field('一句话说明', `${path}.summary`, { max: 1000 })}${field('作品正文', `${path}.body`, { multiline: true, rows: 6, max: 30000 })}${field('作品链接', `${path}.url`, { type: 'url', help: '选填。留空时不会向访客显示访问按钮。' })}${imageField('封面', `${path}.cover`)}<div class="field"><span class="field-label">作品图片</span><div class="gallery">${item.images.map((source, imageIndex) => `<div class="gallery-item"><img src="${escapeHTML(safeImageSource(source))}" alt="作品图片 ${imageIndex + 1}" loading="lazy" referrerpolicy="no-referrer"><button type="button" data-action="remove-image" data-path="${path}.images" data-index="${imageIndex}">移除这张</button></div>`).join('')}</div><label class="button">添加作品图片<input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-upload="${path}.images" data-multiple="true" multiple ${item.images.length >= 12 ? 'disabled' : ''}></label><span class="field-help">最多 12 张，按上传顺序展示。</span></div>${checkbox('展示这件作品', `${path}.visible`)}</article>`;
  }).join('') : '<p class="empty-message">还没有作品记录。添加作品后，可以先存为草稿。</p>'}<button class="button add-button" type="button" data-action="add" data-list="projects" ${items.length >= 60 ? 'disabled' : ''}>添加作品</button></section>`;
}

function renderStudy() {
  const courses = state.content.study.courses;
  return `${sectionFields('study')}<section class="field-group"><h2>学习介绍</h2><div class="field-grid">${field('学校', 'study.university', { max: 180 })}${field('专业', 'study.major', { max: 300 })}</div><br>${field('学习介绍', 'study.description', { multiline: true, rows: 5, max: 12000 })}</section><section class="field-group"><h2>课程与学习记录</h2><p>可以只填写课程代码，也可以补充名称和笔记。</p>${courses.length ? courses.map((course, index) => {
    const path = `study.courses.${index}`;
    return `<article class="entry" data-entry="${course.id}"><header class="entry-header"><h3>${escapeHTML(course.code || course.name || '新的学习记录')}</h3>${entryControls('study.courses', index, courses.length, course.code || course.name || '学习记录')}</header><div class="field-grid">${field('课程代码', `${path}.code`, { max: 80 })}${field('课程名称', `${path}.name`, { max: 180 })}</div><br>${field('学习笔记', `${path}.notes`, { multiline: true, rows: 5, max: 12000 })}${checkbox('展示这条学习记录', `${path}.visible`)}</article>`;
  }).join('') : '<p class="empty-message">还没有课程记录。可以添加正在学习的内容。</p>'}<button class="button add-button" type="button" data-action="add" data-list="study.courses" ${courses.length >= 60 ? 'disabled' : ''}>添加学习记录</button></section>`;
}

function renderInterests() {
  const interests = state.content.interests;
  return `${sectionFields('interests')}<section class="field-group"><h2>兴趣记录</h2><p>一段文字、一张图片，都可以留在这里。</p>${interests.length ? interests.map((interest, index) => {
    const path = `interests.${index}`;
    return `<article class="entry" data-entry="${interest.id}"><header class="entry-header"><h3>${escapeHTML(interest.title || '新的兴趣记录')}</h3>${entryControls('interests', index, interests.length, interest.title || '兴趣记录')}</header>${field('标题', `${path}.title`, { required: true, max: 160 })}${field('正文', `${path}.body`, { multiline: true, rows: 7, max: 30000 })}${imageField('配图', `${path}.image`)}${checkbox('展示这条兴趣记录', `${path}.visible`)}</article>`;
  }).join('') : '<p class="empty-message">还没有兴趣记录。写下最近喜欢做的事。</p>'}<button class="button add-button" type="button" data-action="add" data-list="interests" ${interests.length >= 60 ? 'disabled' : ''}>添加兴趣记录</button></section>`;
}

function renderSettings() {
  return `<section class="field-group"><h2>庄园声音</h2><p>沿用现有的原版大厅音乐和游戏音效。这里只调整访客初次进入时的默认播放设置。</p>${checkbox('默认开启声音', 'settings.musicEnabled', '声音会在访客点击进入庄园后播放，以符合浏览器的播放要求。')}<label class="field"><span class="field-label">默认音乐音量</span><span class="range-row"><input type="range" min="0" max="1" step="0.01" data-path="settings.musicVolume" value="${state.content.settings.musicVolume}" aria-label="默认音乐音量"><output id="volume-output">${Math.round(state.content.settings.musicVolume * 100)}%</output></span><span class="field-help">访客保存过的个人声音偏好会优先保留。</span></label></section><section class="field-group"><h2>大厅里的入口</h2><p>入口名称、简介和是否展示，在对应章节的「大厅入口」中编辑。</p><div class="notice-actions">${['about', 'work', 'study', 'interests'].map(key => `<button class="button" type="button" data-section="${key}">${chapters[key].title}</button>`).join('')}</div></section>`;
}

function renderHistory() {
  const versions = state.versions;
  const deploymentLabels = { pending: '个人网站正在部署', success: '个人网站已上线', failed: '个人网站部署未完成' };
  return `<div class="history-heading"><p>恢复历史版本不会立即改变访客看到的内容。</p><button class="button" type="button" data-action="load-history">刷新记录</button></div>${versions === null ? '<p class="empty-message" role="status">正在读取发布记录…</p>' : versions.length ? `<ol class="history-list">${versions.map(version => `<li class="history-item"><div><h2>${escapeHTML(version.summary || '庄园内容更新')}</h2><p>${dateLabel(version.createdAt)}</p>${version.revision ? `<p>版本 ${escapeHTML(String(version.revision).slice(0, 12))}${version.github?.status ? ` · ${escapeHTML(deploymentLabels[version.github.status] || '部署状态待确认')}` : ''}</p>` : ''}</div><div class="notice-actions">${version.github?.status && version.github.status !== 'success' ? `<button class="button" type="button" data-action="check-publish" data-id="${escapeHTML(version.id)}" data-sha="${escapeHTML(version.github.sha || '')}">检查上线状态</button>` : ''}<button class="button" type="button" data-action="restore" data-id="${escapeHTML(version.id)}">恢复为草稿</button></div></li>`).join('')}</ol>` : '<p class="empty-message">尚无已发布的版本。第一次发布完成后，记录会出现在这里。</p>'}`;
}

const renderers = { about: renderAbout, work: renderProjects, study: renderStudy, interests: renderInterests, settings: renderSettings, history: renderHistory };

function renderEditor() {
  const chapter = chapters[state.section];
  document.title = `${chapter.title} · 庄园管理册`;
  main.innerHTML = `<div class="ledger"><aside class="spine" aria-label="管理册目录"><h2 class="spine-title">庄园管理册</h2><p class="spine-caption">记录、整理，再与来访者分享。</p><nav class="chapter-nav">${Object.entries(chapters).map(([key, value]) => `<button type="button" data-section="${key}" data-busy-disable ${state.section === key ? 'aria-current="page"' : ''}>${value.title}</button>`).join('')}</nav><div class="owner-mark">庄园主<strong>${escapeHTML(state.session.login || '已通过 GitHub 验证')}</strong><button class="button quiet" type="button" data-action="logout" data-busy-disable>退出庄园主账号</button></div></aside><div class="paper"><div class="mobile-chapters"><label for="chapter-select">管理册目录</label><select id="chapter-select" data-busy-disable>${Object.entries(chapters).map(([key, value]) => `<option value="${key}" ${state.section === key ? 'selected' : ''}>${value.title}</option>`).join('')}</select></div><header class="paper-heading"><h1 id="chapter-title" tabindex="-1">${chapter.title}</h1><p>${chapter.description}</p><div class="draft-meta"><span id="draft-state" class="draft-state"></span><span id="saved-at"></span></div></header><div id="notice"></div><form class="editor" id="editor-form"><fieldset id="editor-fields" aria-label="${chapter.title}">${renderers[state.section]()}</fieldset></form><footer class="toolbar"><div class="toolbar-copy"><strong>草稿与公开内容分开保存</strong><span id="busy-label">${state.publishedAt ? `最近发布 ${dateLabel(state.publishedAt)}` : '发布前，请先预览效果。'}</span></div><div class="toolbar-actions"><button class="button" type="button" data-action="save" data-busy-disable>保存草稿</button><button class="button" type="button" data-action="preview" data-busy-disable>预览</button><button class="button primary" type="button" data-action="publish" data-busy-disable>发布更新</button></div></footer></div></div>`;
  updateDraftMeta(); renderNotice();
  if (state.busy) setBusy(true);
}

function renderLogin(error = '') {
  const configured = state.session?.configured;
  const errorMessages = { forbidden: '这个 GitHub 账号不是庄园主。请使用绑定的本人账号登录。', owner_only: '只有绑定的庄园主账号可以编辑内容。', cancelled: '你已取消 GitHub 授权，可以重新登录。', denied: 'GitHub 授权未完成，可以重新登录。', expired: '这次登录已经过期，请重新发起登录。', invalid_state: '这次登录验证已失效，请重新发起登录。' };
  const authError = parameters.get('error');
  const message = error || (authError ? (errorMessages[authError] || authError.slice(0, 240)) : '');
  let installationURL = '';
  try { const url = new URL(state.session?.installationUrl); if (url.protocol === 'https:' && url.hostname === 'github.com') installationURL = url.href; } catch { /* No installation URL was supplied. */ }
  const needsInstallation = parameters.get('notice') === 'installation-required';
  main.innerHTML = `<section class="cover"><img class="cover-emblem" src="../assets/favicon.svg" alt="" width="68" height="68"><h1>庄园主登录</h1><p>打开管理册，整理你的档案与作品。<br>访客无须登录，即可进入庄园阅读。</p>${message ? `<p class="cover-status login-error" role="alert">${escapeHTML(message)}</p>` : ''}${configured === false ? '<p class="cover-status">庄园主管理尚待完成首次 GitHub 授权。</p>' : ''}${needsInstallation ? '<p class="cover-status">还需要把庄园应用安装到个人网站仓库。请在 GitHub 只选择 skyxiangtian13152.github.io，完成后回来登录。</p>' : ''}<div class="cover-actions">${configured ? `<a class="button primary" href="/api/manor/auth/login">${githubIcon}使用 GitHub 登录</a>` : `<button class="button primary" type="button" disabled>${githubIcon}使用 GitHub 登录</button>`}${needsInstallation && installationURL ? `<a class="button" href="${escapeHTML(installationURL)}" target="_blank" rel="noopener noreferrer">前往 GitHub 完成仓库授权</a>` : ''}${configured === false ? '<a class="button" href="/admin/?setup=yes">首次连接 GitHub</a>' : ''}<a class="button quiet" href="/">以访客身份进入庄园</a>${error ? '<button class="button quiet" type="button" data-action="retry-session">重新连接</button>' : ''}</div><p class="cover-note">只有绑定的庄园主账号拥有编辑权限。<br>登录通过 GitHub 完成，网站不会索取你的 GitHub 密码。</p></section>`;
}

function renderSetup() {
  main.innerHTML = `<section class="cover"><img class="cover-emblem" src="../assets/favicon.svg" alt="" width="68" height="68"><h1>首次连接 GitHub</h1><p>把这座庄园与自己的 GitHub 账号连接。完成首次授权后，你就可以管理内容、保存草稿并发布到个人网站。</p><div id="setup-status"><p class="cover-status">下一步将由你亲自在 GitHub 确认创建应用和仓库权限。只有绑定的庄园主账号可以完成设置。</p></div><div id="setup-controls" class="cover-actions"><button class="button primary" type="button" data-action="prepare-setup">${githubIcon}准备 GitHub 授权</button><a class="button quiet" href="/admin/">返回登录</a></div><p class="cover-note">授权凭据由后台保存，不会写入公开网页。<br>请使用你本人的 GitHub 账号完成设置。</p></section>`;
}

async function prepareSetup(button) {
  button.disabled = true; button.textContent = '正在准备授权…';
  const status = document.querySelector('#setup-status');
  try {
    const response = await request('/setup/start', { method: 'POST', body: '{}' });
    const url = new URL(response.authorizeUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') throw new Error('GitHub 授权地址无效，未继续操作。');
    if (!response.manifest || typeof response.manifest !== 'object') throw new Error('授权信息不完整，请重新准备授权。');
    status.innerHTML = '<p class="cover-status">即将在 GitHub 创建这座庄园专用的应用。请在下一页核对权限，安装时只选择 skyxiangtian13152.github.io 仓库。</p>';
    const controls = document.querySelector('#setup-controls');
    controls.innerHTML = `<form class="setup-form" method="post" action="${escapeHTML(url.href)}" referrerpolicy="no-referrer"><input type="hidden" name="manifest"><button class="button primary" type="submit">${githubIcon}前往 GitHub 确认并创建应用</button></form><a class="button quiet" href="/">暂时返回庄园</a>`;
    controls.querySelector('[name="manifest"]').value = JSON.stringify(response.manifest);
  } catch (error) {
    status.innerHTML = `<p class="cover-status login-error" role="alert">${escapeHTML(error.message)}</p>`;
    button.disabled = false; button.textContent = '重新准备授权';
  }
}

async function loadDraft() {
  const draft = await request('/draft');
  state.content = validateContent(draft.content); state.version = draft.version; state.updatedAt = draft.updatedAt;
  state.saved = JSON.stringify(state.content); state.dirty = false; state.conflict = false;
}

async function initialize() {
  if (setupMode) { renderSetup(); return; }
  try {
    state.session = await request('/session');
    if (!state.session.authenticated) { renderLogin(); return; }
    await loadDraft(); renderEditor();
    if (state.section === 'history') await loadHistory();
  } catch (error) {
    if (state.content) errorNotice(error);
    else renderLogin(error.message);
  }
}

async function saveDraft({ quiet = false } = {}) {
  if (state.conflict) throw new Error('请先处理另一页保存的更新，再继续。');
  if (!state.dirty && state.updatedAt) return;
  const content = validateContent(state.content);
  const result = await request('/draft', { method: 'PUT', body: JSON.stringify({ content, version: state.version }) });
  state.content = validateContent(result.content); state.version = result.version; state.updatedAt = result.updatedAt;
  state.saved = JSON.stringify(state.content); state.dirty = false;
  updateDraftMeta();
  if (!quiet) notice('草稿已保存。访客看到的内容尚未改变，可以先预览再发布。', 'success');
}

function checkedPreviewURL(value) {
  const url = new URL(value, location.origin);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('预览地址无效，未打开页面。');
  return url.href;
}

async function openPreview() {
  await saveDraft({ quiet: true });
  const response = await request('/preview', { method: 'POST', body: '{}' });
  const url = checkedPreviewURL(response.url);
  document.querySelector('#preview-dialog')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'preview-dialog'; dialog.className = 'preview-dialog';
  dialog.setAttribute('aria-labelledby', 'preview-title');
  dialog.innerHTML = `<header class="preview-head"><div><h2 id="preview-title">草稿预览</h2><p>这份内容尚未公开发布。</p></div><div><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">在新窗口打开</a><button type="button" class="button" data-action="close-preview">关闭</button></div></header><iframe title="庄园草稿预览" src="${escapeHTML(url)}" allow="fullscreen" referrerpolicy="no-referrer"></iframe>`;
  document.body.append(dialog); dialog.showModal();
  dialog.addEventListener('close', () => { dialog.remove(); document.querySelector('[data-action="preview"]')?.focus(); }, { once: true });
  notice('草稿已保存，正在预览。访客仍会看到上一次发布的内容。', 'success');
}

function publicationNotice(result) {
  const github = result.github || result;
  const status = github.status;
  const livePublished = result.livePublished ?? github.livePublished;
  if (livePublished === false && !['failed', 'failure', 'error', 'cancelled', 'timed_out'].includes(status)) {
    notice('更新正在部署，公开内容尚未切换。请等待上线完成。', ''); return true;
  }
  if (['succeeded', 'success', 'completed', 'deployed'].includes(status)) {
    notice('发布已完成，个人网站也已更新。', 'success'); return false;
  }
  if (['failed', 'failure', 'error', 'cancelled', 'timed_out'].includes(status)) {
    notice(`${livePublished === false ? '本次更新尚未公开发布。' : '庄园内容已发布，但个人网站部署没有完成。'}${github.error || result.error ? ` ${github.error || result.error}` : '可以稍后重新发布。'}`, 'error'); return false;
  }
  if (['not_configured', 'unconfigured', 'disabled', 'unavailable', 'skipped'].includes(status)) {
    notice('庄园内容已发布；GitHub Pages 尚未完成连接，个人网址还没有同步更新。', ''); return false;
  }
  if (['pending', 'queued', 'in_progress', 'building', 'deploying'].includes(status)) {
    notice('庄园内容已发布，个人网站正在部署。请等待上线结果。', ''); return true;
  }
  notice('庄园内容已发布。个人网站的部署状态暂不可用，请稍后查看发布记录。', ''); return false;
}

function pollPublication(sha, attemptId, attempts = 0) {
  clearTimeout(state.publishTimer);
  if ((!sha && !attemptId) || attempts >= 60) {
    if (attempts >= 60) notice('更新仍在部署，暂时无法确认上线结果。稍后可以再次检查。', '', '<button type="button" class="button" data-action="check-publish">检查上线状态</button>');
    return;
  }
  state.publishTimer = setTimeout(async () => {
    if (!state.session?.authenticated) return;
    try {
      const query = new URLSearchParams();
      if (sha) query.set('sha', sha);
      if (attemptId) query.set('attempt', attemptId);
      const result = await request(`/publish-status?${query}`);
      if (publicationNotice(result)) pollPublication(sha, attemptId, attempts + 1);
    } catch (error) {
      notice(`暂时无法查询部署状态，尚不能确认本次更新已经上线。${error.status === 401 ? '请重新登录后检查。' : '稍后可以再次检查。'}`, '', '<button type="button" class="button" data-action="check-publish">检查上线状态</button>');
    }
  }, 5000);
}

async function publish() {
  clearTimeout(state.publishTimer);
  await saveDraft({ quiet: true });
  const result = await request('/publish', { method: 'POST', body: JSON.stringify({ version: state.version }) });
  state.publishedAt = result.publishedAt; state.versions = null;
  state.lastPublication = { sha: result.github?.sha, attemptId: result.attemptId };
  if (publicationNotice(result)) pollPublication(result.github?.sha, result.attemptId);
  if (state.section === 'history') await loadHistory();
}

async function loadHistory() {
  try {
    const result = await request('/history');
    state.versions = Array.isArray(result.versions) ? result.versions : [];
    if (state.section === 'history') renderEditor();
  } catch (error) { errorNotice(error); }
}

async function changeSection(section) {
  if (!chapters[section] || state.busy) return;
  state.section = section;
  const url = new URL(location.href); url.searchParams.set('section', section); history.replaceState(null, '', url);
  renderEditor(); document.querySelector('#chapter-title')?.focus({ preventScroll: true });
  if (section === 'history' && state.versions === null) await loadHistory();
}

function makeEntry(list) {
  const id = `item-${crypto.randomUUID()}`;
  if (list === 'projects') return { id, title: '', category: '', summary: '', body: '', cover: '', images: [], url: '', visible: true };
  if (list === 'study.courses') return { id, code: '', name: '', notes: '', visible: true };
  return { id, title: '', body: '', image: '', visible: true };
}

async function uploadImages(input) {
  const files = Array.from(input.files || []);
  if (!files.length) return;
  const multiple = input.dataset.multiple === 'true';
  const path = input.dataset.upload;
  if (multiple && files.length + getPath(path).length > 12) throw new Error('一件作品最多放 12 张图片，请减少本次选择的图片数量。');
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('请选择 JPG、PNG、WebP 或 GIF 图片。');
    if (!file.size || file.size > 8 * 1024 * 1024) throw new Error('图片不能为空，且每张需要小于 8 MB。');
  }
  let completed = 0;
  try {
    for (const file of files) {
      setBusy(true, `正在上传图片 ${completed + 1} / ${files.length}…`);
      const result = await request(`/media?name=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!safeImageSource(result.url)) throw new Error('上传后的图片地址无效，未加入草稿。');
      if (multiple) setPath(path, [...getPath(path), result.url]); else setPath(path, result.url);
      completed++;
    }
    renderEditor(); notice('图片已上传并加入本页草稿。请保存草稿，预览后再发布。', 'success');
  } catch (error) {
    renderEditor();
    if (completed) throw new Error(`已上传 ${completed} 张，其余未完成。已上传的图片保留在本页草稿中。${error.message}`);
    throw error;
  }
}

async function runAction(action, button) {
  if (action === 'prepare-setup') { await prepareSetup(button); return; }
  if (action === 'retry-session') { await initialize(); return; }
  if (action === 'close-preview') { document.querySelector('#preview-dialog')?.close(); return; }
  if (action === 'check-publish') {
    if (button?.dataset.id) state.lastPublication = { sha: button.dataset.sha, attemptId: button.dataset.id };
    if (state.lastPublication) { notice('正在检查上线状态…'); pollPublication(state.lastPublication.sha, state.lastPublication.attemptId); }
    return;
  }
  if (state.busy || !state.content) return;
  if (action === 'add') {
    const list = button.dataset.list; const items = getPath(list);
    if (items.length >= 60) return;
    const entry = makeEntry(list); items.push(entry); markDirty(); renderEditor();
    const element = document.querySelector(`[data-entry="${entry.id}"]`); element?.scrollIntoView({ behavior: 'auto', block: 'start' }); element?.querySelector('input[type=text]')?.focus({ preventScroll: true });
    return;
  }
  if (action === 'remove' || action === 'move') {
    const items = getPath(button.dataset.list); const index = Number(button.dataset.index);
    if (action === 'remove') {
      if (!confirm('从草稿中删除这条记录？保存并发布后，访客才会看到变更。')) return;
      items.splice(index, 1);
    } else {
      const destination = index + Number(button.dataset.step);
      if (destination < 0 || destination >= items.length) return;
      [items[index], items[destination]] = [items[destination], items[index]];
    }
    markDirty(); renderEditor(); return;
  }
  if (action === 'clear-image') { setPath(button.dataset.path, ''); renderEditor(); return; }
  if (action === 'remove-image') { const images = getPath(button.dataset.path); images.splice(Number(button.dataset.index), 1); markDirty(); renderEditor(); return; }
  if (action === 'restore' && !confirm(state.dirty ? '本页有未保存的修改。恢复历史版本会用该版本替换当前草稿，是否继续？' : '把这个历史版本恢复为草稿？公开内容暂时不会改变。')) return;
  if (action === 'conflict-reload' && state.dirty && !confirm('载入最新草稿会放弃本页尚未保存的修改，是否继续？')) return;
  if (action === 'logout' && state.dirty && !confirm('本页还有未保存的修改。退出会放弃这些修改，是否退出？')) return;
  const labels = { save: '正在保存草稿…', preview: '正在准备预览…', publish: '正在发布更新…', restore: '正在恢复草稿…', logout: '正在退出…', 'load-history': '正在读取发布记录…', 'conflict-reload': '正在载入最新草稿…', 'conflict-keep': '正在核对最新版本…', 'refresh-session': '正在核对登录…' };
  setBusy(true, labels[action] || '正在处理…');
  try {
    if (action === 'save') await saveDraft();
    if (action === 'preview') await openPreview();
    if (action === 'publish') await publish();
    if (action === 'load-history') await loadHistory();
    if (action === 'restore') {
      const result = await request('/restore', { method: 'POST', body: JSON.stringify({ id: button.dataset.id, version: state.version }) });
      state.content = validateContent(result.content); state.version = result.version; state.updatedAt = result.updatedAt;
      state.saved = JSON.stringify(state.content); state.dirty = false; state.conflict = false;
      renderEditor(); notice('历史版本已恢复为草稿。请先预览，确认后再发布。', 'success');
    }
    if (action === 'conflict-reload') { await loadDraft(); renderEditor(); notice('已载入最新草稿。', 'success'); }
    if (action === 'conflict-keep') {
      const latest = await request('/draft');
      state.version = latest.version; state.updatedAt = latest.updatedAt; state.saved = JSON.stringify(validateContent(latest.content)); state.conflict = false; markDirty();
      notice('本页内容已保留。再次点击「保存草稿」会用本页内容替换最新草稿，请确认后保存。');
    }
    if (action === 'refresh-session') {
      state.session = await request('/session');
      if (!state.session.authenticated) throw new RequestError('还未完成庄园主登录。请在 GitHub 登录完成后重试。', 401);
      notice('登录已恢复。本页修改仍然保留，可以继续保存。', 'success');
    }
    if (action === 'logout') {
      await request('/logout', { method: 'POST', body: '{}' });
      clearTimeout(state.publishTimer); state.dirty = false; state.content = null; state.session.authenticated = false;
      renderLogin();
    }
  } catch (error) { errorNotice(error); }
  finally { setBusy(false); }
}

document.addEventListener('click', event => {
  const chapter = event.target.closest('[data-section]');
  if (chapter) { void changeSection(chapter.dataset.section); return; }
  const button = event.target.closest('[data-action]');
  if (button) { event.preventDefault(); void runAction(button.dataset.action, button); }
});

document.addEventListener('input', event => {
  const field = event.target.closest('input[data-path],textarea[data-path],select[data-path]');
  if (!field || !state.content || state.busy) return;
  const value = field.type === 'checkbox' ? field.checked : field.type === 'range' ? Number(field.value) : field.value;
  setPath(field.dataset.path, value);
  if (field.type === 'range') document.querySelector('#volume-output').textContent = `${Math.round(value * 100)}%`;
});

document.addEventListener('change', async event => {
  if (event.target.id === 'chapter-select') { await changeSection(event.target.value); return; }
  if (!event.target.matches('input[data-upload]') || state.busy) return;
  try { await uploadImages(event.target); }
  catch (error) { errorNotice(error); event.target.value = ''; }
  finally { setBusy(false); }
});

document.addEventListener('submit', event => {
  if (event.target.id === 'editor-form') { event.preventDefault(); if (!state.busy) void runAction('save'); }
});

window.addEventListener('beforeunload', event => {
  if (state.dirty) { event.preventDefault(); event.returnValue = ''; }
});

void initialize();

