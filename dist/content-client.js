import { validateContent, SECTION_KEYS } from './content-model.js';

const HOSTED_ORIGIN = 'https://sky-tian-manor-portfolio.perky-berry-1262.chatgpt.site';
const apiOrigin = location.hostname.endsWith('.github.io') ? HOSTED_ORIGIN : location.origin;
const adminURL = `${apiOrigin}/admin/`;
const previewId = new URLSearchParams(location.search).get('preview');
const $ = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
const node = (tag, className, value) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
};
const setText = (selector, value) => all(selector).forEach(element => { element.textContent = value; });
const paragraphs = (element, value, className = '') => {
  element.replaceChildren(...value.split(/\n\s*\n/).filter(Boolean).map(part => node('p', className, part)));
};
const mediaURL = value => value.startsWith('/api/manor/media/') ? `${apiOrigin}${value}` : value;
const picture = (value, alt, className = '') => {
  const image = node('img', className);
  image.src = mediaURL(value); image.alt = alt; image.loading = 'lazy'; image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  return image;
};
const originalDemo = $('.project-visual').cloneNode(true);
const projectCollection = node('div', 'project-collection');
projectCollection.setAttribute('role', 'region');
projectCollection.setAttribute('aria-label', '作品内容');
projectCollection.tabIndex = 0;

window.SkyContent = {
  data: null, adminURL, preview: Boolean(previewId),
  isVisible: key => !window.SkyContent.data || window.SkyContent.data.sections[key]?.visible !== false,
};

function names(content) {
  const { profile } = content;
  setText('.brand > span, .dossier-identity h3, .signature, .paper-stamp, .interest-signature', profile.name);
  $('.brand').setAttribute('aria-label', `${profile.name}，返回封面`);
  if (profile.name !== 'Sky 天') {
    $('#hero-title').textContent = profile.name;
    $('#hero-title').classList.add('custom-profile-name');
    $('#hero-title').style.fontSize = `${Math.max(46, Math.min(96, 640 / Math.sqrt(profile.name.length)))}px`;
  }
  setText('.hero-focus, .lobby-tagline, .dossier-identity > p', profile.tagline.replace(/\s+&\s+/, '\n& '));
  setText('#lobby-title', `${profile.name}的个人大厅`);
  setText('.bio', profile.bio);
  $('.dossier-writing').tabIndex = 0;
  $('.dossier-writing').setAttribute('role', 'region');
  $('.dossier-writing').setAttribute('aria-label', content.sections.about.title);
  const identity = $('.dossier-identity');
  identity.querySelector('.profile-avatar')?.remove();
  $('.dossier-emblem').hidden = Boolean(profile.avatar);
  if (profile.avatar) identity.prepend(picture(profile.avatar, `${profile.name}的头像`, 'profile-avatar'));
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = [profile.name, profile.tagline].filter(Boolean).join(' · ');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = `${profile.name} · 个人档案`;
}

function sectionLabels(content) {
  for (const key of SECTION_KEYS) {
    const section = content.sections[key];
    const scene = document.getElementById(key);
    scene.dataset.contentVisible = String(section.visible);
    setText(`#${key}-title`, section.title);
    setText(`.hotspot-${key} .hotspot-title`, section.title);
    setText(`.hotspot-${key} .hotspot-subtitle`, section.subtitle);
    all(`a[href="#${key}"]`).forEach(link => {
      link.hidden = !section.visible;
      link.dataset.contentVisible = String(section.visible);
      if (link.closest('.desktop-nav,.mobile-nav,.room-directory-list')) link.textContent = section.title;
      if (link.closest('.scene-progress')) link.setAttribute('aria-label', section.title);
      if (link.classList.contains('next-scene')) link.querySelector('span').textContent = `继续阅读${section.title}`;
      if (link.closest('.detail-bottom') && link.firstChild?.nodeType === Node.TEXT_NODE) link.firstChild.textContent = section.title;
    });
  }
  setText('.dossier-writing h4', content.sections.about.title);
  for (const key of ['study', 'interests']) $(`#${key} .detail-bottom`).setAttribute('aria-label', `${content.sections[key].title}页面导航`);
}

function projects(content) {
  if (!projectCollection.isConnected) $('.project').replaceWith(projectCollection);
  const visible = content.projects.filter(project => project.visible);
  projectCollection.replaceChildren();
  for (const project of visible) {
    const article = node('article', 'project managed-project');
    article.dataset.projectId = project.id;
    let visual;
    if (project.cover) visual = picture(project.cover, project.title, 'project-cover');
    else if (project.id === 'syncwallpaper') visual = originalDemo.cloneNode(true);
    else {
      visual = node('div', 'project-text-cover');
      visual.append(node('span', '', project.category || '作品'), node('strong', '', project.title));
    }
    const copy = node('div', 'project-copy');
    const body = node('div', 'project-body');
    paragraphs(body, project.body);
    copy.append(node('span', 'project-tag', project.category), node('h3', '', project.title), node('p', 'project-summary', project.summary), body);
    if (project.url) {
      const link = node('a', 'ornate-button project-link', new URL(project.url).hostname === 'github.com' ? '查看 GitHub 项目' : '查看作品');
      link.href = project.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      copy.append(link);
    }
    article.append(visual, copy);
    if (project.images.length) {
      const gallery = node('div', 'project-gallery');
      for (const [index, image] of project.images.entries()) gallery.append(picture(image, `${project.title} · 图片 ${index + 1}`));
      article.append(gallery);
    }
    projectCollection.append(article);
  }
  if (!visible.length) projectCollection.append(node('p', 'content-empty', '作品尚未公开。'));
}

function study(content) {
  for (const selector of ['.study-major', '.study-courses']) {
    $(selector).tabIndex = 0;
    $(selector).setAttribute('role', 'region');
    $(selector).setAttribute('aria-label', selector === '.study-major' ? '专业介绍' : '课程与学习笔记');
  }
  setText('.study-university', content.study.university);
  setText('.study-major h3', content.study.major.replace(/\s+&\s+/, '\n& '));
  $('.study-description')?.remove();
  if (content.study.description) {
    const description = node('div', 'study-description');
    paragraphs(description, content.study.description);
    $('.study-major').append(description);
  }
  const courses = content.study.courses.filter(course => course.visible);
  $('.study-course-list').replaceChildren(...courses.map(course => {
    const item = node('li');
    if (course.code) item.append(node('span', 'course-code', course.code));
    if (course.name) item.append(node('strong', 'course-name', course.name));
    if (course.notes) { const notes = node('div', 'course-notes'); paragraphs(notes, course.notes); item.append(notes); }
    return item;
  }));
  $('.course-list').replaceChildren(...courses.map(course => node('span', '', course.code || course.name)));
  const interestNames = content.interests.filter(item => item.visible).map(item => item.title).join('、');
  $('.dossier-details > div:last-child dd').textContent = interestNames;
  all('.dossier-details > div').forEach(detail => { detail.hidden = !detail.querySelector('dd').textContent; });
}

function interests(content) {
  const visible = content.interests.filter(interest => interest.visible);
  const entries = node('div', 'interest-entries');
  entries.setAttribute('role', 'region'); entries.setAttribute('aria-label', content.sections.interests.title); entries.tabIndex = 0;
  for (const interest of visible) {
    const article = node('article', 'interest-entry');
    article.append(node('h3', 'interest-typewritten', interest.title));
    const body = node('div', 'interest-description'); paragraphs(body, interest.body); article.append(body);
    if (interest.image) article.append(picture(interest.image, interest.title, 'interest-image'));
    entries.append(article);
  }
  if (!visible.length) entries.append(node('p', 'content-empty', '兴趣手记尚未公开。'));
  $('.interest-note').replaceChildren(node('div', 'interest-paper-fold'), entries, node('p', 'interest-signature', content.profile.name));
}

function render(input) {
  const content = validateContent(input);
  window.SkyContent.data = content;
  names(content); sectionLabels(content); projects(content); study(content); interests(content);
  document.documentElement.classList.add('content-managed');
  window.dispatchEvent(new CustomEvent('sky:contentchange', { detail: { content, preview: Boolean(previewId) } }));
}

async function fetchJSON(url, credentials = 'omit') {
  const response = await fetch(url, { credentials, cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`读取失败 (${response.status})`);
  return response.json();
}

function previewNotice(error = false) {
  const notice = node('aside', `content-preview ${error ? 'preview-failed' : ''}`);
  notice.setAttribute('role', error ? 'alert' : 'status');
  notice.append(node('strong', '', error ? '无法打开私密预览' : '正在预览未发布的草稿'));
  if (error) notice.append(node('p', '', '请先用庄园主账号登录，再从管理册重新打开预览。这个页面没有展示草稿。'));
  const link = node('a', '', '返回管理册'); link.href = adminURL; notice.append(link);
  document.body.append(notice);
  if (error) {
    $('.game-stage').inert = true;
    $('.game-stage').setAttribute('aria-hidden', 'true');
    window.SkyRoom?.setActive(false);
    $('#lobby-music').pause();
  }
}

async function loadContent() {
  if (previewId) {
    try {
      if (apiOrigin !== location.origin || !/^[A-Za-z0-9_-]{8,160}$/.test(previewId)) throw new Error('预览链接不正确');
      const result = await fetchJSON(`/api/manor/preview/${encodeURIComponent(previewId)}`, 'same-origin');
      render(result.content || result); previewNotice();
    } catch { previewNotice(true); }
    return;
  }
  try {
    const result = await fetchJSON(`${apiOrigin}/api/manor/content`);
    render(result.content || result);
  } catch {
    try { render(await fetchJSON(new URL('./content/site.json', import.meta.url))); }
    catch { document.documentElement.classList.add('content-unavailable'); }
  }
}

async function ownerSession() {
  all('.owner-entry').forEach(link => { link.href = adminURL; });
  if (apiOrigin !== location.origin) return;
  try {
    const session = await fetchJSON('/api/manor/session', 'same-origin');
    if (!session.authenticated) return;
    all('.owner-entry').forEach(link => { link.textContent = '管理庄园'; });
    const toolbar = node('nav', 'owner-toolbar'); toolbar.setAttribute('aria-label', '庄园主管理');
    const edit = node('a', '', '编辑此页');
    const manager = node('a', '', '管理册'); manager.href = adminURL;
    const update = () => {
      const scene = $('.game-stage').dataset.scene;
      edit.href = `${adminURL}?section=${SECTION_KEYS.includes(scene) ? scene : 'profile'}`;
    };
    update(); window.addEventListener('sky:scenechange', update);
    toolbar.append(node('span', '', '庄园主'), edit, manager); document.body.append(toolbar);
  } catch { /* Public browsing remains available without a management session. */ }
}

loadContent();
ownerSession();
