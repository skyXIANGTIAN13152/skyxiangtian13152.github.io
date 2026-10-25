const femaleSteps = Object.freeze([0.1,0.6998,1.3003,1.9,2.4998,3.1003,3.7,4.2998,4.9003,5.5,6.0998,6.7003]);
const common = { idleClip: 'hall_idle_2', walkClip: 'hall_walk_2', scale: [-0.1,0.1,0.1] };
export const VISITOR_AVATARS = Object.freeze({
  male: Object.freeze({ ...common, id:'male', form:'default',
    url:new URL('./assets/visitors/male/avatar.glb',import.meta.url).href,
    lantern:{bone:'bone003',position:[0.532,-0.0321,0.0264],glassMaterial:'Original material slot 4'},
  }),
  female: Object.freeze({ ...common, id:'female', form:'hooded',
    url:new URL('./assets/visitors/female/avatar.glb',import.meta.url).href,
    footstepTimes:femaleSteps,
  }),
  femaleHoodless: Object.freeze({ ...common, id:'female', form:'hoodless',
    url:new URL('./assets/visitors/female/avatar-hoodless.glb',import.meta.url).href,
    footstepTimes:femaleSteps,
  }),
});
export function visitorDefinition(id, form) {
  if (id === 'male' && (!form || form === 'default')) return VISITOR_AVATARS.male;
  if (id === 'female' && (!form || form === 'hooded')) return VISITOR_AVATARS.female;
  if (id === 'female' && form === 'hoodless') return VISITOR_AVATARS.femaleHoodless;
  throw new RangeError('Unknown visitor appearance.');
}
