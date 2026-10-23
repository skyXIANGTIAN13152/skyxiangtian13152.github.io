import { crossedFootsteps } from './detective-footsteps.js';

/** Blend the two original clips without resetting a pose during an interrupted fade. */
export function createDetectiveLocomotion(mixer, idleClip, walkClip, {
  nominalWalkSpeed = 1.1,
  onFootstep = () => {},
} = {}) {
  const idle = mixer.clipAction(idleClip).play();
  const walk = mixer.clipAction(walkClip).play();
  walk.setEffectiveWeight(0).setEffectiveTimeScale(0);
  mixer.update(0);
  let walkWeight = 0;
  let cadence = 1;

  function update(delta, speed = 0, footstepsAllowed = false) {
    const dt = Number.isFinite(delta) ? Math.min(0.1, Math.max(0, delta)) : 0;
    const moving = Number.isFinite(speed) && Math.abs(speed) > 0.025;
    const target = moving ? 1 : 0;
    const step = dt / 0.24;
    // crossFadeFrom starts fresh 0/1 fades; reversing it part way through jumps
    // to a different pose. Continue from the current weight and keep the sum 1.
    walkWeight += Math.max(-step, Math.min(step, target - walkWeight));
    if (moving) cadence = Math.max(0.3, Math.min(2, Math.abs(speed) / nominalWalkSpeed));
    walk.setEffectiveWeight(walkWeight);
    // Retain the last real cadence while fading out, then park the clip. No
    // slow-motion extra step and no phase reset when movement resumes mid-fade.
    walk.setEffectiveTimeScale(walkWeight > 0 ? cadence : 0);
    idle.setEffectiveWeight(1 - walkWeight);
    // hall_idle_2 is the original breathing/lantern idle, not a frozen pose.
    // Keep its clock running during both standing and locomotion blends.
    idle.setEffectiveTimeScale(1);
    const previousWalkTime = walk.time;
    mixer.update(dt);
    if (moving && footstepsAllowed && dt > 0) {
      for (const eventTime of crossedFootsteps(previousWalkTime, walk.time, walkClip.duration)) {
        onFootstep({ eventTime, phase: walk.time });
      }
    }
  }

  return { update, idle, walk };
}
