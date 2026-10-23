// World-space circle movement, with substeps so a slow frame cannot cross furniture.
export function moveCircle(position, dx, dz, obstacles, bounds, radius = .24) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .08));
  let x = position.x, z = position.z;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const collides = (px, pz) => obstacles.some(o => {
    const nx = clamp(px, o.x - o.halfX, o.x + o.halfX);
    const nz = clamp(pz, o.z - o.halfZ, o.z + o.halfZ);
    return (px - nx) ** 2 + (pz - nz) ** 2 < radius ** 2;
  });
  for (let i = 0; i < steps; i++) {
    const nx = clamp(x + dx / steps, bounds.minX + radius, bounds.maxX - radius);
    if (!collides(nx, z)) x = nx;
    const nz = clamp(z + dz / steps, bounds.minZ + radius, bounds.maxZ - radius);
    if (!collides(x, nz)) z = nz;
  }
  return {x, z};
}

export function cameraRelativeInput(x, z, yaw) {
  const magnitude = Math.min(1, Math.hypot(x, z));
  if (!magnitude) return {x: 0, z: 0};
  const angle = Math.atan2(x, z) + yaw;
  return {x: Math.sin(angle) * magnitude, z: Math.cos(angle) * magnitude};
}
