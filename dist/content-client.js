import { renderLifeJourney } from './life-journey.js?v=20261025-35';
import { renderRecommendationGallery } from './recommendation-gallery.js?v=20261025-35';
import { renderPetGallery } from './pet-gallery.js?v=20261024-30';
import { renderGameGallery } from './game-gallery.js?v=20261025-35';
import { validateContent, SECTION_KEYS } from './content-model.js?v=20261024-27';
import { renderStudyTree } from './study-tree.js?v=20261023-15';
import { renderProjectShowcase } from './project-showcase.js?v=20261024-30';
import { getLanguage, localizeContent, refreshLanguageUI } from './language.js?v=20261025-35';

const HOSTED_ORIGIN = 'https://sky-tian-manor-portfolio.perky-berry-1262.chatgpt.site';
const STATIC_ORIGINS = new Set([
  'https://skyxiangtian13152.github.io',
  'https://sky-tian-manor-aogvwszi.edgeone.dev',
]);
const apiOrigin = STATIC_ORIGINS.has(location.origin) ? HOSTED_ORIGIN : location.origin;
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
const contentNode = (tag, className, value) => {
  const element=node(tag,className,value); element.dataset.languageContent='true'; return element;
};
const bilingual = (chinese, english) => getLanguage()==='en' ? english : chinese;
const heroTemplate = $('#hero-title').cloneNode(true);
const setText = (selector, value) => all(selector).forEach(element => { element.textContent = value; element.dataset.languageContent='true'; });
const paragraphs = (element, value, className = '') => {
  element.replaceChildren(...value.split(/\n\s*\n/).filter(Boolean).map(part => contentNode('p', className, part)));
};
const mediaURL = value => value.startsWith('/api/manor/media/') ? `${apiOrigin}${value}` : value;
const picture = (value, alt, className = '') => {
  const image = node('img', className);
  image.src = mediaURL(value); image.alt = alt; image.loading = 'lazy'; image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  return image;
};


window.SkyContent = {
  data: null, rawContent: null, adminURL, preview: Boolean(previewId),
  isVisible: key => !window.SkyContent.data || window.SkyContent.data.sections[key]?.visible !== false,
};

function names(content) {
  const { profile } = content;
  setText('.brand > span, .dossier-identity h3, .signature, .paper-stamp, .interest-signature', profile.name);
  $('.brand').setAttribute('aria-label', bilingual(`${profile.name}，返回封面`,`${profile.name}, return to cover`));
  $('.brand').dataset.languageContent='true';
  $('#hero-title').dataset.languageContent='true';
  if (profile.name !== 'Sky 天') {
    $('#hero-title').textContent = profile.name;
    $('#hero-title').classList.add('custom-profile-name');
    $('#hero-title').style.fontSize = `${Math.max(46, Math.min(96, 640 / Math.sqrt(profile.name.length)))}px`;
  } else {
    $('#hero-title').replaceChildren(...[...heroTemplate.childNodes].map(child=>child.cloneNode(true)));
    $('#hero-title').classList.remove('custom-profile-name');
    $('#hero-title').style.removeProperty('font-size');
  }
  setText('.hero-focus, .lobby-tagline', profile.tagline.replace(/\s+&\s+/, '\n& '));
  setText('#lobby-title', bilingual(`${profile.name}的个人大厅`,`${profile.name}’s manor lobby`));
  setText('.bio', profile.bio);
  $('.bio').hidden = !profile.bio;
  setText('.profile-education', profile.education || profile.tagline);
  $('.profile-school')?.remove();
  if (profile.education) {
    const school=node('a','profile-school','UNSW Sydney · 学校官网');
    school.href='https://www.unsw.edu.au/';school.target='_blank';school.rel='noopener noreferrer';
    $('.profile-closing').append(school);
  }
  $('.profile-facts')?.remove();
  const facts=node('dl','profile-facts');
  const fact=(label,value,href)=>{if(!value)return;const row=node('div');row.append(node('dt','',label));const dd=contentNode('dd');if(href){const link=node('a','',value);link.href=href;if(!href.startsWith('mailto:')){link.target='_blank';link.rel='noopener noreferrer';}dd.append(link);}else dd.textContent=value;row.append(dd);facts.append(row);};
  fact('国籍',profile.nationality);
  fact('出生城市',profile.birthplace);
  fact('GitHub',profile.github ? new URL(profile.github).pathname.slice(1) : '',profile.github);
  fact('联系邮箱',profile.email,profile.email ? 'mailto:'+profile.email : '');
  $('.dossier-writing').insertBefore(facts,$('.dossier-rule'));
  $('.dossier-writing').tabIndex = 0;
  $('.dossier-writing').setAttribute('role', 'region');
  $('.dossier-writing').setAttribute('aria-label', content.sections.about.title);
  const identity = $('.dossier-identity');
  identity.querySelector('.profile-portrait')?.remove();
  identity.querySelector('.profile-avatar')?.remove();
  $('.dossier-emblem').hidden = Boolean(profile.avatar);
  if (profile.avatar) {
    const frame=node('figure','profile-portrait');
    frame.append(picture(profile.avatar, bilingual(`${profile.name}的头像`,`${profile.name}’s portrait`), 'profile-avatar'));
    identity.querySelector('h3').after(frame);
  }
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = [profile.name, profile.tagline].filter(Boolean).join(' · ');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = `${profile.name} · ${bilingual('个人档案','Personal archive')}`;
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
      if (link.closest('.desktop-nav,.mobile-nav,.room-directory-list')) { link.textContent = section.title; link.dataset.languageContent='true'; }
      if (link.closest('.scene-progress')) link.setAttribute('aria-label', section.title);
      if (link.classList.contains('next-scene')) { link.querySelector('span').textContent = bilingual(`继续阅读${section.title}`,`Explore ${section.title}`); link.dataset.languageContent='true'; }
      if (link.closest('.detail-bottom') && link.firstChild?.nodeType === Node.TEXT_NODE) { link.firstChild.textContent = section.title; link.dataset.languageContent='true'; }
    });
  }
  setText('.dossier-writing h4', content.sections.about.title);
  for (const key of ['study', 'interests', 'games', 'recommendations', 'journey']) $(`#${key} .detail-bottom`).setAttribute('aria-label', bilingual(`${content.sections[key].title}页面导航`,`${content.sections[key].title} navigation`));
  $('#people-content').setAttribute('aria-label',content.sections.people.title);
}

function projects(content) {
  let host=$('.project-showcase');
  if(!host){host=node('div','project-showcase');$('.project').replaceWith(host);}
  renderProjectShowcase(host,content.projects.filter(item=>item.visible),{mediaURL});
}

function study(content) {
  renderStudyTree($('.study-tree-mount'),content.study);
  $('.study-qualification')?.remove();
  if(content.profile.credential) {
    const qualification=node('div','study-qualification');
    qualification.append(node('span','study-qualification-label','其他资格'),contentNode('span','study-qualification-value',content.profile.credential));
    $('#study .detail-container').append(qualification);
  }
}

function people(content) {
  const host=$('#people-content');
  const visible=content.people.filter(item=>item.visible);
  host.replaceChildren();
  if(!visible.length){
    const empty=node('div','people-empty');
    const emblem=node('div','people-frame');emblem.setAttribute('aria-hidden','true');emblem.textContent='✦';
    const copy=node('div');copy.append(node('h3','','名人墙尚未题名'),node('p','','重要的人，与他们的故事。'));empty.append(emblem,copy);host.append(empty);return;
  }
  for(const person of visible){
    const article=node('article','person-portrait');
    const frame=node('div','people-frame');
    if(person.image)frame.append(picture(person.image,person.name));else frame.append(node('span','person-initial',person.name.slice(0,1)));
    const copy=node('div','person-copy');copy.append(contentNode('h3','',person.name));
    if(person.role)copy.append(contentNode('p','person-role',person.role));
    const body=node('div','person-story');paragraphs(body,person.body);copy.append(body);
    if(person.url){const link=node('a','person-link','了解更多');link.href=person.url;link.target='_blank';link.rel='noopener noreferrer';copy.append(link);}
    article.append(frame,copy);host.append(article);
  }
}

function interests(content) {
  const visible = content.interests.filter(interest => interest.visible);
  const entries = node('div', 'interest-entries');
  entries.style.setProperty('--interest-columns', Math.min(visible.length || 1, 4));
  entries.setAttribute('role', 'region'); entries.setAttribute('aria-label', content.sections.interests.title); entries.tabIndex = 0;
  for (const interest of visible) {
    const article = node('article', 'interest-entry');
    article.append(contentNode('h3', 'interest-typewritten', interest.title));
    const body = node('div', 'interest-description'); paragraphs(body, interest.body); article.append(body);
    if (interest.image) article.append(picture(interest.image, interest.title, 'interest-image'));
    entries.append(article);
  }
  if (!visible.length) entries.append(node('p', 'content-empty', '兴趣手记尚未公开。'));
  $('.interest-note').replaceChildren(node('div', 'interest-paper-fold'), entries, contentNode('p', 'interest-signature', content.profile.name));
}

function render(input) {
  const rawContent = validateContent(input);
  window.SkyContent.rawContent = rawContent;
  const content = localizeContent(rawContent);
  window.SkyContent.data = content;
  names(content); sectionLabels(content); projects(content); study(content); interests(content); people(content); renderPetGallery($('#pet-gallery'), content.pets || [], {mediaURL});
  renderGameGallery($('#game-gallery'), content.games || [], {mediaURL});
  renderRecommendationGallery($('#recommendation-gallery'), content.recommendations || [], {mediaURL});
  $('#recommendation-gallery').setAttribute('aria-label',content.sections.recommendations.title);
  renderLifeJourney($('#life-journey'), content.journey || [], {mediaURL});
  $('#life-journey').setAttribute('aria-label',content.sections.journey.title);
  document.documentElement.classList.add('content-managed');
  window.dispatchEvent(new CustomEvent('sky:contentchange', { detail: { content, preview: Boolean(previewId) } }));
  refreshLanguageUI();
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

window.addEventListener('sky:languagechange',()=>{
  if(window.SkyContent.rawContent)render(window.SkyContent.rawContent);
});
loadContent();
ownerSession();
