// Keep static DOM lookups and unchanged accessibility writes out of the frame loop.
// Observe title edits so language changes and owner-published labels stay live.
export function createRoomLabelState(anchor, fallbackLabel, Observer = globalThis.MutationObserver) {
  let label = fallbackLabel, previous = {};
  const refresh = () => { label = anchor.querySelector('.hotspot-title')?.textContent || fallbackLabel; };
  refresh();
  const observer = Observer ? new Observer(refresh) : null;
  observer?.observe(anchor, { childList: true, characterData: true, subtree: true });
  return {
    anchor,
    get label() { return label; },
    update(x, y, visible, occluded, near) {
      const transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%)`;
      const hidden = !visible || occluded;
      const accessible = visible && !occluded && near;
      if (previous.transform !== transform) anchor.style.transform = transform;
      if (previous.hidden !== hidden) anchor.classList.toggle('is-occluded', hidden);
      if (previous.near !== near) {
        anchor.classList.toggle('is-distant', !near);
        anchor.classList.toggle('is-near', near);
      }
      if (previous.accessible !== accessible) {
        anchor.tabIndex = accessible ? 0 : -1;
        anchor.setAttribute('aria-hidden', String(!accessible));
      }
      previous.transform = transform;
      previous.hidden = hidden;
      previous.near = near;
      previous.accessible = accessible;
    },
    invalidate() { previous = {}; refresh(); },
    dispose() { observer?.disconnect(); },
  };
}
