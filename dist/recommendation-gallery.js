import {getLanguage} from './language.js?v=20261024-25';
import {normalizeGitHubRepository} from './content-model.js?v=20261024-25';

const collections = new WeakMap();
const PAGE_SIZE = 5;
let sequence = 0;
const wording = (zh,en) => getLanguage() === 'en' ? en : zh;
const textValue = value => typeof value === 'string' ? value.trim() : '';

export function recommendationURL(value) {
  try { return normalizeGitHubRepository(value); } catch { return ''; }
}

/** Only complete, visible GitHub recommendations belong in the public folio. */
export function recommendationGalleryEntries(recommendations) {
  if (!Array.isArray(recommendations)) return [];
  const entries = [];
  for (const entry of recommendations) {
    if (!entry || entry.visible === false || !textValue(entry.title)) continue;
    const url = recommendationURL(entry.url);
    if (!url) continue;
    entries.push({id:textValue(entry.id) || url,title:textValue(entry.title),summary:textValue(entry.summary),
      url,repository:new URL(url).pathname.slice(1)});
    if (entries.length === 60) break;
  }
  return entries;
}

/** A single reading spread; the index and prose stay inside the manor scene. */
export function renderRecommendationGallery(host,recommendations = []) {
  if (!host) return () => {};
  const previous = collections.get(host)?.selected;
  collections.get(host)?.dispose();
  const doc = host.ownerDocument;
  const lifecycle = new (doc.defaultView?.AbortController || AbortController)();
  const id = `recommendation-${++sequence}`;
  const entries = recommendationGalleryEntries(recommendations);
  let selected = Math.max(0,entries.findIndex(entry => entry.id === previous));
  const record = {selected:entries[selected]?.id,dispose};
  collections.set(host,record);
  host.classList.add('recommendation-gallery-host');host.replaceChildren();

  function dispose() {
    lifecycle.abort();
    if (collections.get(host) === record) collections.delete(host);
  }
  function node(tag,className,text,content = false) {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    if (content) element.dataset.languageContent = 'true';
    return element;
  }
  function button(className,text,action,label = text) {
    const element = node('button',className,text);
    element.type = 'button';element.dataset.recommendationAction = action;
    element.setAttribute('aria-label',label);
    return element;
  }

  if (!entries.length) {
    const empty = node('div','recommendation-empty');
    const spine = node('div','recommendation-empty-spine',wording('项目珍藏','GitHub picks'));
    spine.setAttribute('aria-hidden','true');
    const page = node('div','recommendation-empty-page');
    page.append(node('h3','',wording('暂未收录推荐项目。','No projects added yet.')),
      node('p','',wording('这里会收录我推荐的 GitHub 项目、链接与简介。','My recommended GitHub projects, links and introductions will appear here.')));
    empty.append(spine,page);host.append(empty);
    return dispose;
  }

  const collection = node('div','recommendation-collection');
  const index = node('nav','recommendation-index');
  index.setAttribute('aria-label',wording('推荐项目目录','Recommended project index'));
  const heading = node('p','recommendation-index-heading',wording('项目目录','Project index'));
  const tabs = node('div','recommendation-index-list');
  tabs.setAttribute('role','tablist');tabs.setAttribute('aria-orientation','vertical');
  tabs.setAttribute('aria-label',wording('选择推荐项目','Choose a recommended project'));
  const indexPaging = node('div','recommendation-index-paging');
  index.append(heading,tabs,indexPaging);
  const spread = node('section','recommendation-record');
  spread.id = `${id}-panel`;spread.setAttribute('role','tabpanel');
  collection.append(index,spread);host.append(collection);

  function renderIndex() {
    tabs.replaceChildren();indexPaging.replaceChildren();
    const page = Math.floor(selected / PAGE_SIZE);
    entries.slice(page * PAGE_SIZE,(page + 1) * PAGE_SIZE).forEach((entry,offset) => {
      const position = page * PAGE_SIZE + offset;
      const tab = button('recommendation-index-item','','select',entry.title);
      tab.id = `${id}-tab-${position}`;tab.dataset.recommendation = String(position);
      tab.dataset.languageContent = 'true';tab.setAttribute('role','tab');
      tab.setAttribute('aria-controls',spread.id);tab.setAttribute('aria-selected',String(position === selected));
      tab.tabIndex = position === selected ? 0 : -1;
      tab.append(node('span','recommendation-index-title',entry.title,true));tabs.append(tab);
    });
    indexPaging.hidden = entries.length <= PAGE_SIZE;
    if (indexPaging.hidden) return;
    const previousPage = button('recommendation-page-arrow','‹','index-previous',wording('上一页项目目录','Previous index page'));
    const nextPage = button('recommendation-page-arrow','›','index-next',wording('下一页项目目录','Next index page'));
    previousPage.disabled = page === 0;nextPage.disabled = (page + 1) * PAGE_SIZE >= entries.length;
    const pageNumber = node('span','recommendation-page-number',`${page + 1} / ${Math.ceil(entries.length / PAGE_SIZE)}`);
    pageNumber.setAttribute('aria-live','polite');indexPaging.append(previousPage,pageNumber,nextPage);
  }
  function renderRecord() {
    const entry = entries[selected];
    spread.setAttribute('aria-labelledby',`${id}-tab-${selected}`);spread.replaceChildren();
    const writing = node('div','recommendation-writing');
    writing.tabIndex = 0;writing.setAttribute('role','region');writing.setAttribute('aria-labelledby',`${id}-title`);
    const title = node('h3','recommendation-title',entry.title,true);title.id = `${id}-title`;
    const repository = node('p','recommendation-repository',entry.repository,true);
    writing.append(title,repository);
    if (entry.summary) {
      const summary = node('div','recommendation-summary','',true);
      entry.summary.split(/\n\s*\n/).filter(Boolean).forEach(paragraph => summary.append(node('p','',paragraph)));
      writing.append(summary);
    }
    const footer = node('footer','recommendation-record-footer');
    const link = node('a','recommendation-github-link',wording('在 GitHub 查看项目','View project on GitHub'));
    link.href = entry.url;link.target = '_blank';link.rel = 'noopener noreferrer';footer.append(link);
    if (entries.length > 1) {
      const paging = node('div','recommendation-record-paging');
      const previousEntry = button('recommendation-page-arrow','‹','previous',wording('上一个推荐项目','Previous recommendation'));
      const nextEntry = button('recommendation-page-arrow','›','next',wording('下一个推荐项目','Next recommendation'));
      previousEntry.disabled = selected === 0;nextEntry.disabled = selected === entries.length - 1;
      const pageNumber = node('span','recommendation-page-number',`${selected + 1} / ${entries.length}`);
      pageNumber.setAttribute('aria-live','polite');paging.append(previousEntry,pageNumber,nextEntry);footer.append(paging);
    }
    spread.append(writing,footer);
  }
  function select(position,focusTarget = 'tab') {
    selected = Math.max(0,Math.min(position,entries.length - 1));record.selected = entries[selected].id;
    renderIndex();renderRecord();
    const target = focusTarget === 'tab' ? tabs.querySelector('[aria-selected="true"]')
      : host.querySelector(`[data-recommendation-action="${focusTarget}"]:not(:disabled)`);
    (target || tabs.querySelector('[aria-selected="true"]'))?.focus({preventScroll:true});
  }
  host.addEventListener('click',event => {
    const target = event.target.closest?.('[data-recommendation-action]');
    if (!target || !host.contains(target) || target.disabled) return;
    const action = target.dataset.recommendationAction;
    if (action === 'select') select(Number(target.dataset.recommendation));
    else if (action === 'previous' || action === 'next') select(selected + (action === 'next' ? 1 : -1),action);
    else if (action === 'index-previous' || action === 'index-next') {
      select((Math.floor(selected / PAGE_SIZE) + (action === 'index-next' ? 1 : -1)) * PAGE_SIZE,action);
    }
  },{signal:lifecycle.signal});
  host.addEventListener('keydown',event => {
    const tab = event.target.closest?.('[role="tab"]');
    if (!tab || !tabs.contains(tab) || event.altKey || event.ctrlKey || event.metaKey) return;
    const destinations = {ArrowDown:selected + 1,ArrowRight:selected + 1,ArrowUp:selected - 1,ArrowLeft:selected - 1,Home:0,End:entries.length - 1};
    if (destinations[event.key] === undefined) return;
    event.preventDefault();event.stopPropagation();select(destinations[event.key]);
  },{signal:lifecycle.signal});
  renderIndex();renderRecord();return dispose;
}
