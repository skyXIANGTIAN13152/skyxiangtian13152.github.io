import { Box3, Matrix4, Vector3, Vector4 } from 'three';

const vector = (value, fallback = []) => Array.isArray(value) ? value :
  typeof value === 'string' ? value.replace(/[\[\]]/g, '').split(',').map(Number) : fallback;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

// Original 2022 shader/lightmap.fx: four per-draw point lights and one spot.
// Scene Usage is preserved. Its proprietary enum and runtime candidate sorting
// have not been recovered; selection below is explicitly a browser adaptation.
export function createOriginalSceneLighting(source, root) {
  root?.updateWorldMatrix(true, false);
  const matrix = root?.matrixWorld.clone() || new Matrix4().makeScale(-.1, .1, .1);
  const unit = new Vector3().setFromMatrixScale(matrix).length() / Math.sqrt(3);
  const lights = [];
  for (const [chunkIndex, chunk] of source.chunks.entries()) {
    for (const [lightIndex, node] of (chunk.lights || []).entries()) {
      const a = node.attributes;
      if (String(a.Enable).toLowerCase() !== 'true') continue;
      const diffuseTrack = node.children?.find(child => child.tag === 'Diffuse');
      const keys = (diffuseTrack?.children || []).slice().sort((a, b) => Number(a.attributes.Time) - Number(b.attributes.Time));
      const rgba = vector(keys[0]?.attributes.Color, [0, 0, 0, 1]);
      const intensity = Number(a.Intensity ?? 1);
      const custom = vector(a.CustomAttr, [1, 0, 0, 0]);
      const type = Number(a.Type);
      if (type !== 1 && type !== 2) continue;
      lights.push({
        id: `${chunkIndex}:${lightIndex}:${a.Name}`,
        name: a.Name,
        type,
        usage: Number(a.Usage),
        bakeBindRealtime: String(a.BakeBindRealtime).toLowerCase() === 'true',
        priority: Number(a.Priority || 0),
        position: new Vector3(...vector(a.Position, [0, 0, 0])).applyMatrix4(matrix),
        direction: new Vector3(...vector(a.Direction, [0, -1, 0])).transformDirection(matrix),
        range: Number(a.Range || 0) * unit,
        color: new Vector3(...rgba.slice(0, 3)).multiplyScalar(intensity),
        exponent: Number(custom[0]) + .001,
        innerCos: Math.cos(Number(a.InnerConeAngle || 0) * Math.PI / 180),
        outerCos: Math.cos(Number(a.OuterConeAngle || 0) * Math.PI / 180),
        original: node,
      });
    }
  }
  const globals = source.globalConfig?.global?.children || [];
  const ambientNode = globals.find(node => node.tag === 'AmbientLight');
  const ambientARGB = vector(ambientNode?.attributes.Color, [255, 0, 0, 0]);
  const ambient = new Vector3(...ambientARGB.slice(1, 4)).multiplyScalar(1 / 255);
  const browserFlames = [];
  function addBrowserFlame({ position, color, range, intensity }) {
    if (browserFlames.length >= 4) throw new Error('The original room has four candle flame surfaces.');
    if (!(range > 0) || !(intensity >= 0)) throw new Error('Browser flame adaptation requires explicit range and intensity.');
    const value = { position: position.clone(), color: color.clone().multiplyScalar(intensity), range, exponent: 1.001 };
    browserFlames.push(value);
    return value;
  }

  function select(mesh) {
    mesh.updateWorldMatrix(true, false);
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const box = new Box3().copy(mesh.userData.originalLightingBounds || mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    const candidates = lights.map(light => {
      const distance = box.distanceToPoint(light.position);
      const falloff = Math.pow(clamp(1 - (distance / Math.max(light.range, .0001)) ** 2), light.exponent);
      return { light, score: Math.max(...light.color.toArray()) * falloff };
    }).filter(entry => entry.score > 0)
      .sort((a, b) => b.light.priority - a.light.priority || b.score - a.score || a.light.id.localeCompare(b.light.id));
    return {
      points: candidates.filter(entry => entry.light.type === 1).slice(0, 4).map(entry => entry.light),
      spots: candidates.filter(entry => entry.light.type === 2).slice(0, 1).map(entry => entry.light),
    };
  }
  return { lights, ambient, browserFlames, addBrowserFlame, select, metadata: {
    source: '2022 dm65_main Scene lights and shader/lightmap.fx',
    sourceLightCount: lights.length,
    pointLimit: 4,
    spotLimit: 1,
    limitation: 'Usage values are preserved, not assigned an unverified enum meaning. Enabled source lights are selected by original priority then bounding-box range/intensity; proprietary game filtering, animation tracks after time zero and shadow passes are not reproduced.',
    browserFlameAdaptation: 'Optional per-pixel illumination may be attached to the four original flame geometry centers using an original warm flame color. Its explicit range/intensity is a website rendering adaptation, separate from the preserved 22 Scene lights. Per-pixel evaluation avoids missing a flame between the vertices of an original large wall polygon.',
  } };
}

const vertexDeclarations = /* glsl */`
uniform vec4 originalPointPositionRange[4];
uniform vec4 originalPointColorExponent[4];
uniform vec4 originalSpotPositionRange;
uniform vec4 originalSpotColorExponent;
uniform vec4 originalSpotDirectionInnerCos;
uniform float originalSpotOuterCos;
uniform vec4 originalBrowserFlamePositionRange[4];
uniform vec4 originalBrowserFlameColorExponent[4];
varying vec3 vOriginalSceneLighting;
varying vec3 vOriginalLightingWorldPosition;
varying vec3 vOriginalLightingWorldNormal;

vec3 originalPointLight(vec3 p, vec3 n, vec4 positionRange, vec4 colorExponent) {
  vec3 delta = p - positionRange.xyz;
  float distanceSq = dot(delta, delta);
  float range = max(positionRange.w, 0.0001);
  float attenuation = pow(clamp(1.0 - distanceSq / (range * range), 0.0, 1.0), colorExponent.w);
  vec3 towardsLight = -delta / max(sqrt(distanceSq), 0.0001);
  return colorExponent.rgb * attenuation * clamp(dot(n, towardsLight), 0.0, 1.0);
}
`;

const vertexLighting = /* glsl */`
vec3 originalWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
// normalMatrix handles non-uniform scale; the orthonormal view rotation is
// undone to compare against the original scene's world-space light positions.
vec3 originalWorldNormal = normalize((vec4(normalize(normalMatrix * normal), 0.0) * viewMatrix).xyz);
vOriginalLightingWorldPosition = originalWorldPosition;
vOriginalLightingWorldNormal = originalWorldNormal;
vOriginalSceneLighting = vec3(0.0);
for (int originalLightIndex = 0; originalLightIndex < 4; originalLightIndex++) {
  vOriginalSceneLighting += originalPointLight(originalWorldPosition, originalWorldNormal,
    originalPointPositionRange[originalLightIndex], originalPointColorExponent[originalLightIndex]);
}
vec3 originalSpotDelta = originalWorldPosition - originalSpotPositionRange.xyz;
vec3 originalSpotRay = originalSpotDelta / max(length(originalSpotDelta), 0.0001);
float originalCone = clamp((dot(originalSpotRay, originalSpotDirectionInnerCos.xyz) - originalSpotOuterCos) /
  max(originalSpotDirectionInnerCos.w - originalSpotOuterCos, 0.001), 0.0, 1.0);
vOriginalSceneLighting += originalPointLight(originalWorldPosition, originalWorldNormal,
  originalSpotPositionRange, originalSpotColorExponent) * originalCone;
`;

// Call from the room material's onBeforeCompile. This replaces the previous
// lightmap-only multiplier and keeps all shading in the old gamma domain before
// returning the finished color to Three's linear framebuffer.
export function configureOriginalLightmap(shader, mesh, lighting, lightmap) {
  const selected = lighting.select(mesh);
  const positions = Array.from({ length: 4 }, () => new Vector4(0, 0, 0, 1));
  const colors = Array.from({ length: 4 }, () => new Vector4(0, 0, 0, 1));
  selected.points.forEach((light, index) => {
    positions[index].set(...light.position.toArray(), light.range);
    colors[index].set(...light.color.toArray(), light.exponent);
  });
  const spot = selected.spots[0];
  const flamePositions = Array.from({ length: 4 }, () => new Vector4(0, 0, 0, 1));
  const flameColors = Array.from({ length: 4 }, () => new Vector4(0, 0, 0, 1));
  lighting.browserFlames.forEach((light, index) => {
    flamePositions[index].set(...light.position.toArray(), light.range);
    flameColors[index].set(...light.color.toArray(), light.exponent);
  });
  const originalBrightness = Number(mesh.material.userData.originalMaterial?.parameters?.change_color_bright?.Value || 0);
  Object.assign(shader.uniforms, {
    originalPointPositionRange: { value: positions },
    originalPointColorExponent: { value: colors },
    originalSpotPositionRange: { value: spot ? new Vector4(...spot.position.toArray(), spot.range) : new Vector4(0, 0, 0, 1) },
    originalSpotColorExponent: { value: spot ? new Vector4(...spot.color.toArray(), spot.exponent) : new Vector4(0, 0, 0, 1) },
    originalSpotDirectionInnerCos: { value: spot ? new Vector4(...spot.direction.toArray(), spot.innerCos) : new Vector4(0, -1, 0, 1) },
    originalSpotOuterCos: { value: spot?.outerCos ?? 0 },
    originalBrowserFlamePositionRange: { value: flamePositions },
    originalBrowserFlameColorExponent: { value: flameColors },
    originalSourceBrightness: { value: originalBrightness },
    originalSceneLightmapScale: { value: new Vector3(...(lightmap?.decodeScale || [1, 1, 1])) },
    originalSceneAmbient: { value: lighting.ambient },
  });
  shader.vertexShader = vertexDeclarations + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', vertexLighting + '\n#include <project_vertex>');
  const fragmentLighting = /* glsl */`
    varying vec3 vOriginalSceneLighting;
    varying vec3 vOriginalLightingWorldPosition;
    varying vec3 vOriginalLightingWorldNormal;
    uniform vec3 originalSceneLightmapScale;
    uniform vec3 originalSceneAmbient;
    uniform float originalSourceBrightness;
    uniform vec4 originalBrowserFlamePositionRange[4];
    uniform vec4 originalBrowserFlameColorExponent[4];
    ${vertexDeclarations.slice(vertexDeclarations.indexOf('vec3 originalPointLight'))}
    vec3 originalBrowserFlameLighting() {
      vec3 result = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        result += originalPointLight(vOriginalLightingWorldPosition, normalize(vOriginalLightingWorldNormal),
          originalBrowserFlamePositionRange[i], originalBrowserFlameColorExponent[i]);
      }
      return result;
    }
  `;
  shader.fragmentShader = fragmentLighting + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace(
    /reflectedLight\.indirectDiffuse\s*\+=\s*[^;]*lightMapTexel[^;]*;/,
    'reflectedLight.indirectDiffuse += lightMapTexel.rgb * originalSceneLightmapScale + vOriginalSceneLighting;',
  ).replace(
    'reflectedLight.indirectDiffuse += vec3( 1.0 );',
    'reflectedLight.indirectDiffuse += originalSceneAmbient + vOriginalSceneLighting;',
  ).replace(
    'reflectedLight.indirectDiffuse *= diffuseColor.rgb;',
    'reflectedLight.indirectDiffuse = sRGBTransferEOTF(vec4(sRGBTransferOETF(vec4(diffuseColor.rgb, 1.0)).rgb * max(reflectedLight.indirectDiffuse + originalBrowserFlameLighting() + vec3(originalSourceBrightness), vec3(0.0)), 1.0)).rgb;',
  );
  mesh.userData.originalSelectedSceneLights = [...selected.points, ...selected.spots].map(light => light.id);
  return selected;
}
