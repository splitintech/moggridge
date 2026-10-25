import React, { createRef } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createPolicyMotion, resolveMotionProps } from '../../src/web/compat';
afterEach(cleanup);
it('preserves the complete legacy props object when the migration family is off', () => {
 const props = { animate: { scale: [1, 1.2, 1] }, transition: { repeat: Infinity }, onClick: vi.fn() };
 expect(resolveMotionProps(props, { active: false, enabled: false, reducedMotion: true })).toBe(props);
});
it('retains semantic final geometry and collapses delayed variant keyframes on live policy changes', () => {
 const props = { animate: 'selected', variants: { selected: { x: [null, 24], opacity: [0, 1], transition: { x: { delay: 2 }, repeat: Infinity } } }, whileTap: { scale: .97 } };
 const next = resolveMotionProps(props, { enabled: true, reducedMotion: true });
 expect(next.animate).toBe('selected');
 expect(next.variants).toEqual({ selected: { x: 24, opacity: 1, transition: { type: 'tween', duration: 0, delay: 0, repeat: 0, repeatDelay: 0 } } });
 expect(next.whileTap).toBeUndefined();
});
it('preserves one DOM element, refs and callbacks across flag changes', () => {
 let active = false;
 const motion = createPolicyMotion(() => ({ active, enabled: true, reducedMotion: false }));
 const ref = createRef<HTMLButtonElement>(), click = vi.fn();
 const { rerender, getByRole } = render(<motion.button ref={ref} onClick={click}>Continue</motion.button>);
 const node = getByRole('button');
 active = true;
 rerender(<motion.button ref={ref} onClick={click}>Continue</motion.button>);
 expect(getByRole('button')).toBe(node); expect(ref.current).toBe(node);
 expect(node.getAttribute('data-motion-owner')).toBe('package-compat');
 fireEvent.click(node); expect(click).toHaveBeenCalledTimes(1);
 expect(node.parentElement?.children.length).toBe(1);
});

import { act, waitFor } from '@testing-library/react';
import { motionValue } from 'framer-motion';
import { createPolicyAnimate } from '../../src/web/compat';
it('lands imperative animation on live suppression and releases its subscription exactly once', async () => {
 let reducedMotion=false, update!:()=>void; const unsubscribe=vi.fn(), complete=vi.fn();
 const animate=createPolicyAnimate(()=>({enabled:true,reducedMotion}),{subscribe:listener=>{update=listener;return unsubscribe;}});
 const value=motionValue(0), controls=animate(value,100,{duration:30,onComplete:complete});
 reducedMotion=true; update();
 await waitFor(()=>expect(value.get()).toBe(100)); await controls.finished;
 expect(complete).toHaveBeenCalledOnce(); expect(unsubscribe).toHaveBeenCalledOnce(); controls.stop(); expect(unsubscribe).toHaveBeenCalledOnce();
});
it('keeps object-array animation overloads and property callbacks under immediate policy', async () => {
 const animate=createPolicyAnimate(()=>({enabled:false,reducedMotion:false}));
 const subjects=[{x:0},{x:10}], complete=vi.fn();
 const controls=animate(subjects,{x:50},{x:{duration:40,delay:20},onComplete:complete});
 await controls.finished; expect(subjects.map(item=>item.x)).toEqual([50,50]); expect(complete).toHaveBeenCalledOnce();
});
it('collapses sequence timings and preserves ordered final values', async () => {
 const animate=createPolicyAnimate(()=>({enabled:true,reducedMotion:true})), value=motionValue(0), complete=vi.fn();
 const controls=animate([[value,10,{duration:30}],[value,20,{at:40,duration:30}]],{onComplete:complete});
 await controls.finished; expect(value.get()).toBe(20); expect(complete).toHaveBeenCalledOnce();
});
it('updates a mounted adapter during reduced motion without replacing the element', async () => {
 let reducedMotion=false;
 const motion=createPolicyMotion(()=>({enabled:true,reducedMotion}));
 const view=render(<motion.div data-testid="surface" animate={{opacity:1}} initial={{opacity:0}} transition={{duration:30}}/>);
 const node=view.getByTestId('surface'); reducedMotion=true;
 view.rerender(<motion.div data-testid="surface" animate={{opacity:1}} initial={{opacity:0}} transition={{duration:30}}/>);
 await waitFor(()=>expect(node.style.opacity).toBe('1')); expect(view.getByTestId('surface')).toBe(node);
});
