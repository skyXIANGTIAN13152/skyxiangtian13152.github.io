import {getLanguage} from './language.js?v=20261025-35';

const mounted = new WeakMap();
let sequence = 0;
const wording = (zh,en) => getLanguage() === 'en' ? en : zh;
const plain = value => typeof value === 'string' ? value.trim() : '';

export function journeyImageURL(value,base,mediaURL = value => value) {
  if (!plain(value) || /[\u0000-\u001f\\]/.test(value)) return '';
  try {
    const mapped = mediaURL(value.trim());
    if (!plain(mapped) || /[\u0000-\u001f\\]/.test(mapped)) return '';
    const url = new URL(mapped,base);
    return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

/** The owner's order and period wording are authoritative, including ranges. */
export function lifeJourneyEntries(values,base,mediaURL) {
  if (!Array.isArray(values)) return [];
  const result = [];
  for (let index = 0;index < values.length;index++) {
    const entry = values[index];
    if (!entry || entry.visible === false || !plain(entry.title)) continue;
    result.push({id:plain(entry.id) || `journey-${index}`,period:plain(entry.period),title:plain(entry.title),
      location:plain(entry.location),body:plain(entry.body),image:journeyImageURL(entry.image,base,mediaURL)});
    if (result.length === 60) break;
  }
  return result;
}

/** A timeline and a single archive leaf, sized to the horizontal manor scene. */
export function renderLifeJourney(host,values = [],{mediaURL = value => value} = {}) {
  if (!host) return () => {};
  const previousScroll = host.querySelector('.journey-timeline-list')?.scrollTop || 0;
  const previous = mounted.get(host)?.selected;
  mounted.get(host)?.dispose();
  const doc = host.ownerDocument,lifecycle = new (doc.defaultView?.AbortController || AbortController)();
  const entries = lifeJourneyEntries(values,doc.baseURI,mediaURL);
  const id = `life-journey-${++sequence}`;
  let selected = Math.max(0,entries.findIndex(entry => entry.id === previous));
  const state = {selected:entries[selected]?.id,dispose};mounted.set(host,state);
  host.classList.add('life-journey-host');host.replaceChildren();

  function dispose() {
    lifecycle.abort();
    if (mounted.get(host) === state) mounted.delete(host);
  }
  function node(tag,className,text,content = false) {
    const el = doc.createElement(tag);if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    if (content) el.dataset.languageContent = 'true';return el;
  }
  function control(className,text,action,label = text) {
    const el = node('button',className,text);el.type = 'button';el.dataset.journeyAction = action;
    el.setAttribute('aria-label',label);return el;
  }
  if (!entries.length) {
    const empty = node('div','journey-empty');
    const cover = node('div','journey-closed-archive');cover.setAttribute('aria-hidden','true');
    cover.append(node('span','',wording('人生\n足迹','Life\njourney')));
    const page = node('div','journey-empty-page');
    page.append(node('h3','',wording('人生足迹尚未公开','My life journey is not public yet')),
      node('p','',wording('经历与故事，会在这里慢慢记录。','Experiences and stories will be recorded here, one at a time.')));
    empty.append(cover,page);host.append(empty);return dispose;
  }

  const folio = node('div','journey-folio');
  const rail = node('nav','journey-timeline');rail.setAttribute('aria-label',wording('人生足迹目录','Life journey index'));
  const railTitle = node('p','journey-index-heading',wording('人生足迹','Life journey'));
  const list = node('div','journey-timeline-list');list.setAttribute('role','tablist');
  list.setAttribute('aria-orientation','vertical');list.setAttribute('aria-label',wording('选择一段经历','Choose an experience'));
  rail.append(railTitle,list);
  const page = node('section','journey-record');page.id = `${id}-panel`;page.setAttribute('role','tabpanel');
  const sheet = node('div','journey-sheet');
  const footer = node('footer','journey-record-footer');page.append(sheet,footer);folio.append(rail,page);host.append(folio);

  const timelineItems = entries.map((entry,position) => {
    const tab = control('journey-timeline-item','','select',entry.period ? `${entry.period} ${entry.title}` : entry.title);
    tab.id = `${id}-tab-${position}`;tab.dataset.journeyIndex = String(position);tab.dataset.languageContent = 'true';
    tab.setAttribute('role','tab');tab.setAttribute('aria-controls',page.id);
    const marker = node('span','journey-timeline-marker');marker.setAttribute('aria-hidden','true');
    const label = node('span','journey-timeline-label');
    if (entry.period) label.append(node('span','journey-timeline-period',entry.period,true));
    label.append(node('span','journey-timeline-title',entry.title,true));tab.append(marker,label);list.append(tab);return tab;
  });
  function render() {
    const entry = entries[selected];state.selected = entry.id;sheet.replaceChildren();footer.replaceChildren();
    timelineItems.forEach((tab,position) => {
      tab.setAttribute('aria-selected',String(position === selected));tab.tabIndex = position === selected ? 0 : -1;
    });
    page.setAttribute('aria-labelledby',timelineItems[selected].id);sheet.classList.toggle('has-image',Boolean(entry.image));
    const writing = node('div','journey-writing');writing.tabIndex = 0;
    writing.setAttribute('role','region');writing.setAttribute('aria-labelledby',`${id}-title`);
    const heading = node('header','journey-heading');
    if (entry.period) heading.append(node('p','journey-period',entry.period,true));
    const title = node('h3','journey-title',entry.title,true);title.id = `${id}-title`;heading.append(title);
    if (entry.location) heading.append(node('p','journey-location',entry.location,true));
    writing.append(heading);
    if (entry.body) {
      const body = node('div','journey-body','',true);
      entry.body.split(/\n\s*\n/).filter(Boolean).forEach(paragraph => body.append(node('p','',paragraph,true)));
      writing.append(body);
    }
    sheet.append(writing);
    if (entry.image) {
      const photograph = node('figure','journey-photograph');
      const image = node('img','journey-photo');image.src = entry.image;
      image.alt = `${entry.title} · ${wording('照片','Photo')}`;image.loading = 'lazy';image.decoding = 'async';
      image.addEventListener('error',() => {
        image.hidden = true;photograph.classList.add('is-unavailable');
        photograph.append(node('figcaption','journey-photo-error',wording('照片暂时无法显示。','This photograph is currently unavailable.')));
      },{once:true,signal:lifecycle.signal});photograph.append(image);sheet.append(photograph);
    }
    const count = node('span','journey-record-count',`${selected + 1} / ${entries.length}`);count.setAttribute('aria-live','polite');
    if (entries.length > 1) {
      const previousEntry = control('journey-record-arrow',wording('‹ 前一段','‹ Previous'),'previous',wording('前一段经历','Previous experience'));
      const nextEntry = control('journey-record-arrow',wording('后一段 ›','Next ›'),'next',wording('后一段经历','Next experience'));
      previousEntry.disabled = selected === 0;nextEntry.disabled = selected === entries.length - 1;
      footer.append(previousEntry,count,nextEntry);
    } else footer.append(count);
  }
  function select(position,focusAction = 'select') {
    selected = Math.max(0,Math.min(position,entries.length - 1));render();
    const target = focusAction === 'select' ? timelineItems[selected] : footer.querySelector(`[data-journey-action="${focusAction}"]:not(:disabled)`);
    (target || timelineItems[selected]).focus({preventScroll:true});
    const current = timelineItems[selected];
    if (current.offsetTop < list.scrollTop) list.scrollTop = current.offsetTop;
    else if (current.offsetTop + current.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = current.offsetTop + current.offsetHeight - list.clientHeight;
  }
  host.addEventListener('click',event => {
    const target = event.target.closest?.('[data-journey-action]');
    if (!target || !host.contains(target) || target.disabled) return;
    const action = target.dataset.journeyAction;
    if (action === 'select') select(Number(target.dataset.journeyIndex));
    else if (action === 'previous' || action === 'next') select(selected + (action === 'next' ? 1 : -1),action);
  },{signal:lifecycle.signal});
  host.addEventListener('keydown',event => {
    const tab = event.target.closest?.('[role="tab"]');
    if (!tab || !list.contains(tab) || event.altKey || event.ctrlKey || event.metaKey) return;
    const destinations = {ArrowDown:selected + 1,ArrowRight:selected + 1,ArrowUp:selected - 1,ArrowLeft:selected - 1,Home:0,End:entries.length - 1};
    if (destinations[event.key] === undefined) return;
    event.preventDefault();event.stopPropagation();select(destinations[event.key]);
  },{signal:lifecycle.signal});
  render();list.scrollTop = previousScroll;return dispose;
}
