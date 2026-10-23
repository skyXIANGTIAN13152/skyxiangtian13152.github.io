// Pointer Lock is gesture-driven and asynchronous; document.pointerLockElement
// is the source of truth, including when the browser handles Escape itself.
const bindings = new WeakMap();

export function createRoomPointerLook(canvas,{canLook,onLook,onRelease}) {
  if (bindings.has(canvas)) return bindings.get(canvas);
  const doc = canvas.ownerDocument, win = doc.defaultView;
  const listeners = [];
  let drag = null, request = null, wanted = false, wasLocked = false, disposed = false;
  const locked = () => doc.pointerLockElement === canvas;
  const available = () => !disposed && !doc.hidden && canLook();
  const listen = (target,type,listener,options) => {
    target.addEventListener(type,listener,options);
    listeners.push(() => target.removeEventListener(type,listener,options));
  };
  function clearDrag() {
    const id = drag?.id;
    drag = null;
    try { if (id !== undefined && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id); } catch {}
  }
  function exitOwnLock() {
    if (!locked()) return;
    try { doc.exitPointerLock(); } catch {}
  }
  function finishDisposal() {
    // Legacy APIs return no Promise. Keep just these two completion listeners
    // until an outstanding request settles, so a late grant cannot trap a cursor.
    if (!disposed || request) return;
    doc.removeEventListener('pointerlockchange',lockChange);
    doc.removeEventListener('pointerlockerror',lockError);
    if (bindings.get(canvas) === controller) bindings.delete(canvas);
  }
  function release() {
    wanted = false;wasLocked = false;clearDrag();
    onRelease();
    exitOwnLock();
  }
  function lockChange() {
    if (disposed && bindings.has(canvas) && bindings.get(canvas) !== controller) {
      request = null;finishDisposal();return;
    }
    if (locked()) {
      request = null;
      if (!wanted || !available()) {wanted = false;exitOwnLock();finishDisposal();return;}
      clearDrag();wasLocked = true;
    } else if (wasLocked || wanted) {
      request = null;wanted = false;wasLocked = false;clearDrag();onRelease();
    }
    finishDisposal();
  }
  function lockError() {
    request = null;wanted = false;
    // A denied request leaves the ordinary held-button drag usable.
    finishDisposal();
  }
  function requestLock() {
    if (request || locked() || typeof canvas.requestPointerLock !== 'function') return;
    const attempt = {};
    request = attempt;wanted = true;
    try {
      const result = canvas.requestPointerLock();
      // Browsers support both Promise-returning and legacy void APIs.
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).then(() => {
          if (request === attempt) request = null;
          if ((!wanted || !available()) && (!bindings.has(canvas) || bindings.get(canvas) === controller)) exitOwnLock();
          finishDisposal();
        },() => {
          if (request === attempt) {request = null;wanted = false;}
          finishDisposal();
        });
      }
    } catch { if (request === attempt) {request = null;wanted = false;} }
  }
  function pointerDown(event) {
    if (!available() || (event.button !== 0 && event.button !== 2)) return;
    if (event.button === 2) event.preventDefault();
    if (locked()) return;
    clearDrag();
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY};
    try { canvas.setPointerCapture(event.pointerId); } catch {}
    // Use the actual event, so a mouse still works on a touch-capable computer.
    if (event.button === 2 && event.pointerType === 'mouse') requestLock();
  }
  function pointerMove(event) {
    if (locked() || !drag || event.pointerId !== drag.id) return;
    if (!available()) {release();return;}
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    drag.x = event.clientX;drag.y = event.clientY;
    onLook(dx,dy);
  }
  function mouseMove(event) {
    if (!locked() || !wanted) return;
    if (!available()) {release();return;}
    const dx = event.movementX, dy = event.movementY;
    if (Number.isFinite(dx) && Number.isFinite(dy)) onLook(dx,dy);
  }
  function pointerEnd(event) { if (drag?.id === event.pointerId) clearDrag(); }
  function escape(event) {
    if (event.key !== 'Escape' || (!locked() && !wanted)) return;
    // Unlocking takes precedence over the page's fullscreen/archive shortcuts.
    event.preventDefault();event.stopImmediatePropagation();release();
  }
  const controller = {
    get locked(){return locked();},
    release,
    dispose(){
      if (disposed) return;
      disposed = true;release();listeners.splice(0).forEach(remove => remove());
      if (bindings.get(canvas) === controller) bindings.delete(canvas);
      finishDisposal();
    }
  };
  bindings.set(canvas,controller);
  listen(canvas,'pointerdown',pointerDown);
  listen(canvas,'pointermove',pointerMove);
  for (const name of ['pointerup','pointercancel','lostpointercapture']) listen(canvas,name,pointerEnd);
  listen(canvas,'contextmenu',event => event.preventDefault());
  listen(doc,'mousemove',mouseMove);
  listen(win,'keydown',escape,true);
  listen(win,'blur',release);
  listen(doc,'visibilitychange',() => {if(doc.hidden)release();});
  doc.addEventListener('pointerlockchange',lockChange);
  doc.addEventListener('pointerlockerror',lockError);
  return controller;
}
