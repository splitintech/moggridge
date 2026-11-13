import { useEffect, type RefObject } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMotionPolicy } from "../../web/provider";
import { hasHistoryEntry, setPendingScreenIntent } from "./history";
import { releaseVelocity, type TouchSample } from "./interactiveBack";
import type { InteractiveBackSession } from "./stageController";
import { useScreenNavigation } from "./tracker";

/** Swipes must start near the top of a task screen, so in-content pull-to-refresh keeps working. */
export const TASK_GRAB_ZONE_PX = 180;
const COMMIT_FRACTION = 0.25;
const FLICK_PX_PER_MS = 0.5;
const INTERACTIVE_TARGETS = 'button, a, input, textarea, select, [role="button"], [role="slider"], [data-swipe-ignore], [data-gesture-owner]';

/** Swipe down from the top of a slide-up task screen to close it, with the screen following the finger. */
export function useTaskSwipeDown(
  rootRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  startDrag: () => InteractiveBackSession | null
) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { emitHaptic } = useMotionPolicy();
  const table = useScreenNavigation()?.table;

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return undefined;

    let start: { x: number; y: number } | null = null;
    let drag: { session: InteractiveBackSession; samples: TouchSample[]; progress: number } | null = null;

    const onStart = (event: TouchEvent) => {
      drag = null;
      start = null;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (touch.clientY > TASK_GRAB_ZONE_PX) return;
      if ((event.target as Element | null)?.closest?.(INTERACTIVE_TARGETS)) return;
      start = { x: touch.clientX, y: touch.clientY };
    };

    const onMove = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (drag) {
        event.preventDefault();
        drag.samples.push({ x: touch.clientY, t: performance.now() });
        if (drag.samples.length > 6) drag.samples.shift();
        drag.progress = Math.max(0, Math.min(1, dy / drag.session.width));
        drag.session.update(drag.progress);
        return;
      }
      if (dy > 10 && dy > 1.2 * Math.abs(dx)) {
        const session = startDrag();
        if (!session) {
          start = null;
          return;
        }
        event.preventDefault();
        emitHaptic("drag-start");
        drag = { session, samples: [{ x: touch.clientY, t: performance.now() }], progress: Math.max(0, dy / session.width) };
        session.update(drag.progress);
      } else if (Math.abs(dx) > 10 || dy < -10) {
        start = null;
      }
    };

    const onEnd = () => {
      const current = drag;
      drag = null;
      start = null;
      if (!current) return;
      const velocityPxPerMs = releaseVelocity(current.samples);
      const commit = velocityPxPerMs > -0.3 && (current.progress >= COMMIT_FRACTION || velocityPxPerMs >= FLICK_PX_PER_MS);
      const velocity = (Math.abs(velocityPxPerMs) * 1000) / Math.max(1, current.session.width);
      if (!commit) {
        current.session.cancel(velocity);
        return;
      }
      const hasHistory = hasHistoryEntry();
      const parent = table ? table.logicalParentPath(pathname) : pathname;
      if (!hasHistory && parent === pathname) {
        current.session.cancel(0);
        return;
      }
      emitHaptic("drag-end");
      setPendingScreenIntent(
        { kind: "dismiss", origin: "gesture", interactive: { progress: current.progress, velocity } },
        hasHistory ? "POP" : "REPLACE"
      );
      current.session.commit(velocity);
      if (hasHistory) navigate(-1);
      else navigate(parent, { replace: true });
    };

    const onCancel = () => {
      drag?.session.cancel(0);
      drag = null;
      start = null;
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchmove", onMove, { passive: false });
    root.addEventListener("touchend", onEnd, { passive: true });
    root.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("touchcancel", onCancel);
    };
  }, [emitHaptic, enabled, navigate, pathname, rootRef, startDrag, table]);
}
