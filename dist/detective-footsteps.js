// Original Audio3D notifications in hall_walk_2.animation, in clip seconds.
// The source does not distinguish left/right samples; every event selects the
// same detective footstep event using the original floor-material switch.
export const DETECTIVE_FOOTSTEP_TIMES = Object.freeze([
  0.4049000144004822, 1.0219999551773071, 1.63510000705719,
  2.2430999279022217, 2.8208999633789062, 3.4198999404907227,
]);

/** Return original events crossed by one forward animation update, including a wrap. */
export function crossedFootsteps(previous, current, duration) {
  if (![previous, current, duration].every(Number.isFinite) || duration <= 0 || previous === current) return [];
  if (current >= previous) return DETECTIVE_FOOTSTEP_TIMES.filter(time => time > previous && time <= current);
  return [
    ...DETECTIVE_FOOTSTEP_TIMES.filter(time => time > previous && time < duration),
    ...DETECTIVE_FOOTSTEP_TIMES.filter(time => time <= current),
  ];
}
