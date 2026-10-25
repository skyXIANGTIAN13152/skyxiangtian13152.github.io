import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createDetectiveLocomotion } from './detective-locomotion.js?v=20261025-35';

function disposeModel(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set(), bitmaps = new Set();
  root.traverse(object => {
    if (object.skeleton) skeletons.add(object.skeleton);
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(texture => {
    const data = texture.source?.data;
    if (data && typeof data.close === 'function') bitmaps.add(data);
    texture.dispose();
  });
  bitmaps.forEach(bitmap => bitmap.close());
  skeletons.forEach(skeleton => skeleton.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

/** Each visitor keeps the original skin's skeleton, textures and animation tracks. */
export async function createVisitorAvatar({ definition, onFootstep = () => {} }) {
  const gltf = await new GLTFLoader().loadAsync(definition.url);
  const group = new THREE.Group();
  group.name = `original-visitor-${definition.id}-${definition.form}`;
  gltf.scene.scale.fromArray(definition.scale || [-0.1, 0.1, 0.1]);
  group.add(gltf.scene);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const idle = THREE.AnimationClip.findByName(gltf.animations, definition.idleClip);
  const walk = THREE.AnimationClip.findByName(gltf.animations, definition.walkClip);
  if (!idle || !walk) {
    disposeModel(gltf.scene);
    throw new Error(`Original visitor movement clips are missing: ${definition.id}.`);
  }
  const locomotion = createDetectiveLocomotion(mixer, idle, walk, {
    nominalWalkSpeed: 1.1, onFootstep, footstepTimes: definition.footstepTimes,
  });
  let lantern = null, lanternLight = null, fireTexture = null;
  try {
    if (definition.lantern) {
      const socket = definition.lantern;
      const bone = gltf.scene.getObjectByName(socket.bone);
      if (!bone) throw new Error('The original visitor lantern socket is missing.');
      lantern = new THREE.Object3D();
      lantern.name = 'original-visitor-lantern-socket';
      lantern.position.fromArray(socket.position);
      bone.add(lantern);
      const results = await Promise.allSettled([
        new THREE.TextureLoader().loadAsync(new URL('./assets/detective/fire_001.png', import.meta.url).href),
        new THREE.TextureLoader().loadAsync(new URL('./assets/detective/glow_109.png', import.meta.url).href),
      ]);
      if (results.some(result => result.status === 'rejected')) {
        for (const result of results) if (result.status === 'fulfilled') result.value.dispose();
        throw results.find(result => result.status === 'rejected').reason;
      }
      const textures = results.map(result => result.value);
      const glowTexture = textures[1];
      fireTexture = textures[0];
      fireTexture.colorSpace = glowTexture.colorSpace = THREE.SRGBColorSpace;
      fireTexture.repeat.set(1 / 8, 1 / 4);
      fireTexture.offset.set(0, 3 / 4);
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTexture, color: 0xffc16c,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      flame.scale.set(0.42, 0.84, 1);
      lantern.add(flame);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffaa47,
        transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending,
        depthWrite: false, toneMapped: false }));
      glow.scale.set(1.2, 1.2, 1);
      lantern.add(glow);
      lanternLight = new THREE.PointLight(0xffb45f, 0.3, 2.4, 2);
      lantern.add(lanternLight);
    }
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (definition.lantern && material.name === definition.lantern.glassMaterial) {
          material.transparent = true; material.opacity = 0.16;
          material.depthWrite = false; material.roughness = 0.2;
          material.emissive.set(0x6d3e15); material.emissiveIntensity = 0.4;
        }
      }
      object.castShadow = !materials.some(material => material.transparent);
      object.receiveShadow = true;
      object.frustumCulled = false;
    });
  } catch (error) {
    mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene); disposeModel(group);
    throw error;
  }
  let previousTime;
  function update(time, speed = 0, footstepsAllowed = false) {
    const delta = previousTime === undefined ? 0 : Math.min(0.1, Math.max(0, time - previousTime));
    previousTime = time;
    locomotion.update(delta, speed, footstepsAllowed);
    if (fireTexture) {
      const frame = Math.floor(time * 32) % 32;
      fireTexture.offset.set((frame % 8) / 8, (3 - Math.floor(frame / 8)) / 4);
    }
    group.updateMatrixWorld(true);
  }
  function dispose() {
    mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene); disposeModel(group);
    group.removeFromParent();
  }
  return { group, lantern, lanternLight, update, dispose, mixer, model: gltf.scene, definition };
}
