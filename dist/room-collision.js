import { Vector3, Triangle, Ray } from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';

// The acceleration structure uses the game's actual collision triangles and
// instance transforms. It does not approximate furniture with invented boxes.
export function originalRoomMovement(meshes, bounds, floorY = 0, groundAt) {
  const tree = new Octree();
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const positions = mesh.geometry.attributes.position;
    const index = mesh.geometry.index;
    const count = index ? index.count : positions.count;
    for (let i = 0; i < count; i += 3) {
      const vertices = [0, 1, 2].map(j => new Vector3()
        .fromBufferAttribute(positions, index ? index.getX(i + j) : i + j)
        .applyMatrix4(mesh.matrixWorld));
      tree.addTriangle(new Triangle(...vertices));
      tree.addTriangle(new Triangle(vertices[2].clone(), vertices[1].clone(), vertices[0].clone()));
    }
  }
  tree.build();
  const capsule = new Capsule();
  const correction = new Vector3();
  const candidates = [];
  const visibilityRay = new Ray();
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const contacts = () => {
    candidates.length = 0;
    tree.getCapsuleTriangles(capsule, candidates);
    return candidates;
  };
  const penetrates = () => contacts().some(triangle => {
    const hit = tree.triangleCapsuleIntersect(capsule, triangle);
    return hit && hit.depth > 1e-5;
  });
  const move = (position,dx,dz,radius=.24) => {
    let x=position.x,z=position.z;
    let groundY;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/Math.min(.07,radius*.25)));
    for(let step=0;step<steps;step++) {
      const previousX=x,previousZ=z;
      x=clamp(x+dx/steps,bounds.minX+radius,bounds.maxX-radius);
      z=clamp(z+dz/steps,bounds.minZ+radius,bounds.maxZ-radius);
      capsule.radius=radius;
      capsule.start.set(x,floorY+radius+.02,z);
      capsule.end.set(x,floorY+1.6,z);
      for(let solve=0;solve<6;solve++) {
        let corrected=false;
        for(const triangle of contacts()) {
          const hit=tree.triangleCapsuleIntersect(capsule,triangle);
          if(!hit || hit.depth<=1e-5)continue;
          const horizontalSq=hit.normal.x**2+hit.normal.z**2;
          if(horizontalSq<1e-8)continue;
          // Resolve each contact in the walking plane. Octree's aggregate
          // result can first lift its temporary capsule over low furniture;
          // discarding that result's y component would allow walking through it.
          const horizontal=Math.sqrt(horizontalSq);
          const pointDistance=Math.hypot(capsule.start.x-hit.point.x,capsule.start.z-hit.point.z);
          let distance=(hit.depth+.001)/horizontal;
          if(pointDistance>1e-8) {
            // Edge contact: solve the sphere's horizontal cross-section exactly.
            // Dividing its radial penetration by a nearly vertical normal can
            // otherwise launch the player backward from a low furniture edge.
            const vertical=Math.max(capsule.start.y-hit.point.y,hit.point.y-capsule.end.y,0);
            distance=Math.sqrt(Math.max(0,radius**2-vertical**2))-pointDistance+.001;
          }
          correction.set(hit.normal.x,0,hit.normal.z).multiplyScalar(distance/horizontal);
          capsule.translate(correction);
          corrected=true;
        }
        if(!corrected)break;
      }
      x=capsule.start.x;z=capsule.start.z;
      // Never accept an unresolved contact or a correction that exits the room.
      // A horizontal surface cannot be escaped by raising this flat-floor player.
      if(x<bounds.minX+radius || x>bounds.maxX-radius ||
         z<bounds.minZ+radius || z>bounds.maxZ-radius || penetrates()) {
        x=previousX;z=previousZ;
      } else if(groundAt) {
        const candidateGround=groundAt(x,z);
        if(candidateGround==null) {x=previousX;z=previousZ;}
        else groundY=candidateGround;
      }
    }
    // The last accepted substep already queried this exact final point. Keep
    // its height through rejected later substeps; never return their surface.
    // If every substep was rejected, query the original point once, just as
    // the former caller did after movement. No cross-frame cache is needed.
    return groundAt ? {x,z,groundY:groundY ?? groundAt(x,z) ?? null} : {x,z};
  };
  // Camera clearance and label visibility use these same original triangles.
  // Shift the origin to the near plane: an earlier surface must not hide a
  // later valid hit, which would happen if only the nearest hit were filtered.
  move.raycast = (ray, near = 0, far = Infinity) => {
    if (far < near) return false;
    visibilityRay.origin.copy(ray.origin).addScaledVector(ray.direction, near);
    visibilityRay.direction.copy(ray.direction);
    const hit = tree.rayIntersect(visibilityRay);
    if (!hit) return false;
    const distance = hit.distance + near;
    return distance <= far ? distance : false;
  };
  return move;
}
