import { useRetainedPresence } from "./presence";
import React, { forwardRef, useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";
import * as Popover from "@radix-ui/react-popover";
import { useMotionPolicy, useMotionTransition } from "./provider";
export interface PressableSurfaceProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "compression" | "mechanical";
  compression?: number;
  displacement?: number;
  visualClassName?: string;
  visualStyle?: React.CSSProperties;
}
export const PressableSurface = forwardRef<
  HTMLButtonElement,
  PressableSurfaceProps
>(function PressableSurface(
  {
    variant = "compression",
    compression = 0.97,
    displacement = 3,
    disabled,
    children,
    visualClassName,
    visualStyle,
    ...props
  },
  ref,
) {
  const policy = useMotionPolicy(),
    transition = useMotionTransition();
  const [pressed, setPressed] = useState(false);
  const enabled = !disabled && policy.enabled && !policy.reducedMotion;
  useEffect(() => {
    if (!enabled) setPressed(false);
  }, [enabled]);
  return (
    <button
      type="button"
      {...props}
      ref={ref}
      disabled={disabled}
      onPointerDown={(event) => {
        props.onPointerDown?.(event);
        if (!event.defaultPrevented && event.button === 0 && !disabled) {
          setPressed(true);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }
      }}
      onPointerUp={(event) => {
        props.onPointerUp?.(event);
        setPressed(false);
      }}
      onPointerCancel={(event) => {
        props.onPointerCancel?.(event);
        setPressed(false);
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        setPressed(false);
      }}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (
          !event.defaultPrevented &&
          (event.key === " " || event.key === "Enter")
        )
          setPressed(true);
      }}
      onKeyUp={(event) => {
        props.onKeyUp?.(event);
        setPressed(false);
      }}
      onBlur={(event) => {
        props.onBlur?.(event);
        setPressed(false);
      }}
    >
      <motion.span
        className={visualClassName}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          ...visualStyle,
        }}
        animate={
          pressed && enabled
            ? variant === "mechanical"
              ? { y: displacement, scale: 1, boxShadow: "0 0 0 transparent" }
              : { scale: compression, y: 0 }
            : { scale: 1, y: 0, boxShadow: visualStyle?.boxShadow ?? "none" }
        }
        transition={transition}
      >
        {children}
      </motion.span>
    </button>
  );
});

export interface SelectionIndicatorProps extends HTMLMotionProps<"div"> {
  target: HTMLElement | null;
  container?: HTMLElement | null;
}
export function SelectionIndicator({
  target,
  container,
  ...props
}: SelectionIndicatorProps) {
  const [rect, setRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const transition = useMotionTransition();
  useEffect(() => {
    if (!target) return;
    const measure = () => {
      const a = target.getBoundingClientRect(),
        parent = container ?? (target.offsetParent as HTMLElement | null),
        b = parent?.getBoundingClientRect();
      setRect({
        x: a.x - (b?.x ?? 0) + (parent?.scrollLeft ?? 0),
        y: a.y - (b?.y ?? 0) + (parent?.scrollTop ?? 0),
        width: a.width,
        height: a.height,
      });
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(target);
    if (container) observer?.observe(container);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [target, container]);
  return (
    <motion.div
      {...props}
      aria-hidden
      initial={false}
      animate={rect}
      transition={transition}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        ...props.style,
      }}
    />
  );
}
/** Keyed LayoutFlowItem children retain their DOM until their exit finishes. */
export const LayoutFlow = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  function LayoutFlow({ children, ...props }, ref) {
    const policy = useMotionPolicy();
    return (
      <motion.div
        {...props}
        ref={ref}
        layout={
          policy.enabled && !policy.reducedMotion
            ? (props.layout ?? "position")
            : false
        }
        transition={{ ...useMotionTransition(), ...props.transition }}
      >
        <AnimatePresence initial={false}>
          {children as React.ReactNode}
        </AnimatePresence>
      </motion.div>
    );
  },
);
export const LayoutFlowItem = forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(function LayoutFlowItem({ children, ...props }, ref) {
  const policy = useMotionPolicy();
  const enabled = policy.enabled && !policy.reducedMotion;
  return (
    <motion.div
      {...props}
      ref={ref}
      layout={enabled ? (props.layout ?? "size") : false}
      initial={enabled ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ ...useMotionTransition(), ...props.transition }}
    >
      <motion.div layout={enabled ? "position" : false}>
        {children as React.ReactNode}
      </motion.div>
    </motion.div>
  );
});
export interface FavoriteButtonProps
  extends Omit<PressableSurfaceProps, "onChange"> {
  selected: boolean;
  pending?: boolean;
  label: string;
  onSelectedChange: (selected: boolean) => void;
}
export function FavoriteButton({
  selected,
  pending,
  label,
  onSelectedChange,
  children,
  ...props
}: FavoriteButtonProps) {
  const policy = useMotionPolicy();
  return (
    <PressableSurface
      {...props}
      aria-label={label}
      aria-pressed={selected}
      aria-busy={pending}
      disabled={props.disabled || pending}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          policy.emitHaptic("selection");
          onSelectedChange(!selected);
        }
      }}
    >
      <motion.span
        style={{ display: "inline-block" }}
        animate={{
          scale:
            selected && policy.enabled && !policy.reducedMotion
              ? [1, 1.18, 0.96, 1]
              : 1,
        }}
        transition={{
          duration: policy.enabled && !policy.reducedMotion ? 0.3 : 0,
        }}
      >
        {children}
      </motion.span>
    </PressableSurface>
  );
}
export interface AnchoredMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  label: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "top" | "right" | "bottom" | "left";
}
/** Accessible popover for host-provided actions; host owns menuitem semantics when required. */
export function AnchoredMenu({
  trigger,
  children,
  label,
  open,
  onOpenChange,
  side = "bottom",
}: AnchoredMenuProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const requested = open ?? localOpen;
  const { present, progress } = useRetainedPresence(requested);
  const scale = useTransform(progress, [0, 1], [0.94, 1]);
  const change = (next: boolean) => {
    if (open === undefined) setLocalOpen(next);
    onOpenChange?.(next);
  };
  return (
    <Popover.Root open={present || requested} onOpenChange={change}>
      <Popover.Trigger
        asChild
        onClick={(event) => {
          if (present && !requested) {
            event.preventDefault();
            change(true);
          }
        }}
      >
        {trigger}
      </Popover.Trigger>
      <Popover.Portal forceMount>
        {(present || requested) && (
          <Popover.Content
            forceMount
            side={side}
            collisionPadding={8}
            aria-label={label}
            asChild
          >
            <motion.div
              style={{
                opacity: progress,
                scale,
                transformOrigin:
                  "var(--radix-popover-content-transform-origin)",
                maxHeight: "var(--radix-popover-content-available-height)",
                overflowY: "auto",
              }}
            >
              {children}
            </motion.div>
          </Popover.Content>
        )}
      </Popover.Portal>
    </Popover.Root>
  );
}
