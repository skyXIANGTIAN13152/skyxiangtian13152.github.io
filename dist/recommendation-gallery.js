import {getLanguage} from './language.js?v=20261025-35';
import {normalizeGitHubRepository} from './content-model.js?v=20261024-27';
import {renderRecommendationDemo} from './recommendation-demos.js?v=20261024-27';

const collections = new WeakMap();
const PLATFORMS = new Set(['windows','macos','linux','web']);
let sequence = 0;
const wording = (zh,en) => getLanguage() === 'en' ? en : zh;
const textValue = value => typeof value === 'string' ? value.trim() : '';

export function recommendationURL(value) {
  try { return normalizeGitHubRepository(value); } catch { return ''; }
}

export function recommendationSourceURL(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return '';
  try {
    const url = new URL(value);
    return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function recommendationImageURL(value,base,mediaURL = value => value) {
  if (!textValue(value) || /[\u0000-\u001f\\]/.test(value)) return '';
  try {
    const mapped = mediaURL(value.trim());
    if (!textValue(mapped) || /[\u0000-\u001f\\]/.test(mapped)) return '';
    const url = new URL(mapped,base);
    return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

/** Filter private entries before resolving any media URLs. All prose stays plain text. */
export function recommendationGalleryEntries(recommendations,base,mediaURL) {
  if (!Array.isArray(recommendations)) return [];
  const entries = [];
  for (const entry of recommendations) {
    if (!entry || entry.visible === false || !textValue(entry.title)) continue;
    const url = recommendationURL(entry.url);
    if (!url) continue;
    const images = [...new Set([entry.cover,...(Array.isArray(entry.images) ? entry.images.slice(0,12) : [])]
      .map(value => recommendationImageURL(value,base,mediaURL)).filter(Boolean))].slice(0,12);
    const demo = textValue(entry.demo);
    entries.push({id:textValue(entry.id) || url,title:textValue(entry.title),summary:textValue(entry.summary),
      url,repository:new URL(url).pathname.slice(1),images,imageSource:recommendationSourceURL(entry.imageSource),
      usage:textValue(entry.usage),demo:/^[a-z0-9-]{1,40}$/.test(demo) ? demo : '',
      platforms:[...new Set((Array.isArray(entry.platforms) ? entry.platforms : []).filter(value => PLATFORMS.has(value)))]});
    if (entries.length === 60) break;
  }
  return entries;
}

/** Screenshot-first project exhibits contained inside the manor's archive scene. */
export function renderRecommendationGallery(host,recommendations = [],{mediaURL = value => value} = {}) {
  if (!host) return () => {};
  const previous = collections.get(host)?.selected;
  const previousScroll = host.querySelector('.recommendation-index-list')?.scrollTop || 0;
  collections.get(host)?.dispose();
  const doc = host.ownerDocument,view = doc.defaultView;
  const lifecycle = new (view?.AbortController || AbortController)();
  const id = `recommendation-${++sequence}`;
  const entries = recommendationGalleryEntries(recommendations,doc.baseURI,mediaURL);
  let selected = Math.max(0,entries.findIndex(entry => entry.id === previous));
  let mode = 'image',imageIndex = 0,disposeDemo = null,modal = null,modalReturn = null;
  let active = !host.closest('.game-stage') || host.closest('.game-stage').dataset.scene === 'recommendations';
  const record = {selected:entries[selected]?.id,dispose};
  collections.set(host,record);
  host.classList.add('recommendation-gallery-host');host.replaceChildren();

  function stopDemo() { disposeDemo?.();disposeDemo = null; }
  function dispose() {
    stopDemo();closeModal(false);lifecycle.abort();
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
    element.setAttribute('aria-label',label);return element;
  }
  function link(className,text,url) {
    const element = node('a',className,text);
    element.href = url;element.target = '_blank';element.rel = 'noopener noreferrer';return element;
  }
  function paragraphs(target,value) {
    value.split(/\n\s*\n/).filter(Boolean).forEach(paragraph => target.append(node('p','',paragraph,true)));
  }

  if (!entries.length) {
    const empty = node('div','recommendation-empty');
    const spine = node('div','recommendation-empty-spine',wording('项目珍藏','GitHub picks'));
    spine.setAttribute('aria-hidden','true');
    const page = node('div','recommendation-empty-page');
    page.append(node('h3','',wording('暂未收录推荐项目。','No projects added yet.')),
      node('p','',wording('这里会收录我推荐的 GitHub 项目、界面与使用方法。','My recommended GitHub projects, screenshots and usage notes will appear here.')));
    empty.append(spine,page);host.append(empty);return dispose;
  }

  const collection = node('div','recommendation-collection');
  const index = node('nav','recommendation-index');
  index.setAttribute('aria-label',wording('推荐项目目录','Recommended project index'));
  const heading = node('p','recommendation-index-heading',wording('项目目录','Project index'));
  const tabs = node('div','recommendation-index-list');
  tabs.setAttribute('role','tablist');tabs.setAttribute('aria-orientation','vertical');
  tabs.setAttribute('aria-label',wording('选择推荐项目','Choose a recommended project'));
  index.append(heading,tabs);
  const spread = node('section','recommendation-record');
  spread.id = `${id}-panel`;spread.setAttribute('role','tabpanel');
  const exhibit = node('div','recommendation-exhibit');
  const toolbar = node('div','recommendation-exhibit-toolbar');
  const modes = node('div','recommendation-modes');
  modes.setAttribute('role','tablist');modes.setAttribute('aria-label',wording('项目展示方式','Project display mode'));
  const mediaPaging = node('div','recommendation-image-paging');
  toolbar.append(modes,mediaPaging);
  const visual = node('div','recommendation-visual');visual.id = `${id}-visual`;visual.setAttribute('role','tabpanel');
  exhibit.append(toolbar,visual);
  const writing = node('div','recommendation-writing');
  writing.tabIndex = 0;writing.setAttribute('role','region');writing.setAttribute('aria-labelledby',`${id}-title`);
  const footer = node('footer','recommendation-record-footer');
  spread.append(exhibit,writing,footer);collection.append(index,spread);host.append(collection);

  function renderIndex() {
    entries.forEach((entry,position) => {
      const tab = button('recommendation-index-item','','select',entry.title);
      tab.id = `${id}-tab-${position}`;tab.dataset.recommendation = String(position);
      tab.dataset.languageContent = 'true';tab.setAttribute('role','tab');
      tab.setAttribute('aria-controls',spread.id);tab.setAttribute('aria-selected',String(position === selected));
      tab.tabIndex = position === selected ? 0 : -1;
      tab.append(node('span','recommendation-index-title',entry.title,true));tabs.append(tab);
    });
    tabs.scrollTop = previousScroll;
  }
  function updateIndex() {
    [...tabs.children].forEach((tab,position) => {
      tab.setAttribute('aria-selected',String(position === selected));
      tab.tabIndex = position === selected ? 0 : -1;
    });
    const tab = tabs.children[selected];
    // Scroll only the index, in unscaled stage coordinates.
    const top = tab.offsetTop, bottom = top + tab.offsetHeight;
    if (top < tabs.scrollTop) tabs.scrollTop = top;
    else if (bottom > tabs.scrollTop + tabs.clientHeight) tabs.scrollTop = bottom - tabs.clientHeight;
  }
  function availableModes() {
    const entry = entries[selected];
    return [['image',wording('实际界面','Screenshots')],
      ...(entry.demo ? [['demo',wording('交互示例','Try a demo')]] : []),
      ...(entry.usage ? [['usage',wording('使用方法','How to use')]] : [])];
  }
  function renderModes() {
    modes.replaceChildren();
    for (const [key,label] of availableModes()) {
      const control = button('recommendation-mode',label,'mode');
      control.dataset.mode = key;control.id = `${id}-mode-${key}`;
      control.setAttribute('role','tab');control.setAttribute('aria-selected',String(mode === key));
      control.setAttribute('aria-controls',visual.id);control.tabIndex = mode === key ? 0 : -1;modes.append(control);
    }
    visual.setAttribute('aria-labelledby',`${id}-mode-${mode}`);
  }
  function createImage(className) {
    const entry = entries[selected];
    const img = node('img',className);
    img.src = entry.images[imageIndex];img.alt = `${entry.title} ${wording('实际界面','screenshot')} ${imageIndex + 1}`;
    img.decoding = 'async';img.draggable = false;
    img.addEventListener('error',() => {
      img.hidden = true;
      img.parentElement?.append(node('span','recommendation-image-error',wording('图片暂时无法显示，可从下方出处查看。','Image unavailable. Open the source link below.')));
    },{once:true,signal:lifecycle.signal});return img;
  }
  function imageControls(target,modalMode = false) {
    const entry = entries[selected];target.replaceChildren();
    if (entry.images.length > 1) {
      const previousImage = button('recommendation-image-arrow','‹','image-previous',wording('上一张截图','Previous screenshot'));
      const nextImage = button('recommendation-image-arrow','›','image-next',wording('下一张截图','Next screenshot'));
      previousImage.disabled = imageIndex === 0;nextImage.disabled = imageIndex === entry.images.length - 1;
      const count = node('span','recommendation-image-count',`${imageIndex + 1} / ${entry.images.length}`);
      count.setAttribute('aria-live','polite');target.append(previousImage,count,nextImage);
    }
    if (!modalMode && entry.images.length) target.append(button('recommendation-enlarge',wording('放大','Enlarge'),'enlarge'));
  }
  function renderVisual() {
    stopDemo();visual.replaceChildren();mediaPaging.replaceChildren();
    visual.dataset.mode = mode;mediaPaging.hidden = mode !== 'image';renderModes();
    const entry = entries[selected];
    if (mode === 'demo') {
      const demoHost = node('div','recommendation-demo-host');visual.append(demoHost);
      if (active && !doc.hidden) disposeDemo = renderRecommendationDemo(demoHost,entry.demo,{language:getLanguage(),title:entry.title});
      return;
    }
    if (mode === 'usage') {
      const instructions = node('div','recommendation-usage');instructions.tabIndex = 0;
      instructions.setAttribute('role','region');instructions.setAttribute('aria-label',wording('使用方法','How to use'));
      instructions.append(node('h4','',wording('使用方法','How to use')));paragraphs(instructions,entry.usage);visual.append(instructions);return;
    }
    imageControls(mediaPaging);
    if (entry.images.length) {
      const open = button('recommendation-image-open','','enlarge',wording(`放大 ${entry.title} 的界面截图`,`Enlarge ${entry.title} screenshot`));
      open.append(createImage('recommendation-image'));visual.append(open);
    } else {
      const missing = node('div','recommendation-image-missing');
      missing.append(node('p','',wording('暂未收录界面截图。','No screenshot added yet.')),
        link('recommendation-source-link',wording('查看项目页面','Open project page'),entry.url));visual.append(missing);
    }
    if (entry.imageSource) visual.append(link('recommendation-image-source',wording('图片出处','Image source'),entry.imageSource));
  }
  function renderRecord() {
    const entry = entries[selected];
    spread.setAttribute('aria-labelledby',`${id}-tab-${selected}`);writing.replaceChildren();footer.replaceChildren();
    const identity = node('div','recommendation-identity');
    const title = node('h3','recommendation-title',entry.title,true);title.id = `${id}-title`;
    const metadata = node('div','recommendation-metadata');
    if (entry.platforms.length) {
      const platforms = node('ul','recommendation-platforms');
      platforms.setAttribute('aria-label',wording('运行平台','Supported platforms'));
      const labels = {windows:'Windows',macos:'macOS',linux:'Linux',web:wording('网页','Web')};
      entry.platforms.forEach(platform => platforms.append(node('li','recommendation-platform',labels[platform],true)));
      metadata.append(platforms);
    }
    metadata.append(node('span','recommendation-repository',entry.repository,true));
    identity.append(title,metadata);writing.append(identity);
    if (entry.summary) { const summary = node('div','recommendation-summary','',true);paragraphs(summary,entry.summary);writing.append(summary); }
    footer.append(link('recommendation-github-link',wording('在 GitHub 查看项目','View project on GitHub'),entry.url));
    if (entries.length > 1) {
      const paging = node('div','recommendation-record-paging');
      const previousEntry = button('recommendation-page-arrow','‹','previous',wording('上一个推荐项目','Previous recommendation'));
      const nextEntry = button('recommendation-page-arrow','›','next',wording('下一个推荐项目','Next recommendation'));
      previousEntry.disabled = selected === 0;nextEntry.disabled = selected === entries.length - 1;
      const pageNumber = node('span','recommendation-page-number',`${selected + 1} / ${entries.length}`);
      pageNumber.setAttribute('aria-live','polite');paging.append(previousEntry,pageNumber,nextEntry);footer.append(paging);
    }
    renderVisual();
  }
  function select(position,focusTarget = 'tab') {
    closeModal(false);selected = Math.max(0,Math.min(position,entries.length - 1));record.selected = entries[selected].id;
    imageIndex = 0;mode = 'image';updateIndex();renderRecord();
    const target = focusTarget === 'tab' ? tabs.querySelector('[aria-selected="true"]')
      : host.querySelector(`[data-recommendation-action="${focusTarget}"]:not(:disabled)`);
    (target || tabs.querySelector('[aria-selected="true"]'))?.focus({preventScroll:true});
  }
  function closeModal(restore = true) {
    if (!modal) return;
    modal.remove();modal = null;collection.inert = false;
    if (restore && modalReturn?.isConnected) modalReturn.focus({preventScroll:true});
    modalReturn = null;
  }
  function renderModal() {
    if (!modal) return;
    modal.querySelector('.recommendation-lightbox-view').replaceChildren(createImage('recommendation-lightbox-image'));
    imageControls(modal.querySelector('.recommendation-lightbox-paging'),true);
  }
  function openModal() {
    if (!entries[selected].images.length) return;
    closeModal(false);modalReturn = doc.activeElement;collection.inert = true;
    modal = node('div','recommendation-lightbox');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby',`${id}-lightbox-title`);
    const header = node('div','recommendation-lightbox-header');
    const title = node('span','',entries[selected].title,true);title.id = `${id}-lightbox-title`;
    header.append(title,button('recommendation-lightbox-close',wording('关闭 ×','Close ×'),'close-image'));
    const viewport = node('div','recommendation-lightbox-view');
    const controls = node('div','recommendation-lightbox-footer');
    if (entries[selected].imageSource) controls.append(link('recommendation-source-link',wording('图片出处','Image source'),entries[selected].imageSource));
    controls.append(node('div','recommendation-lightbox-paging'));modal.append(header,viewport,controls);host.append(modal);renderModal();
    modal.querySelector('button').focus({preventScroll:true});
  }
  function changeImage(offset,action) {
    imageIndex = Math.max(0,Math.min(imageIndex + offset,entries[selected].images.length - 1));
    if (modal) renderModal();else renderVisual();
    const scope = modal || mediaPaging;
    (scope.querySelector(`[data-recommendation-action="${action}"]:not(:disabled)`) || scope.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
  }
  host.addEventListener('click',event => {
    const target = event.target.closest?.('[data-recommendation-action]');
    if (!target || !host.contains(target) || target.disabled) return;
    const action = target.dataset.recommendationAction;
    if (action === 'select') select(Number(target.dataset.recommendation));
    else if (action === 'previous' || action === 'next') select(selected + (action === 'next' ? 1 : -1),action);
    else if (action === 'mode') { mode = target.dataset.mode;renderVisual();modes.querySelector('[aria-selected="true"]')?.focus({preventScroll:true}); }
    else if (action === 'image-previous' || action === 'image-next') changeImage(action === 'image-next' ? 1 : -1,action);
    else if (action === 'enlarge') openModal();
    else if (action === 'close-image') closeModal();
  },{signal:lifecycle.signal});
  host.addEventListener('keydown',event => {
    if (modal) {
      if (event.key === 'Escape') { event.preventDefault();event.stopPropagation();closeModal();return; }
      if (event.key === 'Tab') {
        const focusable = [...modal.querySelectorAll('button:not(:disabled),a[href]')];
        const first = focusable[0],last = focusable.at(-1);
        if (event.shiftKey && doc.activeElement === first) { event.preventDefault();last?.focus(); }
        else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault();first?.focus(); }
      }
      return;
    }
    const tab = event.target.closest?.('[role="tab"]');
    if (!tab || event.altKey || event.ctrlKey || event.metaKey) return;
    if (modes.contains(tab)) {
      const choices = availableModes(),current = choices.findIndex(([key]) => key === mode);
      const next = {ArrowRight:(current + 1) % choices.length,ArrowLeft:(current + choices.length - 1) % choices.length,Home:0,End:choices.length - 1}[event.key];
      if (next !== undefined) { event.preventDefault();event.stopPropagation();mode = choices[next][0];renderVisual();modes.querySelector('[aria-selected="true"]').focus({preventScroll:true}); }
      return;
    }
    if (!tabs.contains(tab)) return;
    const destinations = {ArrowDown:selected + 1,ArrowRight:selected + 1,ArrowUp:selected - 1,ArrowLeft:selected - 1,Home:0,End:entries.length - 1};
    if (destinations[event.key] === undefined) return;
    event.preventDefault();event.stopPropagation();select(destinations[event.key]);
  },{signal:lifecycle.signal});
  view?.addEventListener('sky:scenechange',event => {
    active = event.detail?.scene === 'recommendations';
    if (!active) { stopDemo();closeModal(false); }
    else if (mode === 'demo') renderVisual();
  },{signal:lifecycle.signal});
  view?.addEventListener('sky:languagechange',() => { stopDemo();closeModal(false); },{signal:lifecycle.signal});
  doc.addEventListener('visibilitychange',() => {
    if (doc.hidden) { stopDemo();closeModal(false); }
    else if (active && mode === 'demo') renderVisual();
  },{signal:lifecycle.signal});
  renderIndex();renderRecord();return dispose;
}
