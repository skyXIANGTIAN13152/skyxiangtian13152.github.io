import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { crossedFootsteps } from './detective-footsteps.js';

/** Original game mesh, textures, skeleton and original lantern locomotion clips. */
export async function createDetective({
  url = new URL('./assets/detective/original-detective.glb', import.meta.url).href,
  nominalWalkSpeed = 1.1,
  fireTextureUrl = new URL('./assets/detective/fire_001.png', import.meta.url).href,
  glowTextureUrl = new URL('./assets/detective/glow_109.png', import.meta.url).href,
  onFootstep = () => {},
} = {}) {
  const [gltf, fireTexture, glowTexture] = await Promise.all([
    new GLTFLoader().loadAsync(url),
    new THREE.TextureLoader().loadAsync(fireTextureUrl),
    new THREE.TextureLoader().loadAsync(glowTextureUrl),
  ]);
  const group = new THREE.Group();
  group.name = 'original-old-detective';
  gltf.scene.scale.set(-0.1, 0.1, 0.1);
  group.add(gltf.scene);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'hall_idle_2');
  const walkClip = THREE.AnimationClip.findByName(gltf.animations, 'hall_walk_2');
  if (!idleClip || !walkClip) throw new Error('Original lantern movement clips are missing.');
  const idle = mixer.clipAction(idleClip);
  const walk = mixer.clipAction(walkClip);
  idle.play();
  mixer.update(0);

  // Exact flame socket from detective.gim / Socket_0. Coordinates remain in game units.
  const lampBone = gltf.scene.getObjectByName('bone003');
  if (!lampBone) throw new Error('Original lantern bone is missing.');
  const lantern = new THREE.Object3D();
  lantern.name = 'original-lantern-flame-socket';
  lantern.position.set(0.533, 0.0167, 0.0254);
  lampBone.add(lantern);
  // Original lazhu_01_detective.npse references these exact original sprite textures.
  // fire_001.spr specifies 32 frames in 1000 ms, arranged as eight columns and four rows.
  fireTexture.colorSpace = glowTexture.colorSpace = THREE.SRGBColorSpace;
  fireTexture.repeat.set(1 / 8, 1 / 4);
  fireTexture.offset.set(0, 3 / 4);
  const flameMaterial = new THREE.SpriteMaterial({ map: fireTexture, color: 0xffc16c,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flame = new THREE.Sprite(flameMaterial);
  flame.name = 'original-fire-001-sprite';
  flame.scale.set(0.42, 0.84, 1);
  lantern.add(flame);
  const glowMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0xffaa47,
    transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false });
  const glow = new THREE.Sprite(glowMaterial);
  glow.name = 'original-glow-109-sprite';
  glow.scale.set(1.2, 1.2, 1);
  lantern.add(glow);
  // Three lighting adapter; texture, frames and attachment remain original game data.
  const lanternLight = new THREE.PointLight(0xffb45f, 0.3, 2.4, 2);
  lanternLight.name = 'lantern-light';
  lantern.add(lanternLight);
  gltf.scene.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material.name === 'Original material slot 4') {
        // Original glass material has TransparentMode=2, unlike opaque metal slot 3.
        material.transparent = true;
        material.opacity = 0.16;
        material.depthWrite = false;
        material.roughness = 0.2;
        material.emissive.set(0x6d3e15);
        material.emissiveIntensity = 0.4;
      }
    }
    object.castShadow = true;
    object.receiveShadow = true;
    // Animated bounds are evaluated by Three; avoid clipping at the old bind-pose box.
    object.frustumCulled = false;
  });
  let previousTime;
  let active = idle;
  function update(time, speed = 0, reducedMotion = false, footstepsAllowed = false) {
    const delta = previousTime === undefined ? 0 : Math.min(0.1, Math.max(0, time - previousTime));
    previousTime = time;
    const moving = Math.abs(speed) > 0.025;
    const next = moving ? walk : idle;
    if (next !== active) {
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      next.crossFadeFrom(active, reducedMotion ? 0.12 : 0.24, false);
      active = next;
    }
    walk.setEffectiveTimeScale(Math.max(0.3, Math.min(2, Math.abs(speed) / nominalWalkSpeed)));
    idle.setEffectiveTimeScale(reducedMotion && !moving ? 0 : 1);
    const previousWalkTime = walk.time;
    mixer.update(delta);
    // Follow the actual animation phase, including slow joystick movement and
    // looping. Collision/input permission is separate from the visual fade speed.
    if (active === walk && moving && footstepsAllowed && delta > 0) {
      for (const eventTime of crossedFootsteps(previousWalkTime, walk.time, walkClip.duration)) {
        onFootstep({ eventTime, phase: walk.time });
      }
    }
    const frame = reducedMotion ? 0 : Math.floor(time * 32) % 32;
    fireTexture.offset.set((frame % 8) / 8, (3 - Math.floor(frame / 8)) / 4);
    group.updateMatrixWorld(true);
  }
  function dispose() {
    mixer.stopAllAction();
    mixer.uncacheRoot(gltf.scene);
    const textures = new Set();
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        material.dispose();
      }
    });
    textures.forEach(texture => texture.dispose());
    flameMaterial.dispose();
    glowMaterial.dispose();
    fireTexture.dispose();
    glowTexture.dispose();
  }
  return { group, lantern, lanternLight, update, dispose, mixer, model: gltf.scene };
}

