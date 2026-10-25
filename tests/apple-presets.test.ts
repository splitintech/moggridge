import { expect, it } from 'vitest';
import { createApplePresets, appleExportNames, APPLE_SPRINGS, APPLE_DURATIONS } from '../src/presets/apple';
it('preserves every one of the 84 names and original tuning',()=>{
 expect(appleExportNames).toHaveLength(84); expect(Object.keys(createApplePresets())).toEqual([...appleExportNames]);
 expect(APPLE_SPRINGS.snappy).toEqual({type:'spring',stiffness:500,damping:30,mass:.5}); expect(APPLE_DURATIONS.fast).toBe(.2);
});
it('recomputes policy without module reload, collapsing keyframes and looping transitions',()=>{
 const normal=createApplePresets({reducedMotion:false}); const reduced=createApplePresets({reducedMotion:true});
 expect(normal.shouldAnimate).toBe(true); expect(reduced.shouldAnimate).toBe(false); expect(reduced.appleVoiceRecordingPulse.scale).toBe(1);
 expect(reduced.appleVoiceRecordingPulse.transition).toEqual({duration:0,delay:0,repeat:0});
 expect(reduced.appleDrawerVariants('left').visible).toMatchObject({x:0,y:0,opacity:1,transition:{duration:0}});
 expect(reduced.APPLE_EASING.easeOut).toEqual([.25,.46,.45,.94]); expect(createApplePresets({enabled:false}).shouldAnimate).toBe(false);
});
