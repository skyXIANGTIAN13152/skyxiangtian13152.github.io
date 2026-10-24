// Start at original quality. Only sustained slow frames on a touch-only device
// budget distant reflections first, then request supported 2x MSAA.
export function isTouchOnlyRoomDevice(environment = globalThis) {
  return Boolean(environment.navigator?.maxTouchPoints > 0
    && environment.matchMedia?.('(pointer: coarse)').matches
    && environment.matchMedia?.('(hover: none)').matches);
}

export function createMobileRoomQuality(mobile = false) {
  let enabled = Boolean(mobile), tier = 0, samples = [], elapsed = 0;
  let slowWindows = 0, stableMs = 0, sinceChange = Infinity;
  function reset() { samples = [];elapsed = 0;slowWindows = 0;stableMs = 0; }
  return {
    get enabled() { return enabled; },
    get tier() { return tier; },
    // Existing resolution adaptation remains available after gentler options
    // have settled. Its upward recovery is never disabled by this policy.
    get allowResolutionDecrease() { return !enabled || (tier === 2 && sinceChange >= 4000); },
    configure(value) {
      value = Boolean(value);
      if (value === enabled) return false;
      enabled = value;tier = 0;sinceChange = Infinity;reset();return true;
    },
    reset,
    sample(milliseconds) {
      if (!enabled) return null;
      if (!Number.isFinite(milliseconds) || milliseconds < 4 || milliseconds > 250) { reset();return null; }
      samples.push(milliseconds);elapsed += milliseconds;sinceChange += milliseconds;
      if (elapsed < 2000 || samples.length < 30) return null;
      const ordered = samples.slice().sort((a,b) => a-b);
      const p75 = ordered[Math.floor(ordered.length * .75)];
      const p90 = ordered[Math.floor(ordered.length * .9)];
      if (p75 > 22) { slowWindows++;stableMs = 0; }
      else { slowWindows = 0;stableMs = p90 < 18 ? stableMs + elapsed : 0; }
      samples = [];elapsed = 0;
      let next = tier;
      if (slowWindows >= 2 && sinceChange >= 6000) next = Math.min(2,tier + 1);
      else if (stableMs >= 12000 && sinceChange >= 6000) next = Math.max(0,tier - 1);
      if (next === tier) return null;
      tier = next;sinceChange = 0;reset();return tier;
    },
  };
}
