// Preparation only: never render a frame, change materials or lower quality.
const clock = () => globalThis.performance?.now?.() ?? Date.now();
const yieldToBrowser = () => globalThis.scheduler?.yield
  ? globalThis.scheduler.yield()
  : new Promise(resolve => setTimeout(resolve, 0));

function imageIsReady(image) {
  if (!image || image.complete === false) return false;
  if (image.isTexture) return imageIsReady(image.image);
  if (typeof image.naturalWidth === 'number' && image.naturalWidth <= 0) return false;
  if (!(image.width > 0 && image.height > 0)) return false;
  if ('data' in image && (!image.data || image.data.byteLength === 0)) return false;
  return true;
}

/** Render targets and videos have their own lifecycle; do not upload them here. */
export function isWarmupTextureReady(texture) {
  if (!texture?.isTexture || texture.isRenderTargetTexture || texture.isDepthTexture
    || texture.isVideoTexture || texture.isVideoFrameTexture || texture.isFramebufferTexture
    || texture.isExternalTexture || texture.source?.dataReady === false || !(texture.version > 0)) return false;
  const image = texture.image;
  if (texture.isCubeTexture) return Array.isArray(image) && image.length === 6 && image.every(imageIsReady);
  if (!imageIsReady(image)) return false;
  if (texture.isData3DTexture || texture.isDataArrayTexture) return image.depth > 0;
  if (texture.isCompressedTexture || texture.isCompressedArrayTexture) {
    return Array.isArray(texture.mipmaps) && texture.mipmaps.length > 0
      && texture.mipmaps.every(level => level?.data?.byteLength > 0);
  }
  return true;
}

/** Include off-camera objects, but respect invisible ancestors and materials. */
export function collectRoomWarmupTextures(scene, extras = []) {
  const textures = new Set(), materials = new Set(), visited = new Set();
  function uniformValue(value) {
    if (!value || typeof value !== 'object') return;
    if (value.isTexture) { textures.add(value);return; }
    if (visited.has(value) || ArrayBuffer.isView(value)) return;
    visited.add(value);
    if (Array.isArray(value)) value.forEach(uniformValue);
    else if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
      Object.values(value).forEach(uniformValue);
    }
  }
  scene?.traverseVisible?.(object => {
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material || material.visible === false || materials.has(material)) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      for (const uniform of Object.values(material.uniforms || {})) uniformValue(uniform?.value);
    }
  });
  for (const value of [scene?.background,scene?.environment,...extras]) if (value?.isTexture) textures.add(value);
  return [...textures];
}

// compileAsync invokes compile synchronously in the bundled renderer, then only
// polls program readiness. Call it before restoring the current render target.
export function compileRoomShaders(renderer, scene, camera, {timeoutMs = 8000,signal} = {}) {
  if (signal?.aborted) return Promise.resolve({status:'aborted',method:'none'});
  const method = typeof renderer?.compileAsync === 'function' ? 'async'
    : typeof renderer?.compile === 'function' ? 'sync' : 'none';
  if (method === 'none') return Promise.resolve({status:'unavailable',method});
  let pending;
  try { pending = method === 'async' ? renderer.compileAsync(scene,camera) : renderer.compile(scene,camera); }
  catch (error) { return Promise.resolve({status:'failed',method,error:String(error?.message || error)}); }
  return new Promise(resolve => {
    let complete = false;
    const finish = result => {
      if (complete) return;
      complete = true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
      resolve({method,...result});
    };
    const abort = () => finish({status:'aborted'});
    const timer = setTimeout(() => finish({status:'timeout'}),Math.max(1,Number(timeoutMs) || 8000));
    signal?.addEventListener('abort',abort,{once:true});
    if (signal?.aborted) abort();
    Promise.resolve(pending).then(() => finish({status:'compiled'}),error => finish({status:'failed',error:String(error?.message || error)}));
  });
}

/** Call after the scene, lighting, fog and initial animated pose are configured. */
export async function warmRoomResources(renderer,scene,camera,{
  postprocess, texturesPerBatch = 3, batchBudgetMs = 6, compileTimeoutMs = 8000,
  yieldTask = yieldToBrowser, signal,
} = {}) {
  const report = {textures:0,uploaded:0,skipped:0,failed:0,batches:0,scene:null,quad:null,aborted:false};
  const pause = async () => {
    if (signal?.aborted) return;
    await new Promise((resolve,reject) => {
      let complete = false;
      const finish = (settle,value) => {
        if (complete) return;
        complete = true;signal?.removeEventListener('abort',abort);settle(value);
      };
      const abort = () => finish(resolve);
      signal?.addEventListener('abort',abort,{once:true});
      Promise.resolve().then(() => signal?.aborted ? undefined : yieldTask())
        .then(() => finish(resolve),error => finish(reject,error));
    });
    report.batches++;
  };
  const batchSize = Math.max(1,Math.floor(Number(texturesPerBatch) || 3));
  const budget = Math.max(1,Number(batchBudgetMs) || 6);
  try {
    if (signal?.aborted) { report.aborted = true;return report; }
    const textures = collectRoomWarmupTextures(scene,postprocess?.getWarmupTextures?.() || []);
    report.textures = textures.length;
    await pause();
    let batchCount = 0,batchStart = clock();
    for (let index = 0;index < textures.length;index++) {
      if (signal?.aborted) { report.aborted = true;return report; }
      const texture = textures[index];
      if (!isWarmupTextureReady(texture) || typeof renderer?.initTexture !== 'function') report.skipped++;
      else {
        try { renderer.initTexture(texture);report.uploaded++; }
        catch { report.failed++; }
        batchCount++;
      }
      if (index < textures.length - 1 && (batchCount >= batchSize || clock() - batchStart >= budget)) {
        await pause();batchCount = 0;batchStart = clock();
      }
    }
    await pause();
    if (signal?.aborted) { report.aborted = true;return report; }
    const compile = (scope,view) => compileRoomShaders(renderer,scope,view,{timeoutMs:compileTimeoutMs,signal});
    if (typeof postprocess?.warmup === 'function') {
      const result = await postprocess.warmup(scene,camera,{compile,yieldTask:pause,signal});
      report.scene = result?.scene || null;report.quad = result?.quad || null;
    } else report.scene = await compile(scene,camera);
    report.aborted = Boolean(signal?.aborted);
  } catch (error) {
    // Preparation is optional. The regular first render remains the fallback.
    report.error = String(error?.message || error);
  }
  return report;
}
