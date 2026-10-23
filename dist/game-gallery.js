import {getLanguage} from './language.js?v=20261023-20';

const collections = new WeakMap();
const PAGE_SIZE = 4;
let sequence = 0;
const wording = (zh,en) => getLanguage() === 'en' ? en : zh;
const textValue = value => typeof value === 'string' ? value : '';

export function gameImageURL(value,base,mediaURL = value => value) {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\\]/.test(value)) return '';
  try {
    const mapped = mediaURL(value.trim());
    if (typeof mapped !== 'string' || !mapped.trim() || /[\u0000-\u001f\\]/.test(mapped)) return '';
    const url = new URL(mapped,base);
    return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function gameLinkURL(value) {
  if (typeof value !== 'string' || /[\u0000-\u001f\\]/.test(value)) return '';
  try {
    const url = new URL(value);
    return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function gameGalleryEntries(games,base,mediaURL) {
  return (Array.isArray(games) ? games : []).filter(game => game && game.visible !== false && textValue(game.title).trim())
    .map(game => ({id:textValue(game.id),title:game.title,body:textValue(game.body),
      favoriteCharacter:textValue(game.favoriteCharacter),image:gameImageURL(game.image,base,mediaURL),url:gameLinkURL(game.url)}));
}

/** A bounded archive spread for the manor's 1108 × 440 scene host. */
export function renderGameGallery(host,games = [],{mediaURL = value => value} = {}) {
  if (!host) return () => {};
  const previous = collections.get(host)?.selected;
  collections.get(host)?.dispose();
  const doc = host.ownerDocument;
  const lifecycle = new (doc.defaultView?.AbortController || AbortController)();
  const id = `game-collection-${++sequence}`;
  const entries = gameGalleryEntries(games,doc.baseURI,mediaURL);
  let selected = Math.max(0,entries.findIndex(game => game.id === previous));
  const record = {selected:entries[selected]?.id,dispose};
  collections.set(host,record);
  host.classList.add('game-gallery-host');host.replaceChildren();

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
    element.type = 'button';element.dataset.gameAction = action;element.setAttribute('aria-label',label);
    return element;
  }
  if (!entries.length) {
    const empty = node('div','game-collection-empty');
    const book = node('div','game-closed-book');book.setAttribute('aria-hidden','true');
    book.append(node('span','',wording('游戏收藏','Game collection')));
    empty.append(book,node('p','',wording('游戏收藏册尚未展开','The game collection is waiting to open')));
    host.append(empty);return dispose;
  }

  const collection = node('div','game-collection');
  const shelf = node('nav','game-shelf');shelf.setAttribute('aria-label',wording('游戏目录','Game index'));
  const heading = node('p','game-shelf-heading',wording('游戏收藏','Game collection'));
  const tabs = node('div','game-shelf-list');tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label',wording('选择游戏','Choose a game'));tabs.setAttribute('aria-orientation','vertical');
  const shelfPaging = node('div','game-shelf-paging');
  shelf.append(heading,tabs,shelfPaging);
  const spread = node('section','game-record');spread.id = `${id}-panel`;spread.setAttribute('role','tabpanel');
  collection.append(shelf,spread);host.append(collection);

  function renderIndex() {
    tabs.replaceChildren();shelfPaging.replaceChildren();
    const page = Math.floor(selected / PAGE_SIZE);
    entries.slice(page * PAGE_SIZE,(page + 1) * PAGE_SIZE).forEach((game,offset) => {
      const position = page * PAGE_SIZE + offset;
      const tab = button('game-shelf-item','','select',game.title);
      tab.id = `${id}-tab-${position}`;tab.dataset.game = String(position);tab.dataset.languageContent = 'true';
      tab.setAttribute('role','tab');tab.setAttribute('aria-controls',spread.id);
      tab.setAttribute('aria-selected',String(position === selected));tab.tabIndex = position === selected ? 0 : -1;
      const spine = node('span','game-shelf-spine');spine.setAttribute('aria-hidden','true');
      tab.append(spine,node('span','game-shelf-title',game.title,true));tabs.append(tab);
    });
    shelfPaging.hidden = entries.length <= PAGE_SIZE;
    if (shelfPaging.hidden) return;
    const previous = button('game-page-arrow','‹','index-previous',wording('上一页游戏','Previous index page'));
    const next = button('game-page-arrow','›','index-next',wording('下一页游戏','Next index page'));
    previous.disabled = page === 0;next.disabled = (page + 1) * PAGE_SIZE >= entries.length;
    const pageNumber = node('span','game-index-number',`${page + 1} / ${Math.ceil(entries.length / PAGE_SIZE)}`);
    pageNumber.setAttribute('aria-live','polite');shelfPaging.append(previous,pageNumber,next);
  }
  function renderRecord() {
    const game = entries[selected];
    spread.setAttribute('aria-labelledby',`${id}-tab-${selected}`);spread.replaceChildren();
    const plate = node('div','game-cover-plate');
    const fallback = node('div','game-cover-lettering');fallback.setAttribute('aria-hidden','true');
    fallback.append(node('span','game-cover-title',game.title,true));
    const error = node('span','game-cover-error',wording('封面暂时无法显示','Cover currently unavailable'));error.hidden = true;
    fallback.append(error);plate.append(fallback);
    if (game.image) {
      const image = node('img','game-cover-image');image.src = game.image;image.alt = game.title;
      image.loading = 'lazy';image.decoding = 'async';image.referrerPolicy = 'no-referrer';image.dataset.languageContent = 'true';
      fallback.hidden = true;plate.append(image);
    }
    const page = node('div','game-journal-page');
    const writing = node('div',`game-writing${!game.body && !game.favoriteCharacter ? ' is-minimal' : ''}`);
    writing.tabIndex = 0;writing.setAttribute('role','region');writing.setAttribute('aria-labelledby',`${id}-title`);
    const title = node('h3','game-title',game.title,true);title.id = `${id}-title`;writing.append(title);
    if (game.body) {
      const body = node('div','game-description','',true);
      game.body.split(/\n\s*\n/).filter(Boolean).forEach(paragraph => body.append(node('p','',paragraph)));
      writing.append(body);
    }
    if (game.favoriteCharacter) {
      const favorite = node('dl','game-favourite');
      favorite.append(node('dt','',wording('喜欢的角色','Favourite character')),node('dd','',game.favoriteCharacter,true));
      writing.append(favorite);
    }
    const footer = node('footer','game-record-footer');
    if (game.url) {
      const link = node('a','game-site-link',wording('打开游戏链接','Open game link'));
      link.href = game.url;link.target = '_blank';link.rel = 'noopener noreferrer';footer.append(link);
    }
    if (entries.length > 1) {
      const paging = node('div','game-record-paging');
      const previous = button('game-page-arrow','‹','previous',wording('上一个游戏','Previous game'));
      const next = button('game-page-arrow','›','next',wording('下一个游戏','Next game'));
      previous.disabled = selected === 0;next.disabled = selected === entries.length - 1;
      const pageNumber = node('span','game-record-number',`${selected + 1} / ${entries.length}`);
      pageNumber.setAttribute('aria-live','polite');paging.append(previous,pageNumber,next);footer.append(paging);
    }
    footer.hidden = !footer.childElementCount;
    page.append(writing,footer);spread.append(plate,page);
  }
  function select(position,focusTarget = 'tab') {
    selected = Math.max(0,Math.min(position,entries.length - 1));record.selected = entries[selected].id;
    renderIndex();renderRecord();
    const target = focusTarget === 'tab' ? tabs.querySelector('[aria-selected="true"]')
      : host.querySelector(`[data-game-action="${focusTarget}"]:not(:disabled)`);
    (target || tabs.querySelector('[aria-selected="true"]'))?.focus({preventScroll:true});
  }
  host.addEventListener('click',event => {
    const target = event.target.closest?.('[data-game-action]');
    if (!target || !host.contains(target) || target.disabled) return;
    const action = target.dataset.gameAction;
    if (action === 'select') select(Number(target.dataset.game));
    else if (action === 'previous' || action === 'next') select(selected + (action === 'next' ? 1 : -1),action);
    else if (action === 'index-previous' || action === 'index-next') {
      const nextPage = Math.floor(selected / PAGE_SIZE) + (action === 'index-next' ? 1 : -1);
      select(nextPage * PAGE_SIZE,action);
    }
  },{signal:lifecycle.signal});
  host.addEventListener('keydown',event => {
    const tab = event.target.closest?.('[role="tab"]');
    if (!tab || !tabs.contains(tab) || event.altKey || event.ctrlKey || event.metaKey) return;
    const destinations = {ArrowDown:selected + 1,ArrowRight:selected + 1,ArrowUp:selected - 1,ArrowLeft:selected - 1,Home:0,End:entries.length - 1};
    if (destinations[event.key] === undefined) return;
    event.preventDefault();event.stopPropagation();select(destinations[event.key]);
  },{signal:lifecycle.signal});
  host.addEventListener('error',event => {
    if (!event.target.classList?.contains('game-cover-image')) return;
    event.target.hidden = true;
    const plate = event.target.parentElement;
    plate.querySelector('.game-cover-lettering').hidden = false;plate.querySelector('.game-cover-error').hidden = false;
  },{capture:true,signal:lifecycle.signal});
  renderIndex();renderRecord();return dispose;
}
