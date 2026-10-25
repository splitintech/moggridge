import { useEffect, useRef } from "react";
import { animate, type MotionValue } from "framer-motion";
import { createMotionLifecycle, type MotionEvent } from "../core";
import { useMotionPolicy, useMotionTransition } from "./provider";
/** One engine owner per value, with sampled velocity and exactly-once run termination. */
export function useMotionController(
  value: MotionValue<number>,
  onEvent?: (event: MotionEvent) => void,
) {
  const policy = useMotionPolicy();
  const callback = useRef(onEvent);
  callback.current = onEvent;
  const diagnostics = useRef(policy.diagnostics);
  diagnostics.current = policy.diagnostics;
  const lifecycle = useRef<ReturnType<typeof createMotionLifecycle> | null>(
    null,
  );
  if (!lifecycle.current)
    lifecycle.current = createMotionLifecycle((event) => {
      callback.current?.(event);
      diagnostics.current?.(event);
    });
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const transition = useMotionTransition();
  const target = useRef(value.get());
  const completion = useRef<(() => void) | undefined>(undefined);
  const controller = lifecycle.current;
  const cancel = (reason = "cancelled") => {
    animation.current?.stop();
    controller.cancel(reason);
    completion.current = undefined;
  };
  const to = (next: number, complete?: () => void) => {
    animation.current?.stop();
    target.current = next;
    completion.current = complete;
    const id = controller.start(next);
    controller.sample(id, value.get(), value.getVelocity());
    animation.current = animate(value, next, {
      ...transition,
      velocity: value.getVelocity(),
      onUpdate: (latest) => controller.sample(id, latest, value.getVelocity()),
      onComplete: () => {
        if (controller.complete(id)) {
          const done = completion.current;
          completion.current = undefined;
          done?.();
        }
      },
    });
    return id;
  };
  useEffect(() => {
    const background = () => {
      if (document.hidden) {
        cancel("background");
        value.jump(target.current);
      }
    };
    document.addEventListener("visibilitychange", background);
    return () => {
      document.removeEventListener("visibilitychange", background);
      cancel("unmount");
    };
  }, [controller, value]);
  useEffect(() => {
    if ("duration" in transition) {
      animation.current?.stop();
      value.jump(target.current);
      const id = controller.snapshot.runId;
      if (id !== null && controller.complete(id)) {
        const done = completion.current;
        completion.current = undefined;
        done?.();
      }
    }
  }, [transition, value, controller]);
  return {
    to,
    cancel,
    get snapshot() {
      return controller.snapshot;
    },
  };
}
