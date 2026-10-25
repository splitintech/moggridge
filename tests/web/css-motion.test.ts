import { afterEach, expect, it, vi } from 'vitest';
import { bindCssMotion } from '../../src/web/css-motion';
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });
function fixture(iterations = 1) {
  const owner = document.createElement('div'); owner.dataset.motionFamily = 'layout'; document.body.append(owner);
  let resolve!: () => void;
  const timing = { duration: 400, delay: 100, iterations };
  const animation = { animationName:'enter', effect: { target: owner, getTiming: () => timing, updateTiming: vi.fn((next) => Object.assign(timing,next)) },
    finished: new Promise<void>(done => { resolve = done; }), finish: vi.fn(() => resolve()), cancel: vi.fn() };
  Object.defineProperty(document,'getAnimations',{ configurable:true,value:vi.fn(()=>[animation]) });
  return { owner, animation, timing, resolve };
}
it('lands a running finite CSS effect on a live policy update without changing its real end time or repeating events', async () => {
  const { animation,timing } = fixture(); let reduced = false; let update!:()=>void; const unsubscribe=vi.fn(), events=vi.fn();
  const binding=bindCssMotion(document,{policy:()=>({enabled:true,reducedMotion:reduced}),diagnostics:events,subscribe:listener=>{update=listener;return unsubscribe;}});
  reduced=true; update(); binding.update(); await Promise.resolve(); binding.update();
  expect(animation.finish).toHaveBeenCalledOnce(); expect(timing).toEqual({duration:400,delay:100,iterations:1});
  expect(events.mock.calls.map(([e])=>e.phase)).toEqual(['start','complete']);
  binding.dispose(); binding.dispose(); expect(unsubscribe).toHaveBeenCalledOnce(); expect(animation.cancel).not.toHaveBeenCalled();
});
it('bounds infinite CSS loops once and disposal never resurrects them', () => {
  const {animation,timing}=fixture(Infinity); const binding=bindCssMotion(document,{policy:()=>({enabled:false,reducedMotion:false})});
  expect(timing.iterations).toBe(1); expect(animation.finish).toHaveBeenCalledOnce(); binding.dispose(); expect(timing.iterations).toBe(1);
});
it('cancels only ownership diagnostics when targets leave scope and ignores JS animations', async () => {
  const {owner,animation,resolve}=fixture(); const events=vi.fn();
  const binding=bindCssMotion(document,{policy:()=>({enabled:true,reducedMotion:false}),diagnostics:events});
  owner.remove(); binding.update(); resolve(); await Promise.resolve();
  expect(events.mock.calls.map(([e])=>e.phase)).toEqual(['start','cancel']); expect(animation.cancel).not.toHaveBeenCalled(); binding.dispose();
});
it('adopts inserted CSS effects via observation and does not touch inactive families', async () => {
  const {owner,animation}=fixture(); owner.remove(); let active=false; const events=vi.fn();
  const binding=bindCssMotion(document,{policy:()=>({active,enabled:false,reducedMotion:false}),diagnostics:events});
  document.body.append(owner); await Promise.resolve(); expect(animation.finish).not.toHaveBeenCalled();
  active=true; binding.update(); expect(animation.finish).toHaveBeenCalledOnce(); binding.dispose();
});
