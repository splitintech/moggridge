import { useCancellableDragControls } from './drag-controls';
import { useMotionController } from "./runtime";
import { useRetainedPresence } from "./presence";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import {
  snapTarget,
  edgeScrollVelocity,
  resolveMomentumTarget,
  shouldScrollConsume,
  lockGestureAxis,
  type MomentumPolicy,
} from "../core";
import {
  useMotionPolicy,
  useMotionTransition,
  useGestureArbiter,
} from "./provider";
export interface ElasticSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  children?: React.ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  dismissible?: boolean;
  onSnap?: (index: number) => void;
  /** Optional downward dismissal endpoint in CSS pixels. */
  dismissOffset?: number;
  projectionMs?: number;
}
/** Only the handle owns dragging; nested content retains native scrolling. Points are downward offsets in CSS pixels. */
export function ElasticSheet({
  open,
  onOpenChange,
  label,
  children,
  snapPoints = [0, 300],
  initialSnap = 0,
  dismissible = true,
  onSnap,
  dismissOffset,
  projectionMs = 180,
}: ElasticSheetProps) {
  const y = useMotionValue(snapPoints[initialSnap] ?? 0),
    controls = useCancellableDragControls(),
    policy = useMotionPolicy(),
    transition = useMotionTransition(),
    animation = useRef<ReturnType<typeof animate> | null>(null);
  const [keyboard, setKeyboard] = useState(0),
    [index, setIndex] = useState(initialSnap);
  const { present, progress: presence } = useRetainedPresence(open);
  const visualY = useTransform(
    () =>
      y.get() +
      (1 - presence.get()) *
        (typeof window === "undefined" ? 1000 : window.innerHeight),
  );
  const points = snapPoints.length ? snapPoints : [0];
  const arbiter = useGestureArbiter(),
    owner = useId();
  const pointKey = points.join(",");
  useEffect(() => {
    animation.current?.stop();
    const safe = Math.max(0, Math.min(index, points.length - 1));
    setIndex(safe);
    animation.current = animate(y, points[safe], transition);
  }, [pointKey, policy.enabled, policy.reducedMotion]);
  useEffect(() => {
    const cancel = () => {
      animation.current?.stop();
      controls.cancel();
      y.jump(points[Math.min(index, points.length - 1)]);
      arbiter.release(owner);
    };
    const background = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", background);
    return () => {
      document.removeEventListener("visibilitychange", background);
      arbiter.release(owner);
    };
  }, [pointKey, index, controls, arbiter, owner, y]);
  const settle = (next: number) => {
    const safe = Math.max(0, Math.min(points.length - 1, next));
    animation.current?.stop();
    animation.current = animate(y, points[safe], transition);
    setIndex(safe);
    onSnap?.(safe);
    policy.emitHaptic("snap");
  };
  useEffect(() => () => animation.current?.stop(), []);
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setKeyboard(
        Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop),
      );
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [open]);
  return (
    <Dialog.Root
      open={present || open}
      onOpenChange={(next) => {
        if (next || dismissible) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgb(0 0 0 / .4)",
              opacity: presence,
            }}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild aria-describedby={undefined}>
          <motion.section
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0.15}
            dragConstraints={{
              top: Math.min(...points),
              bottom: Math.max(...points, dismissOffset ?? -Infinity),
            }}
            onDragStart={() => animation.current?.stop()}
            onDrag={(_, info) => y.set(y.get() + info.delta.y)}
            onPointerCancel={() => {
              arbiter.release(owner);
              settle(index);
            }}
            onDragEnd={(_, info) => {
              arbiter.release(owner);
              if (
                dismissible &&
                ((dismissOffset !== undefined &&
                  y.get() + (info.velocity.y * projectionMs) / 1000 >=
                    dismissOffset) ||
                  (info.velocity.y > 900 &&
                    y.get() >= Math.max(...points) - 20))
              ) {
                onOpenChange(false);
                return;
              }
              settle(
                points.indexOf(
                  snapTarget(y.get(), info.velocity.y, points, projectionMs),
                ),
              );
            }}
            style={{
              position: "fixed",
              bottom: keyboard,
              left: 0,
              right: 0,
              maxHeight: "90dvh",
              paddingBottom: "env(safe-area-inset-bottom)",
              background: "Canvas",
              color: "CanvasText",
              y: visualY,
            }}
          >
            <Dialog.Title>{label}</Dialog.Title>
            <div
              role="group"
              aria-label="Sheet position"
              style={{ touchAction: "none", minHeight: 44 }}
              onPointerDown={(event) => {
                if (
                  !(event.target as HTMLElement).closest("button") &&
                  arbiter.claim({
                    owner,
                    axis: "y",
                    cancel: () => {
                      controls.cancel();
                      settle(index);
                    },
                  })
                )
                  controls.start(event);
              }}
            >
              <span aria-hidden>━━</span>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => settle(index - 1)}
              >
                Expand sheet
              </button>
              <button
                type="button"
                disabled={index === points.length - 1}
                onClick={() => settle(index + 1)}
              >
                Collapse sheet
              </button>
            </div>
            <div
              style={{
                overflowY: "auto",
                overscrollBehavior: "contain",
                maxHeight: "70dvh",
              }}
            >
              {children}
            </div>
            {dismissible && <Dialog.Close>Close</Dialog.Close>}
          </motion.section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export interface SnapCarouselProps {
  children: React.ReactNode;
  axis?: "x" | "y";
  label: string;
  className?: string;
  onIndexChange?: (index: number) => void;
  momentumPolicy?: MomentumPolicy;
  style?: React.CSSProperties;
}
export function SnapCarousel({
  children,
  axis = "x",
  label,
  className,
  onIndexChange,
  momentumPolicy,
  style,
}: SnapCarouselProps) {
  const ref = useRef<HTMLDivElement>(null),
    policy = useMotionPolicy(),
    [index, setIndex] = useState(0);
  const count = React.Children.count(children);
  const scroll = useMotionValue(0);
  const controller = useMotionController(scroll);
  const touching = useRef(false),
    sample = useRef({ position: 0, time: 0, velocity: 0 });
  useEffect(
    () =>
      scroll.on("change", (value) => {
        const el = ref.current;
        if (!el) return;
        if (axis === "x") el.scrollLeft = value;
        else el.scrollTop = value;
      }),
    [axis, scroll],
  );
  const settleMomentum = () => {
    if (!momentumPolicy || !ref.current || !touching.current) return;
    touching.current = false;
    const el = ref.current,
      r = el.getBoundingClientRect(),
      position = axis === "x" ? el.scrollLeft : el.scrollTop;
    const points = Array.from(el.children).map((child) => {
      const c = child.getBoundingClientRect();
      return position + (axis === "x" ? c.left - r.left : c.top - r.top);
    });
    if (!points.length) return;
    scroll.jump(position);
    controller.to(
      resolveMomentumTarget(
        position,
        sample.current.velocity,
        points,
        momentumPolicy,
      ),
    );
  };
  const move = (next: number) => {
    const el = ref.current;
    if (!el) return;
    const child = el.children[Math.max(0, Math.min(count - 1, next))] as
      | HTMLElement
      | undefined;
    if (!child) return;
    const r = el.getBoundingClientRect(),
      c = child.getBoundingClientRect();
    if (momentumPolicy) {
      const position = axis === "x" ? el.scrollLeft : el.scrollTop;
      scroll.jump(position);
      controller.to(
        position + (axis === "x" ? c.left - r.left : c.top - r.top),
      );
      return;
    }
    el.scrollTo({
      left: axis === "x" ? el.scrollLeft + c.left - r.left : el.scrollLeft,
      top: axis === "y" ? el.scrollTop + c.top - r.top : el.scrollTop,
      behavior: policy.enabled && !policy.reducedMotion ? "smooth" : "auto",
    });
  };
  return (
    <section aria-label={label} className={className}>
      <div
        ref={ref}
        tabIndex={0}
        onPointerDown={() => {
          controller.cancel("pointer");
          touching.current = true;
          sample.current = {
            position:
              axis === "x" ? ref.current!.scrollLeft : ref.current!.scrollTop,
            time: performance.now(),
            velocity: 0,
          };
        }}
        onPointerUp={settleMomentum}
        onPointerCancel={() => {
          touching.current = false;
          controller.cancel("pointer-cancel");
        }}
        onKeyDown={(event) => {
          const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
          const delta =
            event.key === "ArrowRight"
              ? rtl
                ? -1
                : 1
              : event.key === "ArrowLeft"
                ? rtl
                  ? 1
                  : -1
                : event.key === "ArrowDown"
                  ? 1
                  : event.key === "ArrowUp"
                    ? -1
                    : 0;
          if (delta || event.key === "Home" || event.key === "End") {
            event.preventDefault();
            move(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? count - 1
                  : index + delta,
            );
          }
        }}
        onScroll={() => {
          const el = ref.current!,
            r = el.getBoundingClientRect();
          if (touching.current) {
            const time = performance.now(),
              position = axis === "x" ? el.scrollLeft : el.scrollTop;
            const dt = time - sample.current.time;
            if (dt > 0)
              sample.current = {
                position,
                time,
                velocity: ((position - sample.current.position) * 1000) / dt,
              };
          }
          let best = 0,
            distance = Infinity;
          Array.from(el.children).forEach((child, i) => {
            const c = child.getBoundingClientRect(),
              d = Math.abs(axis === "x" ? c.left - r.left : c.top - r.top);
            if (d < distance) {
              best = i;
              distance = d;
            }
          });
          if (best !== index) {
            setIndex(best);
            onIndexChange?.(best);
          }
        }}
        style={{
          display: "flex",
          flexDirection: axis === "x" ? "row" : "column",
          overflow: "auto",
          scrollSnapType: momentumPolicy ? "none" : `${axis} mandatory`,
          touchAction: momentumPolicy ? (axis === "x" ? "pan-y" : "pan-x") : "auto",
          overscrollBehavior: "contain",
          position: "relative",
          ...style,
        }}
      >
        {React.Children.map(children, (child) => (
          <div style={{ flex: "0 0 100%", scrollSnapAlign: "start" }}>
            {child}
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={index === 0}
        onClick={() => move(index - 1)}
      >
        Previous
      </button>
      <button
        type="button"
        disabled={index >= count - 1}
        onClick={() => move(index + 1)}
      >
        Next
      </button>
    </section>
  );
}
export interface DismissibleSurfaceProps extends HTMLMotionProps<"div"> {
  onDismiss: () => void;
  axis?: "x" | "y";
  threshold?: number;
  label?: string;
  backdrop?: React.ReactNode;
}
export function DismissibleSurface({
  onDismiss,
  axis = "y",
  threshold = 120,
  label = "Dismiss",
  backdrop,
  children,
  ...props
}: DismissibleSurfaceProps) {
  const controls = useCancellableDragControls();
  const arbiter = useGestureArbiter(),
    owner = useId();
  const pointer = useRef<{ x: number; y: number; target: HTMLElement } | null>(
    null,
  );
  const position = useMotionValue(0),
    opacity = useTransform(position, (value) =>
      Math.max(0, 1 - Math.abs(value) / Math.max(1, threshold * 2)),
    ),
    transition = useMotionTransition(),
    animation = useRef<ReturnType<typeof animate> | null>(null),
    committed = useRef(false);
  useEffect(
    () => () => {
      arbiter.release(owner);
      controls.cancel();
    },
    [arbiter, owner, controls],
  );
  useEffect(() => () => animation.current?.stop(), []);
  const dismiss = () => {
    if (committed.current) return;
    committed.current = true;
    onDismiss();
  };
  return (
    <>
      <motion.div aria-hidden style={{ opacity, pointerEvents: "none" }}>
        {backdrop}
      </motion.div>
      <motion.div
        {...props}
        drag={axis}
        dragControls={controls}
        dragListener={false}
        onPointerDown={(event) => {
          props.onPointerDown?.(event);
          if (
            !event.defaultPrevented &&
            !(event.target as HTMLElement).closest(
              "input,textarea,select,button,a,[contenteditable],video,[role=slider]",
            )
          )
            pointer.current = {
              x: event.clientX,
              y: event.clientY,
              target: event.target as HTMLElement,
            };
        }}
        onPointerMove={(event) => {
          props.onPointerMove?.(event);
          const start = pointer.current;
          if (!start || event.defaultPrevented) return;
          const dx = event.clientX - start.x,
            dy = event.clientY - start.y;
          const locked = lockGestureAxis(dx, dy);
          if (!locked) return;
          pointer.current = null;
          if (locked !== axis || window.getSelection()?.toString()) return;
          for (
            let node: HTMLElement | null = start.target;
            node && node !== event.currentTarget;
            node = node.parentElement
          ) {
            const extent =
              axis === "x"
                ? node.scrollWidth - node.clientWidth
                : node.scrollHeight - node.clientHeight;
            if (
              extent > 0 &&
              shouldScrollConsume(
                axis === "x" ? dx : dy,
                axis === "x" ? node.scrollLeft : node.scrollTop,
                extent,
              )
            )
              return;
          }
          if (
            arbiter.claim({
              owner,
              axis,
              cancel: () => {
                controls.cancel();
                animation.current?.stop();
                position.jump(0);
              },
            })
          )
            controls.start(event);
        }}
        onPointerUp={() => {
          pointer.current = null;
          arbiter.release(owner);
        }}
        dragMomentum={false}
        style={{
          ...props.style,
          [axis]: position,
          touchAction: axis === "x" ? "pan-y" : "pan-x",
        }}
        onPointerCancel={(event) => {
          pointer.current = null;
          arbiter.release(owner);
          props.onPointerCancel?.(event);
          animation.current?.stop();
          animation.current = animate(position, 0, transition);
        }}
        onDragEnd={(_, info) => {
          arbiter.release(owner);
          animation.current?.stop();
          const commit =
            Math.abs(position.get()) >= threshold ||
            Math.abs(info.velocity[axis]) > 800;
          animation.current = animate(
            position,
            commit
              ? Math.sign(position.get() || info.velocity[axis]) *
                  Math.max(500, threshold * 3)
              : 0,
            { ...transition, onComplete: commit ? dismiss : undefined },
          );
        }}
      >
        <button type="button" onClick={dismiss}>
          {label}
        </button>
        {children as React.ReactNode}
      </motion.div>
    </>
  );
}
export interface ReorderGroupProps<T> {
  items: readonly T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  label: string;
  columns?: number;
  className?: string;
}
export function ReorderGroup<T>({
  items,
  getId,
  onReorder,
  renderItem,
  label,
  columns = 1,
  className,
}: ReorderGroupProps<T>) {
  const arbiter = useGestureArbiter(), owner = useId();
  const root = useRef<HTMLDivElement>(null),
    active = useRef<{
      id: string;
      original: readonly T[];
      item: T;
      index: number;
      offsetX: number;
      offsetY: number;
      width: number;
      x: number;
      y: number;
    } | null>(null),
    latest = useRef(items);
  latest.current = items;
  const dragX = useMotionValue(0),
    dragY = useMotionValue(0);
  const settling = useRef(false);
  const settleAnimations = useRef<ReturnType<typeof animate>[]>([]);
  useEffect(
    () => () =>
      settleAnimations.current.forEach((animation) => animation.stop()),
    [],
  );
  const [dragging, setDragging] = useState(false),
    [announcement, setAnnouncement] = useState(""),
    policy = useMotionPolicy(),
    transition = useMotionTransition();
  const move = useCallback(
    (id: string, to: number) => {
      const current = [...latest.current],
        from = current.findIndex((item) => getId(item) === id);
      to = Math.max(0, Math.min(current.length - 1, to));
      if (from < 0 || from === to) return;
      current.splice(to, 0, current.splice(from, 1)[0]);
      latest.current = current;
      onReorder(current);
      setAnnouncement(`Moved to position ${to + 1} of ${current.length}`);
    },
    [getId, onReorder],
  );
  useEffect(() => {
    if (!dragging) return;
    let frame = 0,
      last = 0;
    const tick = (time: number) => {
      const a = active.current,
        el = root.current;
      if (a && el && !settling.current) {
        const r = el.getBoundingClientRect(),
          dt = Math.min(32, time - last || 16) / 1000;
        el.scrollTop += edgeScrollVelocity(a.y, r.top, r.bottom) * dt;
        el.scrollLeft += edgeScrollVelocity(a.x, r.left, r.right) * dt;
        const target = document
          .elementFromPoint(a.x, a.y)
          ?.closest("[data-reorder-id]");
        if (target && el.contains(target)) {
          const id = target.getAttribute("data-reorder-id");
          move(
            a.id,
            latest.current.findIndex((item) => getId(item) === id),
          );
        }
      }
      last = time;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragging, getId, move]);
  const cancel = () => {
    settleAnimations.current.forEach((animation) => animation.stop());
    settling.current = false;
    if (active.current) { latest.current = active.current.original; onReorder([...active.current.original]); }
    arbiter.release(owner);
    active.current = null;
    setDragging(false);
  };
  const cancelRef = useRef(cancel); cancelRef.current = cancel;
  useEffect(() => {
    const background = () => { if (document.hidden) cancelRef.current(); };
    document.addEventListener("visibilitychange", background);
    return () => { document.removeEventListener("visibilitychange", background); arbiter.release(owner); };
  }, [arbiter,owner]);
  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.max(1, columns)},minmax(0,1fr))`,
        overflow: "auto",
      }}
    >
      <span
        role="status"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clipPath: "inset(50%)",
        }}
      >
        {announcement}
      </span>
      {dragging && active.current && (
        <motion.div
          aria-hidden
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            x: dragX,
            y: dragY,
            width: active.current.width,
            zIndex: 2000,
            pointerEvents: "none",
            scale: policy.enabled && !policy.reducedMotion ? 1.03 : 1,
            boxShadow: "0 8px 24px rgb(0 0 0 / .15)",
          }}
        >
          {renderItem(active.current.item, active.current.index)}
        </motion.div>
      )}
      {items.map((item, index) => {
        const id = getId(item);
        return (
          <motion.div
            key={id}
            data-reorder-id={id}
            style={{
              opacity: dragging && active.current?.id === id ? 0.35 : 1,
            }}
            layout={
              policy.enabled && !policy.reducedMotion ? "position" : false
            }
            transition={transition}
          >
            <button
              type="button"
              aria-label={`Move item ${index + 1}`}
              style={{ touchAction: "none" }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  cancel();
                  return;
                }
                const rtl =
                  getComputedStyle(event.currentTarget).direction === "rtl";
                const offset =
                  event.key === "ArrowUp"
                    ? -columns
                    : event.key === "ArrowDown"
                      ? columns
                      : event.key === "ArrowLeft"
                        ? rtl
                          ? 1
                          : -1
                        : event.key === "ArrowRight"
                          ? rtl
                            ? -1
                            : 1
                          : 0;
                if (offset) {
                  event.preventDefault();
                  move(id, index + offset);
                }
              }}
              onPointerDown={(event) => {
                if (event.button !== 0 || settling.current || !arbiter.claim({ owner, axis: columns > 1 ? "x" : "y", priority: 1, cancel: () => cancelRef.current() })) return;
                const rect =
                  event.currentTarget.parentElement!.getBoundingClientRect();
                dragX.set(rect.x);
                dragY.set(rect.y);
                active.current = {
                  item,
                  index,
                  offsetX: event.clientX - rect.x,
                  offsetY: event.clientY - rect.y,
                  width: rect.width,
                  id,
                  original: [...items],
                  x: event.clientX,
                  y: event.clientY,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging(true);
                policy.emitHaptic("drag-start");
              }}
              onPointerMove={(event) => {
                if (active.current && !settling.current) {
                  active.current.x = event.clientX;
                  active.current.y = event.clientY;
                  dragX.set(event.clientX - active.current.offsetX);
                  dragY.set(event.clientY - active.current.offsetY);
                }
              }}
              onPointerUp={() => {
                const current = active.current;
                if (!current || settling.current) return;
                const slot = Array.from(
                  root.current?.querySelectorAll<HTMLElement>(
                    "[data-reorder-id]",
                  ) ?? [],
                ).find((node) => node.dataset.reorderId === current.id);
                const rect = slot?.getBoundingClientRect();
                settling.current = true;
                arbiter.release(owner);
                const finish = () => {
                  active.current = null;
                  settling.current = false;
                  setDragging(false);
                  policy.emitHaptic("drag-end");
                };
                if (!rect || !policy.enabled || policy.reducedMotion) {
                  finish();
                  return;
                }
                let pending = 2;
                const complete = () => {
                  if (--pending === 0) finish();
                };
                settleAnimations.current = [
                  animate(dragX, rect.x, {
                    ...transition,
                    onComplete: complete,
                  }),
                  animate(dragY, rect.y, {
                    ...transition,
                    onComplete: complete,
                  }),
                ];
              }}
              onPointerCancel={cancel}
            >
              Move
            </button>
            {renderItem(item, index)}
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(id, index - 1)}
            >
              Move earlier
            </button>
            <button
              type="button"
              disabled={index === items.length - 1}
              onClick={() => move(id, index + 1)}
            >
              Move later
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
