import React, { forwardRef } from 'react';
import { motion, m, animate, useAnimationControls as useEngineAnimationControls } from 'framer-motion';
import { useMotionPolicy } from './provider';
import type { SpringSpec } from '../core';

export interface AdapterPolicy {
  /** False is a byte-for-byte prop passthrough for incremental rollouts. */
  active?: boolean;
  enabled: boolean;
  reducedMotion: boolean;
  preset?: SpringSpec;
}
const immediate = { type: 'tween' as const, duration: 0, delay: 0, repeat: 0, repeatDelay: 0 };
/** Preserve semantic end values while removing keyframes and property-specific delays. */
export function finalMotionTarget(value: unknown): unknown {
  if (typeof value === 'function') return (...args: unknown[]) => finalMotionTarget(value(...args));
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'transition') continue;
    result[key] = Array.isArray(item) ? [...item].reverse().find(entry => entry !== null) : item;
  }
  result.transition = immediate;
  return result;
}
export function resolveMotionProps(props: Record<string, unknown>, policy: AdapterPolicy) {
  if (policy.active === false) return props;
  const result: Record<string, unknown> = { ...props, 'data-motion-owner': props['data-motion-owner'] ?? 'package-compat' };
  if (policy.enabled && !policy.reducedMotion) return result;
  Object.assign(result, { initial: false, layout: false, transition: immediate,
    whileHover: undefined, whileTap: undefined, whileFocus: undefined });
  for (const key of ['animate', 'exit', 'whileInView']) {
    if (props[key] && typeof props[key] === 'object' && !('start' in (props[key] as object))) result[key] = finalMotionTarget(props[key]);
  }
  if (props.variants) result.variants = Object.fromEntries(Object.entries(props.variants as object).map(([key, target]) => [key, finalMotionTarget(target)]));
  result.style = { ...(props.style as object), transitionDuration: '0s', animationDuration: '0s', animationIterationCount: 1 };
  return result;
}

/** Same Motion engine and same DOM node. No wrapper, haptic or navigation owner is added. */
export function createPolicyMotion(usePolicy: () => AdapterPolicy = useMotionPolicy, lightweight = false): typeof motion {
  const engine = lightweight ? m : motion;
  const cache = new Map<unknown, React.ComponentType<any>>();
  const create = (target: React.ElementType, options?: { forwardMotionProps?: boolean }) => {
    // Options belong to the component factory, not to render. Do not merge differently configured factories.
    const key = options ? {} : target;
    if (cache.has(key)) return cache.get(key)!;
    const Component = engine.create(target, options);
    const Wrapped = forwardRef<unknown, Record<string, unknown>>((props, ref) => {
      const policy = usePolicy();
      const resolved = resolveMotionProps(props, policy);
      // Changing only transition duration does not restart an existing Motion
      // target. A null-origin keyframe retargets from its current value and
      // lands immediately without replacing the element or its ref.
      const retarget = (value: unknown): unknown => {
        if (typeof value === 'function') return (...args: unknown[]) => retarget(value(...args));
        if (!value || typeof value !== 'object' || 'start' in value) return value;
        return Object.fromEntries(Object.entries(value).map(([key, item]) =>
          [key, key === 'transition' || key === 'transitionEnd' ? item : [null, item]]));
      };
      if (isSuppressed(policy)) {
        for (const key of ['animate', 'exit', 'whileInView']) resolved[key] = retarget(resolved[key]);
        if (resolved.variants) resolved.variants = Object.fromEntries(Object.entries(resolved.variants as object).map(([key,value]) => [key,retarget(value)]));
      }
      return React.createElement(Component, { ...resolved, ref });
    });
    Wrapped.displayName = `PolicyMotion(${typeof target === 'string' ? target : target.displayName || target.name || 'Component'})`;
    cache.set(key, Wrapped);
    return Wrapped;
  };
  return new Proxy(create, {
    get(_target, property) {
      if (property === 'create') return create;
      if (typeof property !== 'string') return Reflect.get(engine, property);
      return create(property as React.ElementType);
    },
  }) as unknown as typeof motion;
}

export interface PolicyAnimateOptions { subscribe?: (listener: () => void) => () => void }
const isSuppressed = (policy: AdapterPolicy) => policy.active !== false && (!policy.enabled || policy.reducedMotion);
/** Property-specific transitions must not override the immediate policy. */
function immediateOptions(options: unknown): Record<string, unknown> {
  const result = { ...(options as Record<string, unknown>), ...immediate } as Record<string, unknown>;
  for (const [key, value] of Object.entries(result)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) result[key] = { ...value, ...immediate };
  }
  return result;
}
/** Preserve the engine's controls and completion callbacks; watch policy only while active. */
export function createPolicyAnimate(getPolicy: () => AdapterPolicy, options: PolicyAnimateOptions = {}): typeof animate {
  return ((...args: unknown[]) => {
    const sequence = Array.isArray(args[0]) && args[0].some(Array.isArray);
    if (isSuppressed(getPolicy())) {
      if (sequence) {
        // Keep timeline geometry: coincident zero-duration segments can erase
        // the final value. complete() skips directly to the original end.
        args[0] = (args[0] as unknown[]).map(segment => Array.isArray(segment)
          ? [segment[0], segment[1], { ...(segment[2] as object), repeat: 0 }] : segment);
        args[1] = { ...(args[1] as object), repeat: 0 };
      } else args[2] = immediateOptions(args[2]);
    }
    const controls = (animate as Function)(...args) as ReturnType<typeof animate>;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    const query = typeof window === 'undefined' ? undefined : window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const cleanup = () => {
      if (disposed) return;
      disposed = true; unsubscribe?.(); query?.removeEventListener('change', update);
    };
    const update = () => {
      if (!disposed && isSuppressed(getPolicy())) { controls.complete(); cleanup(); }
    };
    query?.addEventListener('change', update);
    unsubscribe = options.subscribe?.(update);
    if (disposed) unsubscribe?.();
    // Keep the original controls instance and bind original methods to their engine receiver.
    for (const method of ['stop', 'cancel'] as const) {
      const original = controls[method].bind(controls);
      controls[method] = () => { cleanup(); original(); };
    }
    void controls.finished.then(cleanup, cleanup);
    update();
    return controls;
  }) as typeof animate;
}

/** Control hooks retain the engine object used by animate={controls}. Managed start
 * promises also settle on cancellation, which Motion's stopped promises do not. */
export function createPolicyAnimationControls(usePolicy: () => AdapterPolicy = useMotionPolicy): typeof useEngineAnimationControls {
  return function usePolicyAnimationControls() {
    const controls = useEngineAnimationControls();
    const policy = usePolicy();
    const latest = React.useRef(policy);
    latest.current = policy;
    const manager = React.useMemo(() => {
      const start = controls.start.bind(controls), stop = controls.stop.bind(controls);
      type Run = { definition: Parameters<typeof controls.start>[0]; resolve: () => void; reject: (error: unknown) => void; ended: boolean };
      const pending = new Set<Run>();
      const finish = (run: Run, error?: unknown) => {
        if (run.ended) return;
        run.ended = true; pending.delete(run);
        if (error !== undefined) run.reject(error); else run.resolve();
      };
      const target = (definition: Run['definition']) => typeof definition === 'object' && !Array.isArray(definition)
        ? finalMotionTarget(definition) as Run['definition'] : definition;
      const land = () => {
        if (!pending.size) return;
        stop();
        // Only the latest start owns the current target. Earlier awaited calls
        // settle as cancelled; they must not replay obsolete destinations.
        const runs = [...pending], last = runs[runs.length - 1];
        runs.slice(0, -1).forEach(run => finish(run));
        void start(target(last.definition), immediate).then(() => finish(last), error => finish(last, error));
      };
      controls.start = (definition, transitionOverride) => {
        if (latest.current.active === false) return start(definition, transitionOverride);
        // A replacement start cancels the previous managed waiter, not its DOM.
        for (const run of pending) finish(run);
        return new Promise<void>((resolve, reject) => {
          const run: Run = { definition, resolve, reject, ended: false };
          pending.add(run);
          try {
            const suppressed = isSuppressed(latest.current);
            void start(suppressed ? target(definition) : definition, suppressed ? immediate : transitionOverride)
              .then(() => finish(run), error => finish(run, error));
          } catch (error) { finish(run, error); }
        });
      };
      controls.stop = () => { stop(); for (const run of pending) finish(run); };
      return { land, cancel: () => controls.stop() };
    }, [controls]);
    const previousActive = React.useRef(policy.active);
    React.useLayoutEffect(() => {
      if (isSuppressed(policy) || (previousActive.current !== false && policy.active === false)) manager.land();
      previousActive.current = policy.active;
    }, [policy.active, policy.enabled, policy.reducedMotion, manager]);
    React.useEffect(() => manager.cancel, [manager]);
    return controls;
  };
}
