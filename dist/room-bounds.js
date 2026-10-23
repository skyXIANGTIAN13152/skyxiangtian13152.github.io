import {Box3, Sphere, Vector3} from './vendor/three.module.js';

// glTF primitives share the source model's complete vertex buffer. Only their
// own indices are drawn. Tight conservative bounds let Three skip distant
// primitives in the main, mirror and six lantern-shadow views without any LOD.
export function computeRoomBounds(geometry) {
  const position=geometry.getAttribute('position'), index=geometry.index;
  const box=new Box3(), point=new Vector3();
  for(let i=0;i<(index?index.count:position.count);i++) {
    box.expandByPoint(point.fromBufferAttribute(position,index?index.getX(i):i));
  }
  geometry.boundingBox=box;
  geometry.boundingSphere=box.getBoundingSphere(new Sphere());
}
