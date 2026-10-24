// The original room's lowest roof vertex is y=3.4153. At the highest
// walkable floor, pitch .34 places the 5.8-unit camera at y=3.2877;
// the .05 near plane and its corners remain below that roof. Keep the
// established .32 opening angle and .15 lower limit unchanged.
export const ROOM_CAMERA_PITCH = Object.freeze({ min: 0.15, max: 0.34, default: 0.32 });

export function clampRoomCameraPitch(value = ROOM_CAMERA_PITCH.default) {
  const pitch = Number.isFinite(value) ? value : ROOM_CAMERA_PITCH.default;
  return Math.max(ROOM_CAMERA_PITCH.min, Math.min(ROOM_CAMERA_PITCH.max, pitch));
}
