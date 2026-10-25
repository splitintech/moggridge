import {expect,it,vi} from 'vitest';
import {withDragCancellation} from '../../src/web/drag-controls';
it('cancels subscribed renderers on early Motion12 without firing end callbacks or retaining removed subscribers', () => {
 const dispose=vi.fn(), start=vi.fn(), subscribe=vi.fn(()=>dispose);
 const controls=withDragCancellation({start,subscribe} as unknown as Parameters<typeof withDragCancellation>[0]);
 const cancel=vi.fn();
 const remove=(controls as unknown as {subscribe(value:{cancel():void}):()=>void}).subscribe({cancel});
 expect(withDragCancellation(controls)).toBe(controls);
 controls.cancel();expect(cancel).toHaveBeenCalledOnce();expect(start).not.toHaveBeenCalled();
 remove();controls.cancel();expect(cancel).toHaveBeenCalledOnce();expect(dispose).toHaveBeenCalledOnce();
});
it('preserves newer engine cancellation and subscriptions unchanged', () => {
 const cancel=vi.fn(),subscribe=vi.fn();
 const original={cancel,subscribe} as unknown as Parameters<typeof withDragCancellation>[0];
 expect(withDragCancellation(original)).toBe(original);expect(original.cancel).toBe(cancel);expect((original as unknown as {subscribe:unknown}).subscribe).toBe(subscribe);
});
