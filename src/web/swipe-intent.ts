import { useCallback, useRef, useEffect, useId } from "react";
import {
  DEFAULT_GESTURE_THRESHOLDS,
  getSwipeResult,
  pointFromPointer,
  pointFromTouch,
  shouldCommitSwipe,
  shouldIgnoreGestureTarget,
  shouldPreventScrollForSwipe,
  scrollConsumesSwipe,
  type GesturePoint,
  type GestureTargetPolicy,
  type GestureThresholds,
  type SwipeDirection,
  type SwipeResult,
} from "./legacy-gesture-targets";
import { lockGestureAxis } from "../core/motion";
import { useGestureArbiter } from './provider';
type HapticEvent = string;
export interface HapticMetadata { event?: React.TouchEvent | React.PointerEvent; dedupeKey?: string }


export type SwipeIntentOptions = {
  haptics?: (intent: string, metadata: HapticMetadata) => void;
  enabled?: boolean;
  directions?: SwipeDirection[];
  thresholds?: Partial<GestureThresholds>;
  targetPolicy?: GestureTargetPolicy;
  preventScrollAxis?: "x" | "y" | "none";
  thresholdHaptic?: HapticEvent | false;
  commitHaptic?: HapticEvent | false;
  thresholdDedupeKey?: string;
  onSwipe: (result: SwipeResult) => void;
};

export function useSwipeIntent({
  haptics,
  enabled = true,
  directions = ["left", "right", "up", "down"],
  thresholds = DEFAULT_GESTURE_THRESHOLDS,
  targetPolicy,
  preventScrollAxis = "none",
  thresholdHaptic = false,
  commitHaptic = false,
  thresholdDedupeKey,
  onSwipe,
}: SwipeIntentOptions) {
  const arbiter = useGestureArbiter(), owner = useId();
  const triggerHaptic = haptics ?? (() => {});
  const suppressTouchUntil = useRef(0);
  const startRef = useRef<GesturePoint | null>(null);
  const targetRef = useRef<EventTarget | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const lastCommittedAtRef = useRef(-Infinity);
  const input = useRef<"touch" | "pointer" | null>(null);
  const boundaryRef = useRef<EventTarget | null>(null);
  const thresholdTriggeredRef = useRef(false);

  const reset = useCallback(() => {
    arbiter.release(owner);
    input.current = null;
    boundaryRef.current = null;
    startRef.current = null;
    targetRef.current = null;
    pointerIdRef.current = null;
    thresholdTriggeredRef.current = false;
  }, [arbiter, owner]);

  useEffect(() => {
    const cancel = () => { if (document.hidden) reset(); };
    if (!enabled) reset();
    document.addEventListener('visibilitychange', cancel);
    window.addEventListener('blur', reset);
    return () => { document.removeEventListener('visibilitychange', cancel); window.removeEventListener('blur', reset); reset(); };
  }, [enabled, reset]);
  const start = useCallback(
    (point: GesturePoint, target: EventTarget | null) => {
      if (!enabled || shouldIgnoreGestureTarget(target, targetPolicy)) {
        reset();
        return;
      }
      startRef.current = point;
      targetRef.current = target;
    },
    [enabled, reset, targetPolicy],
  );

  const move = useCallback(
    (point: GesturePoint, event?: React.TouchEvent | React.PointerEvent) => {
      if (!enabled || !startRef.current) return;
      if (event?.defaultPrevented) { reset(); return; }
      const result = getSwipeResult(startRef.current, point);
      const axis = lockGestureAxis(result.deltaX, result.deltaY);
      if (!axis) return;
      if (!directions.includes(result.direction) || scrollConsumesSwipe(targetRef.current, boundaryRef.current, result.deltaX, result.deltaY) || !arbiter.claim({owner,axis,cancel:reset})) { reset(); return; }
      if (
        thresholdHaptic !== false &&
        !thresholdTriggeredRef.current &&
        shouldCommitSwipe(result, directions, thresholds)
      ) {
        thresholdTriggeredRef.current = true;
        triggerHaptic(thresholdHaptic, {
          event,
          dedupeKey: thresholdDedupeKey ?? `swipe-threshold-${result.direction}`,
        });
      }
      if (preventScrollAxis === "none") return;
      if (shouldPreventScrollForSwipe(startRef.current, point, preventScrollAxis) && event?.cancelable !== false) {
        event?.preventDefault();
      }
    },
    [directions, enabled, preventScrollAxis, thresholdDedupeKey, thresholdHaptic, thresholds, arbiter, owner, reset, haptics],
  );

  const end = useCallback(
    (point: GesturePoint, event?: React.TouchEvent | React.PointerEvent) => {
      const startPoint = startRef.current;
      const target = targetRef.current;
      const boundary = boundaryRef.current;
      if (!enabled || !startPoint || event?.defaultPrevented) { reset(); return; }
      const result = getSwipeResult(startPoint, point);
      const commit = shouldCommitSwipe(result, directions, thresholds) && !scrollConsumesSwipe(target,boundary,result.deltaX,result.deltaY) && arbiter.claim({owner,axis:result.absDeltaX>=result.absDeltaY?'x':'y',cancel:reset});
      reset();
      if (commit) {
        if (event?.cancelable !== false) event?.preventDefault();
        const timestamp = Date.now();
        if (timestamp - lastCommittedAtRef.current < 250) return;
        lastCommittedAtRef.current = timestamp;
        if (commitHaptic !== false) {
          triggerHaptic(commitHaptic, {
            dedupeKey: `swipe-commit-${result.direction}`,
          });
        }
        onSwipe({ ...result, target });
      }
    },
    [commitHaptic, directions, enabled, onSwipe, reset, thresholds, haptics, arbiter, owner],
  );

  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (input.current === "pointer" || Date.now() < suppressTouchUntil.current) return;
      if (!targetPolicy?.allowMultiTouch && event.touches.length !== 1) {
        reset();
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;
      start(pointFromTouch(touch), event.target);
      if (startRef.current) { input.current = "touch"; boundaryRef.current = event.currentTarget; }
    },
    [reset, start, targetPolicy?.allowMultiTouch],
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (input.current === "pointer" || Date.now() < suppressTouchUntil.current) return;
      if (!targetPolicy?.allowMultiTouch && event.touches.length !== 1) { reset(); return; }
      const touch = event.touches[0];
      if (!touch || input.current !== "touch") return;
      move(pointFromTouch(touch), event);
    },
    [move, reset, targetPolicy?.allowMultiTouch],
  );

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (input.current === "pointer" || Date.now() < suppressTouchUntil.current) return;
      const touch = event.changedTouches[0];
      if (!touch) {
        reset();
        return;
      }
      if (input.current === "touch") end(pointFromTouch(touch), event);
    },
    [end, reset],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === "mouse" || event.button > 0) return;
      suppressTouchUntil.current = Date.now() + 1000;
      if (event.isPrimary === false || (pointerIdRef.current !== null && pointerIdRef.current !== event.pointerId)) { reset(); return; }
      start(pointFromPointer(event), event.target);
      if (startRef.current) { input.current = "pointer"; pointerIdRef.current = event.pointerId; boundaryRef.current = event.currentTarget; }
    },
    [start, reset],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (input.current !== "pointer" || pointerIdRef.current !== event.pointerId) return;
      move(pointFromPointer(event), event);
    },
    [move],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (input.current !== "pointer" || pointerIdRef.current !== event.pointerId) return;
      suppressTouchUntil.current = Date.now() + 1000;
      end(pointFromPointer(event), event);
    },
    [end],
  );

  return {
    reset,
    wasSwipeCommittedRecently: () => Date.now() - lastCommittedAtRef.current < 350,
    bind: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: () => { if (input.current === "touch") reset(); },
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: (event: React.PointerEvent) => { if (pointerIdRef.current === event.pointerId) { suppressTouchUntil.current = Date.now() + 1000; reset(); } },
      onLostPointerCapture: (event: React.PointerEvent) => { if (pointerIdRef.current === event.pointerId) reset(); },
    },
  };
}
