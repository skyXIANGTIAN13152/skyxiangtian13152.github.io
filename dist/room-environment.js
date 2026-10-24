import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createOriginalSceneLighting, configureOriginalLightmap } from './original-scene-lighting.js?v=20261023-13';
import { computeRoomBounds } from './room-bounds.js';
import { createReflectionScheduler } from './room-reflections.js?v=20261024-32';

// Browser adapter for original dm65_main data. No replacement geometry is made.
const UNIT = 0.1;
const v3 = a => new THREE.Vector3(...a);
const values = (p, key, fallback) => (p[key]?.Value || fallback).split(',').map(Number);
const seasonalProps = /\/(?:h55_manor_halloween01|h55_coa5_word0[12]|h55_p5wardrobe_p5mail01|h55_main_haibao01|h55_main_envelope01)\.gim$/;

export function isOriginalFloorSurface(path, hidden = false) {
  // The main floor has a cutout under the coat-rack carpet. In this lobby the
  // original cellar door is closed and fills it at the same walking height.
  return !hidden && /\/dm65_main_(?:ground001|cellardoor001)\.gim$/.test(path);
}

export function createRoomHotspots() {
  return [
    // Original standing mirror dm65_main_baimo_012_12 on the east wall:
    // x=7.84–8.37, z=4.73–5.81. Keep the label and approach on its room side.
    { id: 'journey', label: '人生足迹', position: v3([7.75, 1.95, 5.25]), approach: v3([6.55, 0, 5.25]) },
    // Original north-wall book stacks; the approach stays on the open floor.
    { id: 'recommendations', label: '项目珍藏', position: v3([3.78, 1.65, 9.1]), approach: v3([3.78, 0, 7.75]) },
    // The original piano occupies x=1.78–2.59, z=3.73–5.80. Keep the
    // approach on its open room side, separate from the archive wall labels.
    { id: 'games', label: '游戏合集', position: v3([2.6, 1.9, 4.7]), approach: v3([3.8, 0, 4.7]) },
    { id: 'pets', label: '宠物小屋', position: v3([7.7, 1.35, -8.6]), approach: v3([6.55, 0, -8.6]) },
    { id: 'people', label: '名人墙', position: v3([3.1, 2.15, -9.35]), approach: v3([3.1, 0, -8.2]) },
    { id: 'about', label: '关于我', position: v3([7.9, 2.3, -3.9]), approach: v3([6.8, 0, -3.9]) },
    { id: 'work', label: '作品集', position: v3([8, 2.2, .35]), approach: v3([6.7, 0, .35]) },
    { id: 'study', label: '专业学习', position: v3([8.1, 2.1, -1.6]), approach: v3([6.7, 0, -1.6]) },
    { id: 'interests', label: '兴趣爱好', position: v3([7.55, 1.3, -4.45]), approach: v3([6.35, 0, -4.45]) },
  ];
}

function originalMirror(mesh, data, mask) {
  // Reflector expects a local +Z plane. Rebase the original mesh onto that
  // plane and apply the exact inverse transform; no mirror outline is rebuilt.
  const geometry = mesh.geometry.clone();
  // glTF primitives share the full model vertex buffer. Only the indices of
  // this glass primitive define its plane, not the adjacent wooden frame.
  const box = new THREE.Box3(), point = new THREE.Vector3(), index = geometry.index;
  for (let i = 0; i < index.count; i++) box.expandByPoint(point.fromBufferAttribute(geometry.getAttribute('position'), index.getX(i)));
  const center = box.getCenter(new THREE.Vector3());
  const normal = new THREE.Vector3().fromBufferAttribute(geometry.getAttribute('normal'), index.getX(0)).normalize();
  const alignment = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 0, 1));
  geometry.translate(-center.x, -center.y, -center.z).applyQuaternion(alignment);
  computeRoomBounds(geometry);
  const resolution = typeof innerWidth !== 'undefined' && innerWidth < 768 ? 512 : 1024;
  const mirror = new Reflector(geometry, {
    textureWidth: resolution, textureHeight: resolution, multisample: 0,
    clipBias: .001,
    shader: {
      name: 'Original_dm65_reflection',
      uniforms: {
        color: { value: new THREE.Color() }, tDiffuse: { value: null },
        textureMatrix: { value: new THREE.Matrix4() },
        originalMask: { value: mask },
        originalBackground: { value: v3(data.background) },
        originalStrength: { value: data.strength },
      },
      vertexShader: `uniform mat4 textureMatrix;varying vec4 vReflection;varying vec4 vScreen;varying vec2 vMask;
        void main(){vMask=uv;vReflection=textureMatrix*vec4(position,1.0);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);vScreen=gl_Position;}`,
      fragmentShader: `uniform sampler2D tDiffuse,originalMask;uniform vec3 originalBackground;uniform float originalStrength;
        varying vec4 vReflection,vScreen;varying vec2 vMask;
        void main(){float screenY=vScreen.y/vScreen.w;
        float fade=screenY>0.0?pow(1.0-screenY,2.0):1.0;
        vec3 reflected=pow(max(texture2DProj(tDiffuse,vReflection).rgb,vec3(0.0)),vec3(1.0/2.2));
        vec3 originalGamma=mix(reflected*originalStrength*fade,originalBackground,texture2D(originalMask,vMask).r);
        gl_FragColor=vec4(pow(max(originalGamma,vec3(0.0)),vec3(2.2)),1.0);
        #include <colorspace_fragment>
        }`,
    },
  });
  mirror.material.toneMapped = false;
  mirror.name = mesh.name;
  mirror.userData = mesh.userData;
  const rebase = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z)
    .multiply(new THREE.Matrix4().makeRotationFromQuaternion(alignment.invert()));
  mesh.updateMatrix();
  mirror.matrix.copy(mesh.matrix).multiply(rebase);
  mirror.matrix.decompose(mirror.position, mirror.quaternion, mirror.scale);
  return mirror;
}

function originalGlow(parameters) {
  const color = values(parameters, 'color', '1,0.4941,0.1608,1');
  return new THREE.ShaderMaterial({
    uniforms: {
      originalColor: { value: new THREE.Color(...color.slice(0, 3)) },
      originalAlpha: { value: Number(parameters.alpha?.Value || .2) },
      originalFactor: { value: Number(parameters.factor?.Value || 4) },
      originalYFactor: { value: Number(parameters.y_factor?.Value || .04) },
      originalYBase: { value: Number(parameters.y_base?.Value || 0) },
    },
    vertexShader: `varying vec3 vOriginalWorld; varying vec3 vOriginalNormal; varying float vOriginalY;
      void main(){vec4 w=modelMatrix*vec4(position,1.0);vOriginalWorld=w.xyz;
      vOriginalNormal=normalize(mat3(modelMatrix)*normal);
      vOriginalY=(w.y-modelMatrix[3].y)/${UNIT};
      gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 originalColor;uniform float originalAlpha,originalFactor,originalYFactor,originalYBase;
      varying vec3 vOriginalWorld,vOriginalNormal;varying float vOriginalY;
      void main(){vec3 delta=cameraPosition-vOriginalWorld;float d=length(delta)/${UNIT};
      float att=1.0-smoothstep(300.0,1000.0,d);
      float nov=pow(clamp(dot(normalize(vOriginalNormal),normalize(delta)),0.0,1.0),originalFactor);
      float a=clamp(nov*att*originalAlpha*min(max(0.0,vOriginalY-originalYBase)*originalYFactor,1.0),0.0,1.0);
      gl_FragColor=vec4(originalColor,a);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.FrontSide, toneMapped: false,
  });
}

export async function createRoom(options = {}) {
  const url = options.url || new URL('./assets/room/original-lobby.glb', import.meta.url).href;
  const gltf = await new GLTFLoader().loadAsync(url);
  const source = gltf.parser.json.extras.originalScene;
  const group = new THREE.Group();
  group.name = 'Original_dm65_main';
  // NeoX's scene coordinates use the opposite handedness to Three. Mirroring
  // X preserves the character's +Z forward while restoring the game's layout.
  group.scale.set(-UNIT, UNIT, UNIT);
  group.add(gltf.scene);
  gltf.scene.traverse(o => {
    if (!o.userData.originalStaticPose) return;
    o.updateMatrix();
    o.matrix.multiply(new THREE.Matrix4().fromArray(o.userData.originalStaticPose.matrix));
    o.matrix.decompose(o.position, o.quaternion, o.scale);
  });
  group.updateMatrixWorld(true);
  const sourceBounds = new Map();
  gltf.scene.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh) return;
    if (!sourceBounds.has(o.geometry)) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      sourceBounds.set(o.geometry, o.geometry.boundingBox.clone());
      computeRoomBounds(o.geometry);
    }
    // Keep the established light selection identical; these new bounds are
    // only for culling/rays, not a change to the original room's illumination.
    o.userData.originalLightingBounds = sourceBounds.get(o.geometry);
  });
  const lighting = createOriginalSceneLighting(source, group);
  const collisionGroup = new THREE.Group();
  collisionGroup.name = 'Original_dm65_main_collision';
  const collisionMeshes = [], floorMeshes = [], materialWarnings = [];
  const bakedTextures = new Map(), reflectionTextures = new Map();
  for (const m of gltf.parser.json.materials) {
    const lm = m.extras?.originalManualLightmap || m.extras?.originalLightmap;
    if (lm && !bakedTextures.has(lm.texture)) {
      bakedTextures.set(lm.texture, await gltf.parser.getDependency('texture', lm.texture));
    }
    const reflection = m.extras?.originalReflection;
    if (reflection && !reflectionTextures.has(reflection.maskTexture)) {
      const texture = (await gltf.parser.getDependency('texture', reflection.maskTexture)).clone();
      texture.colorSpace = THREE.NoColorSpace; texture.needsUpdate = true;
      reflectionTextures.set(reflection.maskTexture, texture);
    }
  }
  const meshMaterials = [], mirrors = [], mirrorReplacements = [];
  gltf.scene.traverse(o => {
    if (o.userData.originalInstance) {
      const path = o.userData.originalInstance.resource.replaceAll('\\', '/').toLowerCase();
      o.userData.seasonalProp = seasonalProps.test(path);
      o.visible = !o.userData.hiddenFlag && (!o.userData.seasonalProp || options.seasonalEvents === true);
    }
    if (!o.isMesh) return;
    const data = o.material.userData;
    const p = data.originalMaterial?.parameters || {};
    const technique = p.Technique?.TechName || '';
    const mode = Number(p.TransparentMode?.TransparentMode || 1);
    const rs = p.RenderStates || {};
    const old = o.material;
    let m;
    if (data.originalReflection) {
      const mirror = originalMirror(o, data.originalReflection, reflectionTextures.get(data.originalReflection.maskTexture));
      mirrorReplacements.push({ old: o, mirror }); mirrors.push(mirror);
      return;
    }
    if (/model_light\./i.test(technique)) {
      m = originalGlow(p);
    } else {
      m = new THREE.MeshBasicMaterial({
        map: old.map, color: old.color.clone(), side: old.side,
        transparent: mode === 2 || mode === 5 || old.transparent,
        opacity: old.opacity, alphaTest: old.alphaTest,
        depthWrite: mode !== 2 && mode !== 5,
        blending: mode === 5 ? THREE.AdditiveBlending : THREE.NormalBlending,
        toneMapped: false,
      });
      if (/TNoShader/i.test(technique) || Number(rs.AlphaVal) === 0) m.visible = false;
      if (data.originalPath.endsWith('dm65_main_candles001.mtg#material_1') && options.litCandles !== false) {
        // Original flame mesh/texture. AlphaVal=0 is the source's unlit state;
        // this gallery chooses the lit lobby state without changing geometry.
        m.visible = true; m.opacity = 1; m.color.setScalar(Math.pow(Number(p.change_color_bright?.Value || 2), 2.2));
        const flameBox = new THREE.Box3(), flamePoint = new THREE.Vector3();
        const indices = o.geometry.index, vertices = o.geometry.getAttribute('position');
        for (let i = 0; i < indices.count; i++) flameBox.expandByPoint(flamePoint.fromBufferAttribute(vertices, indices.getX(i)));
        o.updateWorldMatrix(true, false);
        const center = flameBox.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld);
        // Local browser illumination, separate from all preserved Scene lamps.
        // Warm RGB is sampled from the source flame's actual UV atlas region.
        lighting.addBrowserFlame({ position: center,
          color: v3([.9635446, .72255619, .29295328]), range: 2.25, intensity: 1.2 });
      }
      const lm = data.originalManualLightmap || data.originalLightmap;
      if (lm) {
        const tex = bakedTextures.get(lm.texture).clone();
        tex.channel = o.geometry.hasAttribute('uv1') ? 1 : 0;
        tex.colorSpace = THREE.NoColorSpace;
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.offset.fromArray(lm.uvOffset); tex.repeat.fromArray(lm.uvScale);
        tex.needsUpdate = true;
        m.lightMap = tex; m.lightMapIntensity = Math.PI;
      }
      const isFlame = data.originalPath.endsWith('dm65_main_candles001.mtg#material_1');
      if (!isFlame && !/TNoShader|common_nolight/i.test(technique)) {
        m.onBeforeCompile = shader => configureOriginalLightmap(shader, o, lighting, lm);
        // All instances share shader code; original lamp choices live in each
        // material's uniforms, so programs can be reused across the room.
        m.customProgramCacheKey = () => 'original-scene-lighting-v1';
      }
      if (!old.map && p.Tex0?.Value) {
        materialWarnings.push({ path: data.originalPath, missingTexture: p.Tex0.Value });
      }
    }
    m.name = old.name; m.userData = data;
    o.material = m; o.castShadow = true; o.receiveShadow = true;
    meshMaterials.push(m);
  });
  for (const { old, mirror } of mirrorReplacements) {
    old.parent.add(mirror); old.parent.remove(old);
  }
  const museSource = source.chunks.flatMap(chunk => (chunk.fx || []).map(fx => ({ fx, files: chunk.files })))
    .find(({ fx, files }) => /miusibiaozhi_01\.(?:sfx|pse|npse)/i.test(files[fx.attributes.FilePathIndex] || ''));
  let museMark = null;
  if (museSource) {
    const a = museSource.fx.attributes;
    const texture = await new THREE.TextureLoader().loadAsync(new URL('textures/original-muse-mark.png', new URL(url, import.meta.url)).href);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Original NXBI spawn constants: InitSize=(14,14), InitColor=(134,54,53,165)/255.
    // The renderer maps the original size to a full-width sprite quad, retaining
    // the exact Scene position/rotation/scale rather than repositioning the mark.
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true,
      color: new THREE.Color().setRGB(134/255, 54/255, 53/255, THREE.SRGBColorSpace), opacity: 165/255,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    museMark = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), material);
    museMark.name = 'Original_miusibiaozhi_01';
    const matrix = new THREE.Matrix4().fromArray(JSON.parse(a.Rotation));
    matrix.scale(v3(JSON.parse(a.Scale))); matrix.setPosition(v3(JSON.parse(a.Position)));
    matrix.decompose(museMark.position, museMark.quaternion, museMark.scale);
    museMark.userData.originalEffect = museSource.fx;
    group.add(museMark); meshMaterials.push(material);
  }
  group.updateMatrixWorld(true);

  // The original author supplied separate collision meshes for the walls, piano
  // and both seats. Other solid furniture uses its original detailed triangles.
  const exactCollision = /dm65_main_pengzhuang001|dm65_main_ground001/;
  const solidGeometry = /dm65_main_(?:bookshelf001|pianochair001|brick00[1-5]|door00[13]|baimo_012|hidden00[12]|stair01)|chr\/player\/detective\/portrait\.gim$/;
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    let instance = o;
    while (instance && !instance.userData.originalInstance) instance = instance.parent;
    if (!instance) return;
    const path = instance.userData.originalInstance.resource.replaceAll('\\', '/').toLowerCase();
    if (isOriginalFloorSurface(path, instance.userData.hiddenFlag)) floorMeshes.push(o);
    if (!exactCollision.test(path) && !(solidGeometry.test(path) && !instance.userData.hiddenFlag)) return;
    const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    computeRoomBounds(geometry);
    if (o.matrixWorld.determinant() < 0) {
      const index = geometry.index;
      for (let i = 0; i < index.count; i += 3) {
        const second = index.getX(i + 1);
        index.setX(i + 1, index.getX(i + 2)); index.setX(i + 2, second);
      }
    }
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    mesh.name = instance.name;
    mesh.matrixAutoUpdate = false;
    mesh.userData.originalResource = path;
    collisionGroup.add(mesh); collisionMeshes.push(mesh);
  });
  collisionGroup.updateMatrixWorld(true);
  const floorBox = new THREE.Box3();
  for (const mesh of floorMeshes) floorBox.union(new THREE.Box3().setFromObject(mesh));
  const bounds = { minX: floorBox.min.x, maxX: floorBox.max.x, minZ: floorBox.min.z, maxZ: floorBox.max.z };
  const ray = new THREE.Raycaster();
  const floorRayOrigin = new THREE.Vector3(), floorRayDirection = new THREE.Vector3(0, -1, 0);
  const floorHits = [];
  function floorHeight(x, z) {
    ray.set(floorRayOrigin.set(x, 3, z), floorRayDirection);
    floorHits.length = 0;
    ray.intersectObjects(floorMeshes, false, floorHits);
    return floorHits[0]?.point.y ?? null;
  }
  const spawn = { x: 6.05, y: floorHeight(6.05, -2.4) || 0, z: -2.4 };
  const hotspots = createRoomHotspots();
  const reflections = createReflectionScheduler(mirrors);
  return {
    group, collisionGroup, collisionMeshes, blockers: collisionMeshes,
    colliders: [], bounds, spawn, hotspots, floorHeight,
    cameraPosition: v3([3.7, 2.3, -2.6]), cameraTarget: v3([8.2, 1.7, -2.4]),
    metadata: { sourceScene: source.sceneName, unitsScale: UNIT, coordinateConversion: 'X mirrored, Y/Z unchanged', original: source,
      placementNote: 'Website spawn and UI hotspot choices; all room geometry and transforms remain original.',
      materialWarnings, originalMirrors: mirrors.length, sceneLighting: lighting.metadata,
      museMark: museMark ? { originalTexture: 'fx/texture/mark/mark_006.dds', contentMD5: '449bb6865b31fbd4e707d4bb38e452dd',
        originalSceneTransform: museSource.fx.attributes, originalParticleSize: [14,14], originalColorRGBA: [134,54,53,165], browserQuadWidthMeters: .42,
        limitation: 'Original NXBI size and color are verified; its sprite-facing/blending enum is adapted with a normal transparent wall quad.' } : null,
      candleState: options.litCandles === false ? 'Original unlit alpha state' : 'Original flame meshes activated for lit lobby' },
    update() {},
    prepareReflections: reflections.prepare,
    invalidateReflections: reflections.invalidate,
    get reflectionStats() { return reflections.stats; },
    dispose() { reflections.dispose(); for (const m of meshMaterials) m.dispose(); if (museMark) { museMark.geometry.dispose(); museMark.material.map.dispose(); } for (const mirror of mirrors) { mirror.dispose(); mirror.geometry.dispose(); } for (const o of collisionMeshes) { o.geometry.dispose(); o.material.dispose(); } },
  };
}
