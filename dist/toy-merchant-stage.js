import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Only the screen-space flight path is authored here. Every joint key, character,
// wing, springboard and diffuse map is converted original Identity V game data.
export async function createToyMerchantStage(mount) {
  const loader = new GLTFLoader();
  const names = ['annie', 'plane', 'tiaoban'];
  const loaded = await Promise.all(names.map(name => loader.loadAsync(
    new URL(`./assets/toy-merchant/original/${name}.glb`, import.meta.url).href)));
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (error) { disposeModels(); throw error; }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(1280, 720);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'merchant-action-canvas';
  mount.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-640, 640, 360, -360, 1, 3000);
  camera.position.set(0, 0, 1100);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xd9e2ed, 0x4c3a31, 2.1));
  const key = new THREE.DirectionalLight(0xffebcf, 2.1);
  key.position.set(-150, 300, 500); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9eaecb, .9);
  rim.position.set(180, 50, -300); scene.add(rim);
  const rig = new THREE.Group(); scene.add(rig);
  const models = Object.fromEntries(loaded.map((gltf, i) => {
    const model = gltf.scene;
    model.traverse(object => {
      if (!object.isMesh) return;
      // The original clips move beyond the bind-pose bounds; no stale culling.
      object.frustumCulled = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        material.roughness = .94; material.metalness = 0;
        material.emissive = new THREE.Color(0x777777);
        material.emissiveMap = material.map; material.emissiveIntensity = .12;
      });
    });
    rig.add(model);
    return [names[i], { model, mixer: new THREE.AnimationMixer(model), clips: gltf.animations, active: null }];
  }));
  function disposeModels() {
    loaded.forEach(gltf => gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => { m.map?.dispose(); m.dispose(); });
    }));
  }
  function pose(model, clipName, time) {
    const clip = THREE.AnimationClip.findByName(model.clips, clipName);
    if (!clip) throw new Error(`Original Toy Merchant clip missing: ${clipName}`);
    if (model.active !== clipName) {
      model.mixer.stopAllAction();
      model.mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce, 1).play().clampWhenFinished = true;
      model.active = clipName;
    }
    model.mixer.setTime(Math.max(0, Math.min(time, clip.duration - .00001)));
  }
  let frame = 0;
  let resolvePlay;
  function stop() {
    cancelAnimationFrame(frame); frame = 0;
    Object.values(models).forEach(model => { model.mixer.stopAllAction(); model.active = null; });
    renderer.clear();
    resolvePlay?.(); resolvePlay = null;
  }
  function play(kind, { x, footY, height }) {
    stop();
    Object.values(models).forEach(model => model.model.position.set(0, 0, 0));
    rig.scale.set(-1, 1, 1); rig.position.set(0, 0, 0); rig.rotation.set(0, -.58, 0);
    pose(models.annie, 'toyman_fly', .4); pose(models.plane, 'toyman_fly', .4);
    rig.updateMatrixWorld(true);
    const openedWingTop = new THREE.Box3().setFromObject(models.plane.model, true).max.y;
    // The opened original wings rise above Annie's head. Reserve that full
    // silhouette inside the cover rather than cropping the wing at the header.
    const scale = Math.min(height / 17.4, kind === 'glider'
      ? Math.max(1, (footY - 145) / openedWingTop)
      : Math.max(1, (footY - 70) / 25.5));
    const start = performance.now();
    const duration = kind === 'springboard' ? 5.5 : 4.1;
    rig.scale.set(-scale, scale, scale);
    rig.position.set(x - 640, 360 - footY, 0);
    rig.rotation.set(0, -.58, 0);
    renderer.domElement.style.opacity = '1';
    const done = new Promise(resolve => { resolvePlay = resolve; });
    function render(now) {
      const t = Math.max(0, (now - start) / 1000);
      if (t >= duration) { stop(); return; }
      let flight = 0;
      models.tiaoban.model.visible = kind === 'springboard';
      models.plane.model.visible = kind === 'glider';
      if (kind === 'springboard') {
        if (t < 2) {
          pose(models.annie, 'toyman_jump_set', t);
          pose(models.tiaoban, 'toyman_jump_set', t);
        } else if (t < 2.7) {
          pose(models.annie, 'toyman_jump_out_1', t - 2);
          pose(models.tiaoban, 'toyman_jump_out_1', t - 2);
        } else {
          pose(models.annie, 'toyman_jump_out_2', Math.min(t - 2.7, .65));
          pose(models.tiaoban, 'toyman_jump_out_2', Math.min(t - 2.7, .65));
          // The original next clip starts a new movement segment. The web flight
          // supplies that segment's travel while retaining the source joint pose.
          flight = Math.min(1, (t - 2.7) / 2.8);
        }
      } else {
        const clip = t < .6 ? 'toyman_fly_prepare' : 'toyman_fly';
        const clipTime = t < .6 ? t : (t - .6) % 2.6666667;
        pose(models.annie, clip, clipTime); pose(models.plane, clip, clipTime);
        flight = Math.max(0, Math.min(1, (t - .6) / 3.5));
      }
      // Keep the placed board on the floor while Annie travels out of the cover.
      const shiftX = -flight * 1420;
      const shiftY = Math.sin(flight * Math.PI * .7) * (kind === 'glider' ? 65 : 270);
      const launchForward = kind === 'springboard' && t >= 2.7 ? 4.73828125 : 0;
      models.annie.model.position.set(shiftX / -scale, shiftY / scale, launchForward);
      models.plane.model.position.copy(models.annie.model.position);
      const fade = Math.min(1, t / .14, (duration - t) / .45);
      renderer.domElement.style.opacity = String(Math.max(0, fade));
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);
    return done;
  }
  return { play, stop, dispose() { stop(); disposeModels(); renderer.dispose(); renderer.domElement.remove(); } };
}
