// Preserve source assets and full quality on fast devices. A sustained GPU
// slowdown lowers only the offscreen render size, with hysteresis to avoid
// reallocating render targets or pumping image sharpness on isolated hitches.
export function createRoomResolution(maximum = 2) {
  let maximumRatio = maximum, ratio = maximum, samples = [], elapsed = 0, stable = 0;
  const minimum = () => Math.min(maximumRatio, 1);
  const reset = () => { samples = []; elapsed = 0; stable = 0; };
  return {
    get ratio() { return ratio; },
    configure(value) {
      if (value !== maximumRatio) { ratio *= value / maximumRatio; maximumRatio = value; }
      ratio = Math.max(minimum(), Math.min(maximumRatio, ratio));
      reset();
      return ratio;
    },
    reset,
    sample(milliseconds) {
      if (!Number.isFinite(milliseconds) || milliseconds < 4 || milliseconds > 250) { reset(); return null; }
      samples.push(milliseconds); elapsed += milliseconds;
      if (elapsed < 2000 || samples.length < 30) return null;
      const ordered = samples.slice().sort((a,b) => a-b);
      const p75 = ordered[Math.floor(ordered.length * .75)];
      const p90 = ordered[Math.floor(ordered.length * .9)];
      let next = ratio;
      if (p75 > 22) { next = Math.max(minimum(), ratio - .2); stable = 0; }
      else if (p90 < 18) { stable += elapsed; if (stable >= 10000) { next = Math.min(maximumRatio, ratio + .1); stable = 0; } }
      else stable = 0;
      samples = []; elapsed = 0;
      next = Math.round(next * 1000) / 1000;
      if (Math.abs(next - ratio) < .001) return null;
      ratio = next;
      return ratio;
    },
  };
}
