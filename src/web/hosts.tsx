import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useId,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { MotionEvent, Rect, SurfaceSpringSpec } from "../core";
import { useMotionPolicy } from "./provider";
export type SurfacePresentation =
  | "fullscreen"
  | "right"
  | "start"
  | "end"
  | "anchored";
export interface SurfaceRequest {
  id: string;
  /** Use false for media whose stable parent lives outside the dialog focus scope. */
  modal?: boolean;
  source?: HTMLElement | null;
  fallbackFocus?: HTMLElement | null;
  label: string;
  description?: string;
  /** Custom content supplies a visible close control; accessible labels remain in the host. */
  chrome?: "default" | "custom";
  presentation?: SurfacePresentation;
  destination?: Rect;
  radius?: number;
  /** Per-surface tuning; omitted values inherit the provider preset. */
  spring?: Partial<SurfaceSpringSpec>;
  /** Surface stacking layer; backdrop uses one layer below. */
  zIndex?: number;
  sourceContent?: React.ReactNode;
  content:
    | React.ReactNode
    | ((close: () => void, progress: MotionValue<number>) => React.ReactNode);
  onClose?: () => void;
  onEvent?: (event: MotionEvent) => void;
}
interface TransitionContextValue {
  open: (request: SurfaceRequest) => void;
  close: () => void;
  activeId: string | null;
  progress: MotionValue<number>;
}
const TransitionContext = createContext<TransitionContextValue | null>(null);
export function useTransitionHost() {
  const value = useContext(TransitionContext);
  if (!value) throw new Error("A TransitionHost is required");
  return value;
}
const empty: Rect = { x: 0, y: 0, width: 1, height: 1 };
const visuallyHidden: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0,
};
function sourceRect(element?: HTMLElement | null): Rect | null {
  if (!element?.isConnected) return null;
  const r = element.getBoundingClientRect();
  return r.width > 0 &&
    r.height > 0 &&
    r.bottom > 0 &&
    r.right > 0 &&
    r.top < window.innerHeight &&
    r.left < window.innerWidth
    ? { x: r.x, y: r.y, width: r.width, height: r.height }
    : null;
}
function destinationRect(request: SurfaceRequest, source: Rect): Rect {
  if (request.destination) return request.destination;
  if (!request.presentation || request.presentation === "fullscreen")
    return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  const inset = 16,
    width = Math.max(1, Math.min(860, window.innerWidth - 32)),
    height = Math.max(1, Math.min(650, window.innerHeight - 32)),
    rtl =
      getComputedStyle(request.source ?? document.documentElement).direction ===
      "rtl",
    left =
      request.presentation === "start"
        ? !rtl
        : request.presentation === "end"
          ? rtl
          : false;
  const right = Math.min(
    window.innerWidth - inset,
    Math.max(source.x + source.width, width + inset),
  );
  return {
    x:
      request.presentation === "anchored"
        ? Math.max(inset, Math.min(source.x, window.innerWidth - width - inset))
        : left
          ? inset
          : right - width,
    y: Math.max(
      inset,
      Math.min(
        source.y + source.height / 2 - height / 2,
        window.innerHeight - inset - height,
      ),
    ),
    width,
    height,
  };
}
/** A nonmodal media surface intentionally has no focus loop or aria-hiding boundary. */
function NonModalContent({
  children,
  onCloseAutoFocus,
  onEscapeKeyDown,
  asChild: _asChild,
  ...props
}: React.ComponentProps<typeof Dialog.Content>) {
  const node = useRef<HTMLElement | null>(null);
  const callbacks = useRef({ onCloseAutoFocus, onEscapeKeyDown });
  callbacks.current = { onCloseAutoFocus, onEscapeKeyDown };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    node.current
      ?.querySelector<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex="0"]',
      )
      ?.focus();
    const escape = (event: KeyboardEvent) => {
      const target = event.target as Element | null;
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        (node.current?.contains(target) ||
          target?.closest?.("[data-media-host]"))
      )
        callbacks.current.onEscapeKeyDown?.(event);
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      const event = new Event("closeAutoFocus", { cancelable: true });
      callbacks.current.onCloseAutoFocus?.(event);
      if (!event.defaultPrevented) previous?.focus();
    };
  }, []);
  return React.cloneElement(children as React.ReactElement<any>, {
    ...props,
    role: "dialog",
    ref: (value: HTMLElement | null) => {
      node.current = value;
    },
  });
}

export function TransitionHost({ children }: { children?: React.ReactNode }) {
  const descriptionId = useId();
  const [request, setRequest] = useState<SurfaceRequest | null>(null),
    [expanded, setExpanded] = useState(false),
    [frame, setFrame] = useState({
      source: empty,
      destination: empty,
      fallback: false,
    }),
    progress = useMotionValue(0),
    policy = useMotionPolicy(),
    requestRef = useRef(request),
    run = useRef(0);
  requestRef.current = request;
  // Independent physical coordinates preserve their own velocities across arbitrary retargets.
  const x = useMotionValue(0),
    y = useMotionValue(0),
    width = useMotionValue(1),
    height = useMotionValue(1);
  const close = useCallback(() => {
    const current = requestRef.current;
    if (!current) return;
    const source = sourceRect(current.source);
    setFrame((old) => ({
      ...old,
      source: source ?? old.source,
      fallback: !source,
    }));
    setExpanded(false);
  }, [progress]);
  const open = useCallback(
    (next: SurfaceRequest) => {
      const measuredSource = sourceRect(next.source);
      const destination = destinationRect(next, measuredSource ?? empty);
      const source = measuredSource ?? destination;
      setFrame({ source, destination, fallback: !measuredSource });
      if (!requestRef.current) {
        x.jump(source.x);
        y.jump(source.y);
        width.jump(source.width);
        height.jump(source.height);
        progress.jump(0);
      }
      setRequest(next);
      setExpanded(true);
    },
    [progress],
  );
  const radius = useTransform(
      progress,
      (value) =>
        (request?.radius ?? 16) * (1 - value) +
        (request?.presentation && request.presentation !== "fullscreen"
          ? 24
          : 0) *
          value,
    ),
    opacity = useTransform(progress, (value) => (frame.fallback ? value : 1)),
    backdrop = useTransform(progress, (value) => value * 0.48),
    sourceOpacity = useTransform(progress, [0, 0.65, 0.96, 1], [1, 1, 0, 0]),
    contentOpacity = useTransform(progress, [0, 0.65, 0.96, 1], [0, 0, 1, 1]),
    sourceScale = useTransform(progress, [0, 1], [1, 0.96]);
  useEffect(() => {
    if (!request) return;
    const id = ++run.current;
    let terminated = false;
    request.onEvent?.({ id, phase: "start" });
    policy.diagnostics?.({ id, phase: "start" });
    const target = expanded ? frame.destination : frame.source;
    const settings =
      policy.enabled && !policy.reducedMotion
        ? { type: "spring" as const, ...policy.preset, ...request.spring }
        : { duration: 0 };
    let pending = 5;
    const completed = () => {
      if (--pending !== 0 || terminated) return;
      terminated = true;
      request.onEvent?.({ id, phase: "complete" });
      policy.diagnostics?.({ id, phase: "complete" });
      if (!expanded) {
        setRequest(null);
        request.onClose?.();
      }
    };
    const geometry = (
      [
        [x, target.x],
        [y, target.y],
        [width, target.width],
        [height, target.height],
      ] as const
    ).map(([value, to]) =>
      animate(value, to, {
        ...settings,
        velocity: value.getVelocity(),
        onComplete: completed,
      }),
    );
    const animation = animate(progress, expanded ? 1 : 0, {
      ...(policy.enabled && !policy.reducedMotion
        ? { type: "spring" as const, ...policy.preset, ...request.spring }
        : { duration: 0 }),
      onComplete: completed,
    });
    const background = () => {
      if (!document.hidden || terminated) return;
      animation.stop();
      geometry.forEach((item) => item.stop());
      x.jump(target.x);
      y.jump(target.y);
      width.jump(target.width);
      height.jump(target.height);
      progress.jump(expanded ? 1 : 0);
      pending = 1;
      completed();
    };
    document.addEventListener("visibilitychange", background);
    return () => {
      document.removeEventListener("visibilitychange", background);
      animation.stop();
      geometry.forEach((animation) => animation.stop());
      if (!terminated) {
        terminated = true;
        request.onEvent?.({ id, phase: "cancel", reason: "interrupted" });
        policy.diagnostics?.({ id, phase: "cancel", reason: "interrupted" });
      }
    };
  }, [
    request,
    expanded,
    frame,
    progress,
    policy.enabled,
    policy.reducedMotion,
    policy.preset,
  ]);
  useEffect(() => {
    if (!request) return;
    const measure = () =>
      setFrame((old) => {
        const source = sourceRect(request.source);
        return {
          source: source ?? old.source,
          destination: destinationRect(request, source ?? old.source),
          fallback: !source,
        };
      });
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [request]);
  const Content = request?.modal === false ? NonModalContent : Dialog.Content;
  return (
    <TransitionContext.Provider
      value={{ open, close, activeId: request?.id ?? null, progress }}
    >
      {children}
      <Dialog.Root
        modal={request?.modal ?? true}
        open={!!request}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <Dialog.Portal>
          {request && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "black",
                    opacity: backdrop,
                    zIndex: (request.zIndex ?? 1001) - 1,
                  }}
                />
              </Dialog.Overlay>
              <Content
                asChild
                aria-label={request.modal === false ? request.label : undefined}
                onEscapeKeyDown={(event) => {
                  event.preventDefault();
                  close();
                }}
                aria-describedby={
                  request.description ? descriptionId : undefined
                }
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  if (request.source?.isConnected) request.source.focus();
                  else if (request.fallbackFocus?.isConnected)
                    request.fallbackFocus.focus();
                  else {
                    const previous = document.body.getAttribute("tabindex");
                    document.body.tabIndex = -1;
                    document.body.focus();
                    if (previous === null)
                      document.body.removeAttribute("tabindex");
                    else document.body.setAttribute("tabindex", previous);
                  }
                }}
              >
                <motion.section
                  style={{
                    position: "fixed",
                    left: 0,
                    top: 0,
                    x,
                    y,
                    width,
                    height,
                    borderRadius: radius,
                    opacity,
                    overflow: "hidden",
                    background: "Canvas",
                    color: "CanvasText",
                    zIndex: request.zIndex ?? 1001,
                  }}
                >
                  {request.sourceContent && (
                    <motion.div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: sourceOpacity,
                        scale: sourceScale,
                        pointerEvents: "none",
                      }}
                    >
                      {request.sourceContent}
                    </motion.div>
                  )}
                  <motion.div
                    style={{
                      height: "100%",
                      overflow: "auto",
                      opacity: request.sourceContent ? contentOpacity : 1,
                    }}
                  >
                    <Dialog.Title style={request.chrome === "custom" ? visuallyHidden : undefined}>{request.label}</Dialog.Title>
                    {request.description && (
                      <Dialog.Description id={descriptionId} style={request.chrome === "custom" ? visuallyHidden : undefined}>
                        {request.description}
                      </Dialog.Description>
                    )}
                    {request.chrome !== "custom" && <button type="button" onClick={close}>
                      Close
                    </button>}
                    {typeof request.content === "function"
                      ? request.content(close, progress)
                      : request.content}
                  </motion.div>
                </motion.section>
              </Content>
            </>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </TransitionContext.Provider>
  );
}
export interface MorphingSurfaceProps
  extends Omit<SurfaceRequest, "source" | "content"> {
  trigger: React.ReactNode;
  children: SurfaceRequest["content"];
  triggerClassName?: string;
}
export function MorphingSurface({
  trigger,
  children,
  triggerClassName,
  ...request
}: MorphingSurfaceProps) {
  const host = useTransitionHost(),
    ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      type="button"
      ref={ref}
      className={triggerClassName}
      style={{ opacity: host.activeId === request.id ? 0 : 1 }}
      aria-haspopup="dialog"
      aria-expanded={host.activeId === request.id}
      onClick={() =>
        host.activeId === request.id
          ? host.close()
          : host.open({ ...request, source: ref.current, content: children })
      }
    >
      {trigger}
    </button>
  );
}
