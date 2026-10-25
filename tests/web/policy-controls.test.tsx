import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { motion, useAnimationControls } from 'framer-motion';
import { createPolicyAnimationControls } from '../../src/web/compat';
type AnimationControls = ReturnType<typeof useAnimationControls>;
afterEach(cleanup);

it('lands a long control animation on live reduced motion, preserves node and control identity, completes once', async () => {
 let reducedMotion=false, controls!:AnimationControls;
 const useControls=createPolicyAnimationControls(()=>({active:true,enabled:true,reducedMotion}));
 const complete=vi.fn();
 function Surface(){controls=useControls();return <motion.div data-testid="surface" initial={{opacity:0}} animate={controls} onAnimationComplete={complete}/>;}
 const view=render(<Surface/>), node=view.getByTestId('surface'), original=controls;
 let finished!:Promise<void>;
 act(()=>{finished=controls.start({opacity:[0,.4,1],transition:{duration:30,delay:10}});});
 reducedMotion=true;view.rerender(<Surface/>);
 await act(async()=>{await finished;});
 await waitFor(()=>expect(node.style.opacity).toBe('1'));
 expect(controls).toBe(original);expect(view.getByTestId('surface')).toBe(node);expect(complete).toHaveBeenCalledOnce();
});
it('resolves stopped and superseded waiters and does not replay cancelled targets', async () => {
 let controls!:AnimationControls;
 const useControls=createPolicyAnimationControls(()=>({active:true,enabled:true,reducedMotion:false}));
 function Surface(){controls=useControls();return <motion.div data-testid="surface" initial={{opacity:0}} animate={controls}/>;}
 const view=render(<Surface/>);
 let first!:Promise<void>, second!:Promise<void>;
 act(()=>{first=controls.start({opacity:1},{duration:30});second=controls.start({opacity:.5},{duration:30});controls.stop();});
 await act(async()=>{await Promise.all([first,second]);});
 const opacity=view.getByTestId('surface').style.opacity;
 await new Promise(resolve=>setTimeout(resolve,30));expect(view.getByTestId('surface').style.opacity).toBe(opacity);
});
it('supports variant labels and settles awaited work when the hook unmounts', async () => {
 let enabled=true,controls!:AnimationControls;
 const useControls=createPolicyAnimationControls(()=>({active:true,enabled,reducedMotion:false}));
 function Surface(){controls=useControls();return <motion.div data-testid="surface" initial={{opacity:0}} animate={controls} variants={{visible:{opacity:1,transition:{duration:30,delay:10}}}}/>;}
 const view=render(<Surface/>);let finished!:Promise<void>;
 act(()=>{finished=controls.start('visible');});enabled=false;view.rerender(<Surface/>);
 await act(async()=>{await finished;});await waitFor(()=>expect(view.getByTestId('surface').style.opacity).toBe('1'));
 enabled=true;view.rerender(<Surface/>);act(()=>{finished=controls.start({opacity:0},{duration:30});});view.unmount();await finished;
});
it('keeps flag-off starts governed by the original engine even under reduced motion', async () => {
 let controls!:AnimationControls;
 const useControls=createPolicyAnimationControls(()=>({active:false,enabled:false,reducedMotion:true}));
 function Surface(){controls=useControls();return <motion.div data-testid="surface" initial={{opacity:0}} animate={controls}/>;}
 const view=render(<Surface/>);act(()=>{void controls.start({opacity:1},{duration:30});});
 expect(Number(view.getByTestId('surface').style.opacity)).toBeLessThan(1);act(()=>controls.stop());
});
