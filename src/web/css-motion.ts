import type { MotionEvent } from '../core';
import type { AdapterPolicy } from './compat';

export interface CssMotionBindingOptions {
  policy(element: Element): AdapterPolicy;
  diagnostics?(event: MotionEvent): void;
  subscribe?(listener: () => void): () => void;
}
/** Adopt CSS animations/transitions only. Disposal releases observation, never restarts motion. */
export function bindCssMotion(root: Document | HTMLElement, options: CssMotionBindingOptions) {
  const records = new Map<Animation, { id: number; target: Element }>();
  const terminal = new WeakSet<Animation>();
  let sequence = 0, disposed = false;
  const terminate = (animation: Animation, phase: 'complete' | 'cancel') => {
    const record = records.get(animation);
    if (!record) return;
    records.delete(animation); terminal.add(animation);
    options.diagnostics?.({ id: record.id, phase });
  };
  const settle = (animation: Animation) => {
    try {
      // Finite effects retain their original duration/delay and jump to their true end.
      // Infinite decoration has no end: bound just its iterations before finishing.
      if (animation.effect?.getTiming().iterations === Infinity) animation.effect.updateTiming({ iterations: 1 });
      animation.finish(); terminate(animation, 'complete');
    } catch { animation.cancel(); terminate(animation, 'cancel'); }
  };
  const contains = (target: Element) => root.contains(target);
  const update = () => {
    if (disposed) return;
    for (const [animation, record] of records) {
      if (!contains(record.target) || !record.target.closest('[data-motion-family]')) terminate(animation, 'cancel');
    }
    const animations = root.nodeType === 9
      ? (root as Document).getAnimations?.()
      : (root as HTMLElement).getAnimations?.({ subtree: true });
    for (const animation of animations ?? []) {
      if (terminal.has(animation) || (!('animationName' in animation) && !('transitionProperty' in animation))) continue;
      const target = (animation.effect as KeyframeEffect | null)?.target;
      if (!target || !contains(target)) continue;
      const owner = target.closest('[data-motion-family]');
      if (!owner || (root.nodeType !== 9 && !contains(owner))) continue;
      const policy = options.policy(owner);
      if (policy.active === false) { if (records.has(animation)) terminate(animation, 'cancel'); continue; }
      if (!records.has(animation)) {
        const id = ++sequence;
        records.set(animation, { id, target });
        options.diagnostics?.({ id, phase: 'start' });
        void animation.finished.then(() => terminate(animation, 'complete'), () => terminate(animation, 'cancel'));
      }
      if (!policy.enabled || policy.reducedMotion) settle(animation);
    }
  };
  root.addEventListener('animationstart', update, true);
  root.addEventListener('transitionrun', update, true);
  const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(update);
  observer?.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'data-motion-family'] });
  const view = root.nodeType === 9 ? (root as Document).defaultView : root.ownerDocument?.defaultView;
  const query = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  query?.addEventListener('change', update);
  const unsubscribe = options.subscribe?.(update);
  update();
  return {
    update,
    dispose() {
      if (disposed) return;
      disposed = true; observer?.disconnect(); unsubscribe?.();
      query?.removeEventListener('change', update);
      root.removeEventListener('animationstart', update, true);
      root.removeEventListener('transitionrun', update, true);
      for (const animation of records.keys()) terminate(animation, 'cancel');
    },
  };
}
