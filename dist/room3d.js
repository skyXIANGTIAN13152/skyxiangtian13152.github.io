import * as THREE from './vendor/three.module.js';
import {moveCircle, cameraRelativeInput} from './room-movement.js';
import {originalRoomMovement} from './room-collision.js?v=20261023-13';
import {createOriginalLobbyPostprocess} from './room-postprocess.js';
import {createRoomResolution} from './room-resolution.js';
import {createRoomPointerLook} from './room-pointer-look.js?v=20261023-21';

const stage = document.querySelector('.game-stage');
const lobby = document.querySelector('#lobby');
const mount = document.querySelector('.lobby-room');
const loading = document.querySelector('.room-loading');
const touch = document.querySelector('.room-touch-controls');
const stick = document.querySelector('.room-joystick');
const knob = document.querySelector('.room-joystick-knob');
const interact = document.querySelector('.room-interact');
const touchRead = document.querySelector('.room-touch-read');
const directoryButton = document.querySelector('.room-directory-toggle');
const directory = document.querySelector('.room-directory-list');
const anchors = [...document.querySelectorAll('.lobby-hotspot')];
const keys = new Set();
let scene, camera, renderer, postprocess, room, detective, shadow;
let active = false, ready = false, frame = 0, last = 0, elapsed = 0;
let pointerId = null, stickInput = {x:0,z:0}, pointerLook = null, nearest = null;
let yaw = 0, pitch = .42, lastInteraction = '';
let pausedForTransition = false, contextLost = false;
let footstepsMoving = false;
const player = new THREE.Vector3();
const focus = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const projected = new THREE.Vector3();
const cameraPosition = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const rayDirection = new THREE.Vector3();
const color = new THREE.Color();
const resolution = createRoomResolution();
let blockers = [];
const intro = () => document.documentElement.classList.contains('sky-intro-active');
const canMove = () => active && ready && !contextLost && !pausedForTransition && !intro() && !document.hidden && directory.hidden;

function resetInput() {
  if (pointerLook) pointerLook.release(); else clearMovementInput();
}
function clearMovementInput() {
  keys.clear(); stickInput = {x:0,z:0}; pointerId = null;
  knob.style.transform = '';
  stopFootsteps();
}
function stopFootsteps() { footstepsMoving = false; window.SkyAudio?.stopAll('footsteps'); }
function updateTouchVisibility() { touch.hidden = !(active && ready && !intro() && !pausedForTransition); }
function setActive(value) {
  active = value;
  pausedForTransition = false;
  resetInput();
  directory.hidden = true;
  directoryButton.setAttribute('aria-expanded','false');
  updateTouchVisibility();
  if (active && ready) layoutRenderer();
  if (active && ready && !contextLost && !document.hidden) start(); else stop();
}
function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; resolution.reset(); stopFootsteps(); }
function start() { if (!frame) { last = 0; frame = requestAnimationFrame(render); } }
function activateNearest() { if (canMove() && nearest) anchors.find(a => a.dataset.prop === nearest.id)?.click(); }
function layoutRenderer() {
  if (!renderer) return;
  // The cover keeps the room hidden during preload; the stage retains its size.
  const rect = stage.getBoundingClientRect();
  renderer.setPixelRatio(resolution.configure(Math.min(2, Math.max(.55, rect.width / 1280 * devicePixelRatio))));
  renderer.setSize(1280,720,false);
  postprocess?.resize();
}
function updateLabels() {
  nearest = null;
  let nearestDistance = 2.15;
  camera.getWorldPosition(cameraPosition);
  for (const hotspot of room.hotspots) {
    const a = anchors.find(a => a.dataset.prop === hotspot.id);
    if (!a || a.hidden) continue;
    hotspot.label = a.querySelector('.hotspot-title')?.textContent || hotspot.label;
    const distance = Math.hypot(player.x - hotspot.approach.x, player.z - hotspot.approach.z);
    if (distance < nearestDistance) {nearest = hotspot; nearestDistance = distance;}
    projected.copy(hotspot.position).project(camera);
    const x = (projected.x + 1) * 640, y = (1 - projected.y) * 360;
    const visible = projected.z > -1 && projected.z < 1 && x > 90 && x < 1190 && y > 96 && y < 575;
    // Keep labels behind solid furniture/walls out of view. Their interaction points
    // sit just in front of their objects, so the prop itself does not obscure its label.
    let occluded = false;
    if (visible) {
      rayDirection.copy(hotspot.position).sub(cameraPosition);
      const length = rayDirection.length();
      raycaster.set(cameraPosition,rayDirection.normalize());
      raycaster.near = .08;
      raycaster.far = Math.max(0,length - .45);
      occluded = room.move?.raycast
        ? room.move.raycast(raycaster.ray,raycaster.near,raycaster.far) !== false
        : raycaster.intersectObjects(blockers,false).length > 0;
    }
    const near = distance < 2.15;
    // Move the composited label without laying out its text every frame.
    a.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%)`;
    a.classList.toggle('is-occluded',!visible || occluded);
    a.classList.toggle('is-distant',!near);
    a.classList.toggle('is-near',near);
    a.tabIndex = visible && !occluded && near ? 0 : -1;
    a.setAttribute('aria-hidden',String(!visible || occluded || !near));
  }
  const id = nearest ? `${nearest.id}:${nearest.label}` : '';
  if (id !== lastInteraction) {
    lastInteraction = id;
    interact.hidden = !nearest;
    touchRead.disabled = !nearest;
    if (nearest) {
      interact.querySelector('span').textContent = `阅读${nearest.label}`;
      touchRead.querySelector('span').textContent = '阅读';
      touchRead.querySelector('small').textContent = nearest.label;
      interact.setAttribute('aria-label',`按 E 阅读${nearest.label}`);
    } else {
      touchRead.querySelector('span').textContent = '靠近';
      touchRead.querySelector('small').textContent = '房间物件';
    }
  }
}
function render(now) {
  frame = 0;
  if (!active || !ready || document.hidden || contextLost) return;
  const nextRatio = last && !pausedForTransition && !intro() ? resolution.sample(now - last) : null;
  if (nextRatio !== null) {
    renderer.setPixelRatio(nextRatio);
    postprocess.resize();
  }
  const dt = last ? Math.min((now - last) / 1000,.05) : 0;
  last = now; elapsed += dt;
  let input = {x:0,z:0};
  if (canMove()) {
    input = cameraRelativeInput(
      Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + stickInput.x,
      Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + stickInput.z,
      yaw
    );
    if (keys.has('KeyQ')) yaw += dt * 1.25;
    if (keys.has('KeyR')) yaw -= dt * 1.25;
  }
  const dx = input.x * dt * 1.1, dz = input.z * dt * 1.1;
  if (dx || dz) {
    const next = room.move ? room.move(player,dx,dz,.24) : moveCircle(player,dx,dz,room.colliders,room.bounds,.24);
    player.set(next.x,room.floorHeight?.(next.x,next.z) ?? room.spawn.y ?? 0,next.z);
  }
  // Collision constrains world position; held movement input keeps the original
  // walk cycle and footstep cadence, even while pushing against a wall.
  const speed = Math.hypot(input.x,input.z) * 1.1;
  detective.group.position.copy(player);
  if (speed > .03) {
    const angle = Math.atan2(input.x,input.z);
    const diff = Math.atan2(Math.sin(angle - detective.group.rotation.y),Math.cos(angle - detective.group.rotation.y));
    detective.group.rotation.y += diff * Math.min(1,dt * 10);
  }
  const walking = canMove() && speed > .025;
  if (footstepsMoving && !walking) stopFootsteps();
  footstepsMoving = walking;
  // Releasing input or disabling movement starts the existing 240 ms idle fade.
  detective.update(elapsed,speed,walking);
  room.update?.(elapsed);
  shadow.position.set(player.x,player.y + .018,player.z);
  focus.set(player.x,player.y + 1.35,player.z - .15);
  desiredCamera.set(
    player.x + Math.sin(yaw) * 5.8,
    player.y + 1.35 + Math.sin(pitch) * 5.8,
    player.z + Math.cos(yaw) * 5.8
  );
  const b = room.bounds;
  desiredCamera.x = THREE.MathUtils.clamp(desiredCamera.x,b.minX + .42,b.maxX - .42);
  desiredCamera.z = THREE.MathUtils.clamp(desiredCamera.z,b.minZ + .42,b.maxZ - .42);
  rayDirection.copy(desiredCamera).sub(focus);
  const cameraDistance = rayDirection.length();
  raycaster.set(focus,rayDirection.normalize());
  raycaster.near = .08;
  raycaster.far = cameraDistance;
  const cameraDistanceHit = room.move?.raycast
    ? room.move.raycast(raycaster.ray,raycaster.near,raycaster.far)
    : (raycaster.intersectObjects(blockers,false)[0]?.distance ?? false);
  if (cameraDistanceHit !== false) desiredCamera.copy(focus).addScaledVector(rayDirection,Math.max(.65,cameraDistanceHit - .18));
  camera.position.lerp(desiredCamera,1 - Math.exp(-dt * 6));
  camera.lookAt(focus);
  // The detective owns the light at the original flame socket. A second
  // co-located light doubled the under-lighting across the nose and eye sockets.
  detective.lanternLight.intensity = .3 + Math.sin(elapsed * 8.1) * .008 + Math.sin(elapsed * 12.3) * .004;
  postprocess.render(scene,camera);
  updateLabels();
  frame = requestAnimationFrame(render);
}
function makeContactShadow() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d'), gradient = c.createRadialGradient(128,128,0,128,128,128);
  gradient.addColorStop(0,'rgba(0,0,0,.6)');gradient.addColorStop(.35,'rgba(0,0,0,.3)');gradient.addColorStop(1,'transparent');
  c.fillStyle = gradient; c.fillRect(0,0,256,256);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.35,1.35),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,opacity:.8}));
  mesh.rotation.x = -Math.PI / 2; return mesh;
}
async function initialize() {
  try {
    const [{createRoom},{createDetective}] = await Promise.all([import('./room-environment.js?v=20261024-27'),import('./room-detective.js?v=20261023-19')]);
    scene = new THREE.Scene(); scene.background = new THREE.Color('#11181d');
    scene.fog = new THREE.FogExp2('#10151b',.007);
    camera = new THREE.PerspectiveCamera(45,1280/720,.05,80);
    renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement; canvas.className = 'room-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label','旧侦探大厅，WASD 或方向键行走，拖动观察房间，靠近物件按 E 阅读');
    canvas.setAttribute('role','img');
    mount.prepend(canvas);
    room = await createRoom(); scene.add(room.group);
    room.bounds = {minX:-6.5,maxX:6.5,minZ:-5.2,maxZ:5.2,...room.bounds};
    if (room.collisionMeshes?.length) room.move = originalRoomMovement(room.collisionMeshes,room.bounds,room.spawn.y || 0,room.floorHeight);
    detective = await createDetective({ onFootstep: () => window.SkyAudio?.playFootstep?.() }); scene.add(detective.group);
    player.set(room.spawn.x,room.spawn.y || 0,room.spawn.z);
    yaw = room.cameraYaw ?? Math.atan2(room.cameraPosition.x-room.cameraTarget.x,room.cameraPosition.z-room.cameraTarget.z);
    pitch = room.cameraPitch ?? .32;
    detective.group.position.copy(player); detective.group.rotation.y = yaw + Math.PI;
    scene.add(new THREE.HemisphereLight('#abb6c8','#323027',1.05));
    const moon = new THREE.DirectionalLight('#c1d4ee',.7); moon.position.set(-5,7,3); scene.add(moon);
    const fill = new THREE.DirectionalLight('#d9bda0',.38); fill.position.set(4,3,-2); scene.add(fill);
    shadow = makeContactShadow();scene.add(shadow);
    blockers = room.blockers || [];
    layoutRenderer();
    postprocess = await createOriginalLobbyPostprocess(renderer);
    camera.position.set(
      THREE.MathUtils.clamp(player.x + Math.sin(yaw) * 5.8,room.bounds.minX + .42,room.bounds.maxX - .42),
      player.y + 1.35 + Math.sin(pitch) * 5.8,
      THREE.MathUtils.clamp(player.z + Math.cos(yaw) * 5.8,room.bounds.minZ + .42,room.bounds.maxZ - .42)
    );camera.lookAt(player.x,player.y + 1.35,player.z - .15);
    detective.update(0,0);postprocess.render(scene,camera);
    ready = true;lobby.classList.add('room-ready');
    bindCanvas(canvas);setActive(stage.dataset.scene === 'lobby');
    canvas.addEventListener('webglcontextlost',event => {event.preventDefault();contextLost = true;stop();resetInput();lobby.classList.remove('room-ready');loading.textContent = '画面已暂停，正在恢复大厅…';restoreFallback();});
    canvas.addEventListener('webglcontextrestored',() => {contextLost = false;lobby.classList.add('room-ready');updateTouchVisibility();if(active)start();});
  } catch(error) {
    console.error('[SkyRoom]',error);
    loading.textContent = '此浏览器暂不支持三维大厅，可直接点击入口阅读。';
    restoreFallback();
  }
}
function restoreFallback() {
  touch.hidden = true;
  anchors.forEach(a => {a.classList.remove('is-occluded','is-distant','is-near');a.removeAttribute('style');a.removeAttribute('aria-hidden');a.removeAttribute('tabindex');});
}
function bindCanvas(canvas) {
  pointerLook = createRoomPointerLook(canvas,{
    canLook:canMove,
    onRelease:clearMovementInput,
    onLook(dx,dy) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      yaw -= dx / rect.width * 3.3;
      pitch = THREE.MathUtils.clamp(pitch + dy / rect.height * 1.1,.15,.64);
    }
  });
}
const movementCodes = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyR'];
document.addEventListener('keydown',e => {
  if (!canMove() || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
  if (movementCodes.includes(e.code)) {e.preventDefault();keys.add(e.code);}
  if (e.code === 'KeyE' && !e.repeat) {e.preventDefault();activateNearest();}
});
document.addEventListener('keyup',e => keys.delete(e.code));
window.addEventListener('blur',resetInput);
let resizeFrame = 0;
window.addEventListener('resize',() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(layoutRenderer);
},{passive:true});
document.addEventListener('visibilitychange',() => {resetInput();if(document.hidden)stop();else if(active && ready)start();});
window.addEventListener('sky:scenechange',e => setActive(e.detail.scene === 'lobby'));
window.addEventListener('sky:transitionstart',() => {pausedForTransition=true;resetInput();updateTouchVisibility();});
document.addEventListener('sky:intro-complete',() => {pausedForTransition=false;updateTouchVisibility();});
new MutationObserver(updateTouchVisibility).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
directoryButton.addEventListener('click',() => {
  directory.hidden = !directory.hidden;directoryButton.setAttribute('aria-expanded',String(!directory.hidden));resetInput();
  if (!directory.hidden) directory.querySelector('a:not([hidden])')?.focus();
});
document.addEventListener('keydown',e => {if(e.key === 'Escape' && !directory.hidden){directory.hidden=true;directoryButton.setAttribute('aria-expanded','false');directoryButton.focus();}});
document.querySelector('.room-reset').addEventListener('click',() => {
  if(!ready)return;resetInput();player.set(room.spawn.x,room.spawn.y || 0,room.spawn.z);yaw=room.cameraYaw ?? Math.atan2(room.cameraPosition.x-room.cameraTarget.x,room.cameraPosition.z-room.cameraTarget.z);pitch=room.cameraPitch ?? .32;detective.group.rotation.y=yaw+Math.PI;
});
interact.addEventListener('click',activateNearest);touchRead.addEventListener('click',activateNearest);
function stickMove(e) {
  const rect = stick.getBoundingClientRect();
  let x=e.clientX-rect.left-rect.width/2,z=e.clientY-rect.top-rect.height/2;
  const length=Math.hypot(x,z),limit=rect.width*.32;
  if(length>limit){x=x/length*limit;z=z/length*limit;}
  stickInput = length<4 ? {x:0,z:0} : {x:x/limit,z:z/limit};knob.style.transform=`translate(${x}px,${z}px)`;
}
stick.addEventListener('pointerdown',e => {if(!canMove() || pointerId!==null)return;e.preventDefault();pointerId=e.pointerId;stick.setPointerCapture(e.pointerId);stickMove(e);});
stick.addEventListener('pointermove',e => {if(pointerId===e.pointerId && canMove())stickMove(e);});
function stickEnd(e){if(pointerId===e.pointerId){pointerId=null;stickInput={x:0,z:0};knob.style.transform='';}}
stick.addEventListener('pointerup',stickEnd);stick.addEventListener('pointercancel',stickEnd);stick.addEventListener('lostpointercapture',stickEnd);
window.SkyRoom = {get ready(){return ready;},setActive,resetInput,whenReady:null};
// Prepare while the cover is visible; entry should never land on an empty canvas.
window.SkyRoom.whenReady = initialize();
