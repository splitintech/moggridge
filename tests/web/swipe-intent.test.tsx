import React from 'react';
import { cleanup, renderHook, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import * as legacy from './legacy-swipe.fixture';
import * as portable from '../../src/core/legacy-swipe';
import { useSwipeIntent } from '../../src/web/swipe-intent';
import { MotionProvider } from '../../src/web/provider';
afterEach(()=>{cleanup();vi.restoreAllMocks();document.body.innerHTML='';});
it('preserves exact legacy distance, velocity, restraint, axis, duration and scroll prevention rules', () => {
 const start={x:10,y:20,time:1000};
 for (const x of [-100,-64,-12,0,12,63,64,100]) for(const y of [-80,-52,0,12,52,80]) for(const ms of [0,1,100,900,901,2000]) {
  const end={x:start.x+x,y:start.y+y,time:start.time+ms};
  expect(portable.getSwipeResult(start,end)).toEqual(legacy.getSwipeResult(start,end));
  for(const direction of ['left','right','up','down'] as const) expect(portable.shouldCommitSwipe(portable.getSwipeResult(start,end),direction)).toBe(legacy.shouldCommitSwipe(legacy.getSwipeResult(start,end),direction));
  for(const axis of ['x','y'] as const) expect(portable.shouldPreventScrollForSwipe(start,end,axis)).toBe(legacy.shouldPreventScrollForSwipe(start,end,axis));
 }
});
function event(target:HTMLElement,x:number,id=1) { return {target,currentTarget:target,clientX:x,clientY:0,pointerId:id,pointerType:'touch',isPrimary:true,button:0,cancelable:true,defaultPrevented:false,preventDefault(this: { defaultPrevented: boolean }){this.defaultPrevented=true;}} as unknown as React.PointerEvent; }
it('does not restart a long pointer gesture from duplicate touch events', () => {
 let now=1000; vi.spyOn(Date,'now').mockImplementation(()=>now); const onSwipe=vi.fn(), target=document.createElement('div'); document.body.append(target);
 const {result}=renderHook(()=>useSwipeIntent({onSwipe}));
 act(()=>result.current.bind.onPointerDown(event(target,0))); now=3000;
 const touch={target,currentTarget:target,touches:[{clientX:50,clientY:0}],changedTouches:[{clientX:100,clientY:0}],preventDefault(){},cancelable:true} as unknown as React.TouchEvent;
 act(()=>result.current.bind.onTouchStart(touch));
 act(()=>result.current.bind.onPointerUp(event(target,1000)));
 act(()=>result.current.bind.onTouchEnd(touch)); expect(onSwipe).toHaveBeenCalledOnce(); expect(onSwipe.mock.calls[0][0].deltaX).toBe(1000);
});
it('allows a nested scroller to consume swipes and claims only at its edge', () => {
 let now=1000; vi.spyOn(Date,'now').mockImplementation(()=>now); const target=document.createElement('div'); target.style.overflow='auto'; document.body.append(target);
 Object.defineProperties(target,{scrollWidth:{value:500},clientWidth:{value:100}}); target.scrollLeft=100;
 const onSwipe=vi.fn(), {result}=renderHook(()=>useSwipeIntent({onSwipe,directions:['right']}));
 act(()=>result.current.bind.onPointerDown(event(target,0))); now+=100; act(()=>result.current.bind.onPointerUp(event(target,100))); expect(onSwipe).not.toHaveBeenCalled();
 target.scrollLeft=0; now+=500; act(()=>result.current.bind.onPointerDown(event(target,0))); now+=100; act(()=>result.current.bind.onPointerUp(event(target,100))); expect(onSwipe).toHaveBeenCalledOnce();
});
it('arbitrates at release even with no move events and calls the latest haptic driver', () => {
 const target=document.createElement('div'); document.body.append(target); const first=vi.fn(), second=vi.fn(), oldHaptic=vi.fn(), newHaptic=vi.fn();
 const {result,rerender}=renderHook(({haptics})=>({a:useSwipeIntent({onSwipe:first,haptics,commitHaptic:'press'}),b:useSwipeIntent({onSwipe:second})}),{initialProps:{haptics:oldHaptic},wrapper:MotionProvider});
 act(()=>{result.current.a.bind.onPointerDown(event(target,0));result.current.b.bind.onPointerDown(event(target,0));}); rerender({haptics:newHaptic});
 const end=event(target,100); act(()=>{result.current.a.bind.onPointerUp(end);result.current.b.bind.onPointerUp(end);});
 expect(first).toHaveBeenCalledOnce();expect(second).not.toHaveBeenCalled();expect(newHaptic).toHaveBeenCalledOnce();expect(oldHaptic).not.toHaveBeenCalled();
});
