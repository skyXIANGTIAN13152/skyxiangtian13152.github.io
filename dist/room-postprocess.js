import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  NoBlending,
  NoColorSpace,
  NoToneMapping,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  UnsignedByteType,
  Vector2,
  Vector4,
  WebGLRenderTarget,
} from './vendor/three.module.js';
import { FullScreenQuad } from './vendor/three-addons/postprocessing/Pass.js';

function supportedTargetSamples(renderer, type) {
  // MAX_SAMPLES alone is not sufficient: color and depth attachments must
  // advertise the same sample count for this framebuffer's actual formats.
  // These formats match the bundled Three renderer for this target: RGBA
  // linear half-float/byte color, no depth texture, and no stencil buffer.
  try {
    const gl = renderer.getContext?.();
    if (gl?.isContextLost?.()) return null;
    if (typeof gl?.getInternalformatParameter !== 'function') return [];
    const colorFormat = type === HalfFloatType ? gl.RGBA16F : gl.RGBA8;
    if (colorFormat === undefined || gl.DEPTH_COMPONENT24 === undefined) return [];
    const color = gl.getInternalformatParameter(gl.RENDERBUFFER, colorFormat, gl.SAMPLES);
    const depth = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, gl.SAMPLES);
    if (!color || !depth) return [];
    const limit = Math.min(4, Math.max(0, Number(renderer.capabilities.maxSamples) || 0));
    const depthCounts = new Set(depth);
    return [...new Set(color)].filter(count => Number.isInteger(count) && count > 0
      && count <= limit && depthCounts.has(count)).sort((a, b) => b - a);
  } catch {
    // No speculative count: an unsupported RGBA16F multisample target can
    // produce an incomplete framebuffer instead of a graceful fallback.
    return [];
  }
}

// Original dm65_main1.postprocess -> lut/zhujiemian.bmp.
// The lookup below ports shader/posteffects/color_grading.hlsl's 16^3
// UnwrappedTexture3DSample. No exposure, tint, vignette or filmic curve is added.
export async function createOriginalLobbyPostprocess(renderer, {
  lutUrl = new URL('./assets/original/postprocess/original-lobby-lut.png', import.meta.url).href,
} = {}) {
  if (renderer.outputColorSpace !== SRGBColorSpace || renderer.toneMapping !== NoToneMapping) {
    throw new Error('Original lobby LUT requires SRGBColorSpace output and NoToneMapping.');
  }

  const lut = await new TextureLoader().loadAsync(lutUrl);
  if (lut.image.width !== 256 || lut.image.height !== 16) {
    lut.dispose();
    throw new Error('Original lobby LUT must be the 256 × 16 source texture.');
  }
  // PNG row zero is G=0. This is a numeric gamma-space lookup table, not an
  // albedo: neither vertical flipping nor automatic sRGB decoding is wanted.
  lut.flipY = false;
  lut.colorSpace = NoColorSpace;
  lut.minFilter = lut.magFilter = LinearFilter;
  lut.wrapS = lut.wrapT = ClampToEdgeWrapping;
  lut.generateMipmaps = false;
  lut.needsUpdate = true;

  const size = renderer.getDrawingBufferSize(new Vector2());
  const sceneType = renderer.extensions.has('EXT_color_buffer_float') ? HalfFloatType : UnsignedByteType;
  let sampleOptions = supportedTargetSamples(renderer, sceneType) || [];
  const target = new WebGLRenderTarget(size.x, size.y, {
    // Half float preserves the dark room's gradients before display encoding.
    type: sceneType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
    samples: sampleOptions[0] || 0,
    colorSpace: LinearSRGBColorSpace,
  });
  target.texture.name = 'OriginalLobby.LinearScene';
  target.texture.generateMipmaps = false;

  const material = new ShaderMaterial({
    name: 'OriginalLobby.SourceLUT',
    uniforms: {
      sceneTexture: { value: target.texture },
      sourceLUT: { value: lut },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D sceneTexture;
      uniform sampler2D sourceLUT;
      varying vec2 vUv;

      vec3 originalColorLookup(vec3 gammaColor) {
        // Original LUTSize=16, UVW=C*(15/16)+(.5/16).
        vec3 uvw = clamp(gammaColor, 0.0, 1.0) * (15.0 / 16.0) + (0.5 / 16.0);
        float slice = floor(uvw.z * 16.0 - 0.5);
        float blend = uvw.z * 16.0 - 0.5 - slice;
        vec2 uv = vec2((uvw.x + slice) / 16.0, uvw.y);
        vec3 first = texture2D(sourceLUT, uv).rgb;
        vec3 second = texture2D(sourceLUT, uv + vec2(1.0 / 16.0, 0.0)).rgb;
        return mix(first, second, blend);
      }

      void main() {
        vec4 linearScene = texture2D(sceneTexture, vUv);
        vec3 gammaScene = sRGBTransferOETF(vec4(max(linearScene.rgb, 0.0), 1.0)).rgb;
        vec3 gradedGamma = originalColorLookup(gammaScene);
        // Return to Three's linear working space, then let its final output
        // conversion encode exactly once. The source LUT remains gamma data.
        gl_FragColor = sRGBTransferEOTF(vec4(gradedGamma, linearScene.a));
        #include <colorspace_fragment>
      }
    `,
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
    toneMapped: false,
  });
  const quad = new FullScreenQuad(material);
  let disposed = false;

  function applySamples(samples) {
    // Changes are requested between frames. Do not invalidate a framebuffer
    // while a caller is compiling or rendering into it.
    if (disposed || samples === target.samples || renderer.getRenderTarget() === target) return false;
    // Three releases the multisampled framebuffer, color/depth renderbuffers
    // and GPU texture on this event, then recreates them on the next render.
    // Keep the JS target/texture, dimensions and shader uniform identity intact.
    target.dispose();
    target.samples = samples;
    return true;
  }

  function setSamples(samples) {
    if (disposed || !sampleOptions.includes(samples) || renderer.getContext?.()?.isContextLost?.()) return false;
    return applySamples(samples);
  }

  function refreshSampleSupport() {
    if (disposed) return false;
    const supported = supportedTargetSamples(renderer, target.texture.type);
    if (supported === null) return false;
    sampleOptions = supported;
    // Keep the selected supported level across preparation. Only a hardware
    // capability change may fall back to zero; it is never a dynamic option.
    return sampleOptions.includes(target.samples) ? false : applySamples(sampleOptions[0] || 0);
  }
  renderer.domElement?.addEventListener('webglcontextrestored', refreshSampleSupport);

  function resize() {
    if (disposed) return;
    renderer.getDrawingBufferSize(size);
    if (target.width !== size.x || target.height !== size.y) {
      target.setSize(size.x, size.y);
    }
  }

  function render(scene, camera) {
    if (disposed) return;
    resize();
    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    const previousScissorTest = renderer.getScissorTest();
    try {
      renderer.autoClear = true;
      renderer.setScissorTest(false);
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(previousTarget);
      quad.render(renderer);
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.autoClear = previousAutoClear;
      renderer.setScissorTest(previousScissorTest);
    }
  }

  async function warmup(scene,camera,{compile,yieldTask = () => Promise.resolve(),signal} = {}) {
    if (disposed || signal?.aborted) return {scene:{status:'skipped'},quad:{status:'skipped'}};
    refreshSampleSupport();
    if (typeof compile !== 'function') return {scene:{status:'unavailable'},quad:{status:'unavailable'}};
    resize();
    function atTarget(destination,start) {
      const previousTarget = renderer.getRenderTarget();
      const previousFace = renderer.getActiveCubeFace();
      const previousLevel = renderer.getActiveMipmapLevel();
      const previousViewport = renderer.getViewport(new Vector4());
      const previousScissor = renderer.getScissor(new Vector4());
      const previousScissorTest = renderer.getScissorTest();
      try {
        renderer.setRenderTarget(destination);
        // start must begin compilation synchronously. Restore all framebuffer
        // state before awaiting GPU work, so input/other rendering can continue.
        return start();
      } finally {
        renderer.setRenderTarget(previousTarget,previousFace,previousLevel);
        renderer.setViewport(previousViewport);renderer.setScissor(previousScissor);
        renderer.setScissorTest(previousScissorTest);
      }
    }
    // The room uses linear output into this exact target. Compiling it for the
    // screen would create an unused sRGB program variant instead.
    const sceneResult = await atTarget(target,() => compile(scene,camera));
    await yieldTask();
    if (disposed || signal?.aborted) return {scene:sceneResult,quad:{status:'skipped'}};
    const quadResult = await atTarget(null,() => {
      let pending;
      // FullScreenQuad owns its camera. This adapter compiles its real mesh and
      // camera without drawing or reading private FullScreenQuad properties.
      quad.render({render(mesh,quadCamera) { pending = compile(mesh,quadCamera); }});
      return pending;
    });
    return {scene:sceneResult,quad:quadResult};
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.domElement?.removeEventListener('webglcontextrestored', refreshSampleSupport);
    target.dispose();
    lut.dispose();
    material.dispose();
    quad.dispose();
  }

  return {
    render, resize, dispose, warmup, refreshSampleSupport, setSamples,
    getSamples: () => target.samples,
    getSampleOptions: () => disposed ? [] : [...sampleOptions],
    getWarmupTextures: () => disposed ? [] : [lut],
  };
}
