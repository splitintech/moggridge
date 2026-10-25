import React, { forwardRef, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";
import { useMotionPolicy, useMotionTransition } from "./provider";
export interface PressableSurfaceProps extends HTMLMotionProps<"button"> {
  variant?: "compression" | "mechanical";
  compression?: number;
  displacement?: number;
}
export const PressableSurface = forwardRef<
  HTMLButtonElement,
  PressableSurfaceProps
>(function PressableSurface(
  {
    variant = "compression",
    compression = 0.97,
    displacement = 3,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const policy = useMotionPolicy();
  const transition = useMotionTransition();
  return (
    <motion.button
      type="button"
      {...props}
      ref={ref}
      disabled={disabled}
      transition={transition}
      whileTap={
        !disabled && policy.enabled && !policy.reducedMotion
          ? variant === "mechanical"
            ? { y: displacement, boxShadow: "0 0 0 transparent" }
            : { scale: compression }
          : undefined
      }
    >
      {children}
    </motion.button>
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
  const [box, setBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const transition = useMotionTransition();
  useEffect(() => {
    if (!target) return;
    const measure = () => {
      const a = target.getBoundingClientRect(),
        b = (container ?? target.offsetParent)?.getBoundingClientRect();
      setBox({
        x: a.x - (b?.x ?? 0),
        y: a.y - (b?.y ?? 0),
        width: a.width,
        height: a.height,
      });
    };
    measure();
    const ro =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    ro?.observe(target);
    if (container) ro?.observe(container);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [target, container]);
  return (
    <motion.div
      {...props}
      aria-hidden
      initial={false}
      animate={box}
      transition={transition}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        ...props.style,
      }}
    />
  );
}
export const LayoutFlow = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  function LayoutFlow(props, ref) {
    const p = useMotionPolicy();
    return (
      <motion.div
        {...props}
        ref={ref}
        layout={p.enabled && !p.reducedMotion ? "position" : false}
        transition={{ ...useMotionTransition(), ...props.transition }}
      />
    );
  },
);
export interface FavoriteButtonProps
  extends Omit<PressableSurfaceProps, "onChange"> {
  selected: boolean;
  pending?: boolean;
  onSelectedChange: (selected: boolean) => void;
  label: string;
}
export function FavoriteButton({
  selected,
  pending,
  onSelectedChange,
  label,
  children,
  ...props
}: FavoriteButtonProps) {
  const p = useMotionPolicy();
  return (
    <PressableSurface
      {...props}
      aria-label={label}
      aria-pressed={selected}
      aria-busy={pending}
      disabled={props.disabled || pending}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) {
          p.emitHaptic("selection");
          onSelectedChange(!selected);
        }
      }}
    >
      <motion.span
        style={{ display: "inline-block" }}
        animate={{
          scale:
            selected && p.enabled && !p.reducedMotion ? [1, 1.2, 0.95, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.span>
    </PressableSurface>
  );
}
export interface SettlingProgressProps {
  value: number;
  max?: number;
  label: string;
  className?: string;
  children?: React.ReactNode;
}
export function SettlingProgress({
  value,
  max = 100,
  label,
  className,
  children,
}: SettlingProgressProps) {
  const p = useMotionPolicy();
  const ratio = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const progress = useMotionValue(ratio);
  const scaleX = useTransform(progress, (v) => Math.min(v, ratio));
  useEffect(() => {
    const a = animate(progress, ratio, {
      duration: p.enabled && !p.reducedMotion ? 0.25 : 0,
      ease: "easeOut",
    });
    return () => a.stop();
  }, [ratio, progress, p.enabled, p.reducedMotion]);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.max(0, Math.min(max, value))}
      className={className}
    >
      <motion.div style={{ scaleX, transformOrigin: "left center" }}>
        {children ?? <div style={{ height: 4, background: "currentColor" }} />}
      </motion.div>
    </div>
  );
}
export interface AnticipationProps extends HTMLMotionProps<"div"> {
  active: boolean;
  amount?: number;
}
export function Anticipation({
  active,
  amount = 0.12,
  children,
  ...props
}: AnticipationProps) {
  const p = useMotionPolicy();
  return (
    <div>
      <motion.div
        {...props}
        animate={{
          scaleX:
            active && p.enabled && !p.reducedMotion
              ? [1, 1 + amount, 1 - amount, 1]
              : 1,
          scaleY:
            active && p.enabled && !p.reducedMotion
              ? [1, 1 - amount, 1 + amount, 1]
              : 1,
        }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
export interface AnimatedNumberProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  format?: (value: number) => string;
  className?: string;
}
export function AnimatedNumber({
  value,
  format = String,
  className,
  ...props
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const v = useMotionValue(value);
  const p = useMotionPolicy();
  useEffect(
    () =>
      v.on("change", (n) => {
        if (ref.current) ref.current.textContent = format(n);
      }),
    [v, format],
  );
  useEffect(() => {
    const a = animate(v, value, {
      duration: p.enabled && !p.reducedMotion ? 0.35 : 0,
    });
    return () => a.stop();
  }, [value, v, p.enabled, p.reducedMotion]);
  return (
    <span className={className} aria-label={format(value)} {...props}>
      <span ref={ref} aria-hidden>
        {format(value)}
      </span>
    </span>
  );
}
export function AnimatedText({ children, ...props }: HTMLMotionProps<"span">) {
  const p = useMotionPolicy();
  return (
    <motion.span
      {...props}
      initial={
        p.enabled && !p.reducedMotion
          ? (props.initial ?? { opacity: 0, y: 6 })
          : false
      }
      animate={props.animate ?? { opacity: 1, y: 0 }}
      transition={{ ...useMotionTransition(), ...props.transition }}
    >
      {children}
    </motion.span>
  );
}
export function StaggerGroup({
  children,
  delay = 0.045,
  initialDelay = 0,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; initialDelay?: number }) {
  const p = useMotionPolicy();
  return (
    <motion.div {...props}>
      {React.Children.map(children as React.ReactNode, (child, i) => (
        <motion.div
          initial={p.enabled && !p.reducedMotion ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: p.enabled && !p.reducedMotion ? 0.25 : 0,
            delay: p.enabled && !p.reducedMotion ? initialDelay + i * delay : 0,
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
export function TiltSurface({
  maxTilt = 6,
  ...props
}: HTMLMotionProps<"div"> & { maxTilt?: number }) {
  const p = useMotionPolicy();
  const x = useMotionValue(0),
    y = useMotionValue(0);
  return (
    <motion.div
      {...props}
      style={{
        ...props.style,
        rotateX: x,
        rotateY: y,
        transformPerspective: 800,
      }}
      onPointerMove={(e) => {
        props.onPointerMove?.(e);
        if (!p.enabled || p.reducedMotion || e.pointerType === "touch") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((0.5 - (e.clientY - r.y) / r.height) * maxTilt * 2);
        y.set(((e.clientX - r.x) / r.width - 0.5) * maxTilt * 2);
      }}
      onPointerLeave={(e) => {
        props.onPointerLeave?.(e);
        x.set(0);
        y.set(0);
      }}
    />
  );
}
export interface RewardSequenceProps {
  eventId: string | number | null;
  confirmed: boolean;
  children?: React.ReactNode;
  onComplete?: () => void;
  particleCount?: number;
}
export function RewardSequence({
  eventId,
  confirmed,
  children,
  onComplete,
  particleCount = 12,
}: RewardSequenceProps) {
  const p = useMotionPolicy();
  const progress = useMotionValue(0);
  const seen = useRef(new Set<string | number>());
  const done = useRef(onComplete);
  done.current = onComplete;
  const [run, setRun] = useState<string | number | null>(null);
  useEffect(() => {
    if (!confirmed || eventId === null || seen.current.has(eventId)) return;
    seen.current.add(eventId);
    setRun(eventId);
    progress.set(0);
    p.emitHaptic("success", `reward:${eventId}`);
    const a = animate(progress, 1, {
      duration: p.enabled && !p.reducedMotion ? 0.7 : 0,
      onComplete: () => done.current?.(),
    });
    return () => a.stop();
  }, [eventId, confirmed, progress, p.enabled, p.reducedMotion, p.emitHaptic]);
  return (
    <div style={{ position: "relative" }}>
      {children}
      {confirmed &&
        run !== null &&
        p.enabled &&
        !p.reducedMotion &&
        Array.from(
          { length: Math.min(100, Math.max(0, particleCount)) },
          (_, i) => (
            <RewardParticle
              key={`${run}:${i}`}
              index={i}
              seed={String(run)}
              progress={progress}
            />
          ),
        )}
    </div>
  );
}
function RewardParticle({
  index,
  seed,
  progress,
}: {
  index: number;
  seed: string;
  progress: ReturnType<typeof useMotionValue<number>>;
}) {
  const hash = [...seed].reduce(
    (a, c) => (a * 31 + c.charCodeAt(0)) >>> 0,
    index + 1,
  );
  const angle = (hash % 628) / 100;
  const distance = 25 + (hash % 65);
  const x = useTransform(progress, (v) => Math.cos(angle) * distance * v),
    y = useTransform(
      progress,
      (v) => Math.sin(angle) * distance * v + 35 * v * v,
    ),
    opacity = useTransform(progress, [0, 0.1, 1], [0, 1, 0]);
  return (
    <motion.i
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 4,
        height: 4,
        background: "currentColor",
        borderRadius: "50%",
        pointerEvents: "none",
        x,
        y,
        opacity,
      }}
    />
  );
}
