const galleries = new WeakMap();
let gallerySequence = 0;

// Accept image locations, never executable URLs or credential-bearing URLs.
export function petPhotoURL(value, base, mediaURL = value => value) {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\\]/.test(value)) return '';
  try {
    const mapped = mediaURL(value.trim());
    if (typeof mapped !== 'string' || /[\u0000-\u001f\\]/.test(mapped)) return '';
    const url = new URL(mapped, base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}

/** Render into a 1108 × 440 scene host. Repeated renders dispose prior listeners. */
export function renderPetGallery(host, pets = [], { mediaURL = value => value } = {}) {
  if (!host) return () => {};
  const previous = galleries.get(host);
  const previousPet = previous?.selected;
  const previousScroll = host.querySelector('.pet-index-list')?.scrollTop ?? previous?.scrollTop ?? 0;
  previous?.dispose();
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  const lifecycle = new (win?.AbortController || AbortController)();
  const prefix = `pet-album-${++gallerySequence}`;
  const node = (tag, className, text) => {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const button = (className, text, action, label = text) => {
    const element = node('button', className, text);
    element.type = 'button'; element.dataset.petAction = action;
    element.setAttribute('aria-label', label);
    return element;
  };
  const entries = (Array.isArray(pets) ? pets : []).filter(pet => pet && pet.visible !== false)
    .map(pet => ({ id: String(pet.id || ''), name: String(pet.name || ''),
      description: String(pet.description || ''), photos: (Array.isArray(pet.photos) ? pet.photos : [])
        .slice(0, 12).map(value => petPhotoURL(value, doc.baseURI, mediaURL)).filter(Boolean) }));
  host.classList.add('pet-gallery-host');
  host.replaceChildren();
  let activePet = Math.max(0, entries.findIndex(pet => pet.id === previousPet)), activePhoto = 0, open = false, previousFocus;
  let album, index, indexList, introduction, photoArea, modal, modalImage, modalCount, modalPrevious, modalNext, opener;
  const record = { selected: entries[activePet]?.id, scrollTop: previousScroll, dispose };

  function closeViewer(restoreFocus = true) {
    if (!open) return;
    open = false; modal.hidden = true; album.inert = false;
    host.classList.remove('pet-viewer-open');
    if (restoreFocus) (previousFocus?.isConnected ? previousFocus : opener)?.focus({ preventScroll: true });
  }
  function dispose() {
    if (indexList) record.scrollTop = indexList.scrollTop;
    closeViewer(false); lifecycle.abort();
    if (galleries.get(host) === record) galleries.delete(host);
  }
  galleries.set(host, record);

  if (!entries.length) {
    const empty = node('div', 'pet-album-empty');
    const closed = node('div', 'pet-closed-album'); closed.setAttribute('aria-hidden', 'true');
    closed.append(node('i'), node('span', '', '相册'));
    const writing = node('div', 'pet-empty-writing');
    writing.append(node('h3', '', '宠物相册尚未展开'), node('p', '', '这里将收录它们的介绍与照片。'));
    empty.append(closed, writing); host.append(empty);
    return dispose;
  }

  album = node('div', 'pet-album');
  index = node('nav', 'pet-index'); index.setAttribute('aria-label', '选择宠物相册');
  introduction = node('article', 'pet-introduction');
  photoArea = node('section', 'pet-photographs'); photoArea.setAttribute('aria-label', '宠物照片合集');
  album.append(index, introduction, photoArea);
  modal = node('div', 'pet-photo-viewer'); modal.hidden = true;
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', `${prefix}-viewer-title`); modal.tabIndex = -1;
  const modalHeader = node('header', 'pet-viewer-header');
  const modalTitle = node('h3', '', '相册大图'); modalTitle.id = `${prefix}-viewer-title`;
  modalHeader.append(modalTitle, button('pet-viewer-close', '×', 'close', '关闭照片大图'));
  modalImage = node('div', 'pet-viewer-image');
  const modalFooter = node('footer', 'pet-viewer-footer');
  modalPrevious = button('pet-arrow', '‹', 'previous', '上一张照片');
  modalNext = button('pet-arrow', '›', 'next', '下一张照片');
  modalCount = node('p', 'pet-viewer-count'); modalCount.setAttribute('aria-live', 'polite');
  modalFooter.append(modalPrevious, modalCount, modalNext);
  modal.append(modalHeader, modalImage, modalFooter); host.append(album, modal);

  function imageFrame(url, alt, className) {
    const frame = node('span', `pet-image-frame ${className}`);
    const image = node('img'); image.alt = alt; image.loading = 'lazy'; image.decoding = 'async';
    image.dataset.languageContent = 'true';
    image.referrerPolicy = 'no-referrer'; image.src = url;
    const fallback = node('span', 'pet-image-error', '这张照片暂时无法显示'); fallback.hidden = true;
    frame.append(image, fallback); return frame;
  }
  function renderIndex() {
    indexList = node('div', 'pet-index-list');
    entries.forEach((pet, position) => {
      const item = button('pet-index-item', pet.name, 'pet', `打开${pet.name}的相册`);
      item.dataset.languageContent = 'true';
      item.dataset.pet = String(position); item.setAttribute('aria-pressed', String(position === activePet));
      item.tabIndex = position === activePet ? 0 : -1;
      indexList.append(item);
    });
    index.replaceChildren(node('p', 'pet-index-heading', '相册目录'), indexList);
    indexList.scrollTop = previousScroll;
    record.scrollTop = indexList.scrollTop;
    indexList.addEventListener('scroll', () => { record.scrollTop = indexList.scrollTop; }, { passive: true, signal: lifecycle.signal });
  }
  function updateIndex() {
    [...indexList.children].forEach((item, position) => {
      item.setAttribute('aria-pressed', String(position === activePet));
      item.tabIndex = position === activePet ? 0 : -1;
    });
    const item = indexList.children[activePet];
    // Only scroll this list, using its unscaled layout coordinates.
    const top = item.offsetTop, bottom = top + item.offsetHeight;
    if (top < indexList.scrollTop) indexList.scrollTop = top;
    else if (bottom > indexList.scrollTop + indexList.clientHeight) indexList.scrollTop = bottom - indexList.clientHeight;
    record.scrollTop = indexList.scrollTop;
  }
  function selectPet(position) {
    activePet = Math.max(0, Math.min(position, entries.length - 1)); activePhoto = 0;
    record.selected = entries[activePet].id;
    updateIndex(); renderIntroduction(); renderPhotos();
    indexList.children[activePet]?.focus({ preventScroll: true });
  }
  function renderIntroduction() {
    const pet = entries[activePet];
    const title = node('h3', 'pet-name', pet.name); title.id = `${prefix}-name`;
    title.dataset.languageContent = 'true';
    const description = node('div', 'pet-description');
    description.dataset.languageContent = 'true';
    description.tabIndex = 0; description.setAttribute('aria-label', `${pet.name}的介绍`);
    pet.description.split(/\n\s*\n/).filter(Boolean).forEach(part => description.append(node('p', '', part)));
    introduction.setAttribute('aria-labelledby', title.id);
    introduction.replaceChildren(title, node('span', 'pet-intro-rule'), description);
  }
  function renderViewer() {
    const pet = entries[activePet];
    modalTitle.textContent = pet.name;
    modalTitle.dataset.languageContent = 'true';
    modalImage.replaceChildren(imageFrame(pet.photos[activePhoto], `${pet.name}，第${activePhoto + 1}张照片`, 'pet-full-image'));
    modalCount.textContent = `${activePhoto + 1} / ${pet.photos.length}`;
    modalPrevious.disabled = activePhoto === 0; modalNext.disabled = activePhoto === pet.photos.length - 1;
  }
  function renderPhotos() {
    const pet = entries[activePet];
    photoArea.replaceChildren();
    if (!pet.photos.length) {
      photoArea.append(node('p', 'pet-photos-empty', '照片尚未加入相册')); return;
    }
    opener = button('pet-main-photo', '', 'open', `放大${pet.name}的第${activePhoto + 1}张照片`);
    opener.append(imageFrame(pet.photos[activePhoto], `${pet.name}，第${activePhoto + 1}张照片`, 'pet-main-image'), node('span', 'pet-enlarge-hint', '查看大图'));
    const controls = node('div', 'pet-photo-controls');
    const previous = button('pet-arrow', '‹', 'previous', '上一张照片');
    const next = button('pet-arrow', '›', 'next', '下一张照片');
    previous.disabled = activePhoto === 0; next.disabled = activePhoto === pet.photos.length - 1;
    const thumbs = node('div', 'pet-thumbnails'); thumbs.setAttribute('aria-label', '选择照片');
    const start = Math.floor(activePhoto / 6) * 6;
    pet.photos.slice(start, start + 6).forEach((url, offset) => {
      const position = start + offset;
      const thumb = button('pet-thumbnail', '', 'photo', `第${position + 1}张照片`);
      thumb.dataset.photo = String(position); thumb.setAttribute('aria-pressed', String(position === activePhoto));
      thumb.append(imageFrame(url, '', 'pet-thumb-image')); thumbs.append(thumb);
    });
    controls.append(previous, thumbs, next);
    const caption = node('p', 'pet-photo-caption', `${activePhoto + 1} / ${pet.photos.length}`);
    caption.setAttribute('aria-live', 'polite'); photoArea.append(opener, controls, caption);
    const selectedThumb = thumbs.querySelector('[aria-pressed="true"]');
    if (selectedThumb && selectedThumb.offsetLeft + selectedThumb.offsetWidth > thumbs.clientWidth) {
      thumbs.scrollLeft = selectedThumb.offsetLeft + selectedThumb.offsetWidth - thumbs.clientWidth;
    }
  }
  function selectPhoto(position) {
    const pet = entries[activePet];
    activePhoto = Math.max(0, Math.min(position, pet.photos.length - 1));
    renderPhotos(); if (open) renderViewer();
  }
  function showViewer() {
    if (!entries[activePet].photos.length) return;
    previousFocus = opener; open = true; modal.hidden = false; album.inert = true;
    host.classList.add('pet-viewer-open'); renderViewer();
    modal.querySelector('.pet-viewer-close').focus({ preventScroll: true });
  }
  host.addEventListener('click', event => {
    const target = event.target.closest?.('[data-pet-action]');
    if (!target || !host.contains(target) || target.disabled) return;
    const action = target.dataset.petAction;
    if (action === 'open') showViewer();
    else if (action === 'close') closeViewer();
    else if (action === 'previous' || action === 'next') {
      selectPhoto(activePhoto + (action === 'next' ? 1 : -1));
      if (!open) photoArea.querySelector(`[data-pet-action="${action}"]`)?.focus({ preventScroll: true });
    } else if (action === 'photo') {
      selectPhoto(Number(target.dataset.photo));
      photoArea.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
    } else if (action === 'pet') {
      selectPet(Number(target.dataset.pet));
    }
  }, { signal: lifecycle.signal });
  host.addEventListener('keydown', event => {
    const item = event.target.closest?.('.pet-index-item');
    if (open || !item || !indexList.contains(item) || event.altKey || event.ctrlKey || event.metaKey) return;
    const destinations = { ArrowDown: activePet + 1, ArrowUp: activePet - 1, Home: 0, End: entries.length - 1 };
    if (destinations[event.key] === undefined) return;
    event.preventDefault(); event.stopPropagation(); selectPet(destinations[event.key]);
  }, { signal: lifecycle.signal });
  host.addEventListener('error', event => {
    if (event.target.tagName !== 'IMG') return;
    event.target.hidden = true;
    const fallback = event.target.parentElement.querySelector('.pet-image-error');
    if (fallback) fallback.hidden = false;
  }, { capture: true, signal: lifecycle.signal });
  doc.addEventListener('keydown', event => {
    if (!open) return;
    if (['Escape', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.key === 'Escape') closeViewer();
      else if (event.key === 'ArrowLeft') selectPhoto(activePhoto - 1);
      else if (event.key === 'ArrowRight') selectPhoto(activePhoto + 1);
      else {
        const focusable = [...modal.querySelectorAll('button:not(:disabled)')];
        const position = focusable.indexOf(doc.activeElement);
        focusable[(position + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length]?.focus();
      }
    }
  }, { capture: true, signal: lifecycle.signal });
  win?.addEventListener('sky:scenechange', () => closeViewer(false), { signal: lifecycle.signal });
  renderIndex(); renderIntroduction(); renderPhotos();
  return dispose;
}
