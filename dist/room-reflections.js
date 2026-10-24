import {Box3,Matrix4,Quaternion,Vector3} from 'three';

/** Keep the source Reflector shader, resolution, targets and recursive rendering. */
export function createReflectionScheduler(mirrors = [],{
  intervalMs = 1000 / 30, nearDistance = 3.25, largeArea = .065,
  movementThreshold = .025, turningThreshold = .012,
} = {}) {
  // Two 60 Hz samples can total 33.2 ms. A half-millisecond allowance avoids
  // repeatedly waiting for a third frame while keeping the 30 Hz budget.
  const sampleToleranceMs=Math.min(.5,intervalMs*.03);
  let camera=null,previousCamera=null,now=0,frame=0,tier=0,enabled=false,moving=true,disposed=false;
  const position=new Vector3(),previousPosition=new Vector3();
  const orientation=new Quaternion(),previousOrientation=new Quaternion(),previousProjection=new Matrix4();
  const worldBox=new Box3(),corner=new Vector3();
  const counters={mainRefreshes:0,mainSkips:0,secondaryRefreshes:0,invalidations:0};
  const states=mirrors.filter(mirror=>typeof mirror?.onBeforeRender==='function').map(mirror=>({
    mirror,original:mirror.onBeforeRender,wrapper:null,valid:false,lastRefresh:-Infinity,lastSeen:-Infinity,
    worldMatrix:new Matrix4(),refreshes:0,skips:0,
  }));

  function invalidate() {
    for (const state of states) {state.valid=false;state.lastSeen=-Infinity;state.lastRefresh=-Infinity;}
    previousCamera=null;counters.invalidations++;
  }

  // Project the original primitive bounds, not a substitute mirror shape. Near
  // plane intersections are treated as large rather than risking stale pixels.
  function isSmallAndDistant(mirror,view) {
    const box=mirror.geometry?.boundingBox;
    if (!box || box.isEmpty()) return false;
    worldBox.copy(box).applyMatrix4(mirror.matrixWorld);
    if (worldBox.distanceToPoint(position) <= nearDistance) return false;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (let index=0;index<8;index++) {
      corner.set(index&1?box.max.x:box.min.x,index&2?box.max.y:box.min.y,index&4?box.max.z:box.min.z)
        .applyMatrix4(mirror.matrixWorld).applyMatrix4(view.matrixWorldInverse);
      if (corner.z >= -view.near) return false;
      corner.applyMatrix4(view.projectionMatrix);
      if (!Number.isFinite(corner.x) || !Number.isFinite(corner.y)) return false;
      minX=Math.min(minX,corner.x);maxX=Math.max(maxX,corner.x);
      minY=Math.min(minY,corner.y);maxY=Math.max(maxY,corner.y);
    }
    const width=Math.max(0,Math.min(1,maxX)-Math.max(-1,minX));
    const height=Math.max(0,Math.min(1,maxY)-Math.max(-1,minY));
    return width*height*.25 < largeArea;
  }

  for (const state of states) {
    state.wrapper=function(renderer,scene,view,...rest) {
      const isMain=view===camera;
      if (!isMain) {
        // The vendor shares one RTT AND textureMatrix between every camera.
        // A recursive render overwrites both: do not restore only the matrix or
        // later reuse this image as if it still belonged to the main camera.
        state.valid=false;
        counters.secondaryRefreshes++;
        return state.original.call(this,renderer,scene,view,...rest);
      }
      const firstVisible=state.lastSeen < frame-1;
      state.lastSeen=frame;
      const canReuse=enabled && tier>=1 && !moving && state.valid && !firstVisible
        && !this.forceUpdate && state.worldMatrix.equals(this.matrixWorld)
        && now>=state.lastRefresh && now-state.lastRefresh < intervalMs-sampleToleranceMs
        && isSmallAndDistant(this,view);
      if (canReuse) {state.skips++;counters.mainSkips++;return;}
      // Mark invalid until the original renderer returns successfully.
      state.valid=false;
      const result=state.original.call(this,renderer,scene,view,...rest);
      state.valid=true;state.lastRefresh=now;state.worldMatrix.copy(this.matrixWorld);
      state.refreshes++;counters.mainRefreshes++;
      return result;
    };
    state.mirror.onBeforeRender=state.wrapper;
  }

  function prepare(view,time,pressureTier=0,options={}) {
    if (disposed) return;
    if (view!==previousCamera) invalidate();
    camera=view;now=Number.isFinite(time)?time:(globalThis.performance?.now?.()??Date.now());
    tier=Number(pressureTier)||0;enabled=options.enabled===true;frame++;
    if (!camera) {moving=true;return;}
    camera.getWorldPosition(position);camera.getWorldQuaternion(orientation);
    moving=previousCamera!==camera || position.distanceTo(previousPosition)>movementThreshold
      || orientation.angleTo(previousOrientation)>turningThreshold
      || !camera.projectionMatrix.equals(previousProjection);
    previousPosition.copy(position);previousOrientation.copy(orientation);previousProjection.copy(camera.projectionMatrix);previousCamera=camera;
  }

  function dispose() {
    if (disposed) return;
    disposed=true;
    for (const state of states) if (state.mirror.onBeforeRender===state.wrapper) state.mirror.onBeforeRender=state.original;
  }

  return {prepare,invalidate,dispose,get stats() {
    return {...counters,enabled:enabled&&tier>=1,tier,frames:frame,
      mirrors:states.map(state=>({name:state.mirror.name,refreshes:state.refreshes,skips:state.skips}))};
  }};
}
