import { rewardTimeline, type RewardStage } from "../core";
import React, { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";
import { useMotionPolicy, useMotionTransition } from "./provider";
export interface AnimatedNumberProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  format?: (value: number) => string;
}
export function AnimatedNumber({
  value,
  format = String,
  ...props
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null),
    current = useMotionValue(value),
    policy = useMotionPolicy();
  useEffect(() => {
    if (ref.current) ref.current.textContent = format(current.get());
    return current.on("change", (value) => {
      if (ref.current) ref.current.textContent = format(value);
    });
  }, [current, format]);
  useEffect(() => {
    const animation = animate(current, value, {
      duration: policy.enabled && !policy.reducedMotion ? 0.35 : 0,
    });
    return () => animation.stop();
  }, [value, current, policy.enabled, policy.reducedMotion]);
  return (
    <span aria-label={format(value)} {...props}>
      <span ref={ref} aria-hidden>
        {format(value)}
      </span>
    </span>
  );
}
export function AnimatedText({ children, ...props }: HTMLMotionProps<"span">) {
  const policy = useMotionPolicy();
  return (
    <motion.span
      {...props}
      initial={
        policy.enabled && !policy.reducedMotion
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
}: Omit<HTMLMotionProps<"div">, "children"> & {
  children?: React.ReactNode;
  delay?: number;
  initialDelay?: number;
}) {
  const policy = useMotionPolicy();
  return (
    <motion.div {...props}>
      {React.Children.map(children, (child, index) => (
        <motion.div
          initial={
            policy.enabled && !policy.reducedMotion
              ? { opacity: 0, y: 8 }
              : false
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: policy.enabled && !policy.reducedMotion ? 0.25 : 0,
            delay:
              policy.enabled && !policy.reducedMotion
                ? initialDelay + index * delay
                : 0,
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
  const policy = useMotionPolicy(),
    x = useMotionValue(0),
    y = useMotionValue(0);
  useEffect(() => {
    if (!policy.enabled || policy.reducedMotion) {
      x.set(0);
      y.set(0);
    }
  }, [policy.enabled, policy.reducedMotion, x, y]);
  return (
    <motion.div
      {...props}
      style={{
        ...props.style,
        rotateX: x,
        rotateY: y,
        transformPerspective: 800,
      }}
      onPointerMove={(event) => {
        props.onPointerMove?.(event);
        if (
          !policy.enabled ||
          policy.reducedMotion ||
          event.pointerType === "touch"
        )
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((0.5 - (event.clientY - rect.y) / rect.height) * maxTilt * 2);
        y.set(((event.clientX - rect.x) / rect.width - 0.5) * maxTilt * 2);
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        x.set(0);
        y.set(0);
      }}
    />
  );
}
export interface SettlingProgressProps {
  value: number;
  max?: number;
  label: string;
  children?: React.ReactNode;
  className?: string;
}
export function SettlingProgress({
  value,
  max = 100,
  label,
  children,
  className,
}: SettlingProgressProps) {
  const safeMax = Math.max(1, max),
    ratio = Math.max(0, Math.min(1, value / safeMax)),
    progress = useMotionValue(ratio),
    policy = useMotionPolicy();
  const scaleX = useTransform(progress, (current) => Math.min(current, ratio));
  useEffect(() => {
    if (progress.get() > ratio) progress.set(ratio);
    const animation = animate(progress, ratio, {
      duration: policy.enabled && !policy.reducedMotion ? 0.25 : 0,
      ease: "easeOut",
    });
    return () => animation.stop();
  }, [ratio, progress, policy.enabled, policy.reducedMotion]);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.max(0, Math.min(safeMax, value))}
      className={className}
    >
      <motion.div style={{ scaleX, transformOrigin: "left center" }}>
        {children ?? <div style={{ height: 4, background: "currentColor" }} />}
      </motion.div>
    </div>
  );
}
export function Anticipation({
  active,
  amount = 0.12,
  children,
  ...props
}: HTMLMotionProps<"div"> & { active: boolean; amount?: number }) {
  const policy = useMotionPolicy();
  const run = active && policy.enabled && !policy.reducedMotion;
  return (
    <div>
      <motion.div
        {...props}
        animate={{
          scaleX: run ? [1, 1 + amount, 1 - amount, 1] : 1,
          scaleY: run ? [1, 1 - amount, 1 + amount, 1] : 1,
        }}
        transition={{ duration: run ? 0.4 : 0 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
export interface RewardSequenceProps {
  eventId: string | number | null;
  confirmed: boolean;
  children?: React.ReactNode;
  particleCount?: number;
  durationMs?: number;
  stages?: readonly RewardStage[];
  onStage?: (id: string) => void;
  onComplete?: () => void;
  onCancel?: () => void;
}
export function RewardSequence({
  eventId,
  confirmed,
  children,
  particleCount = 12,
  durationMs = 700,
  stages = [],
  onStage,
  onComplete,
  onCancel,
}: RewardSequenceProps) {
  const policy = useMotionPolicy(),
    progress = useMotionValue(1),
    seen = useRef(new Set<string | number>()),
    callbacks = useRef({ onComplete, onCancel, onStage });
  callbacks.current = { onComplete, onCancel, onStage };
  const timeline = useRef({ stages, durationMs });
  timeline.current = { stages: rewardTimeline(stages, durationMs), durationMs };
  const dispatchRef = useRef<(value: number) => void>(() => {});
  const running = useRef<string | number | null>(null);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  useEffect(() => {
    if (!confirmed || eventId === null) {
      animation.current?.stop();
      if (running.current !== null) callbacks.current.onCancel?.();
      running.current = null;
      progress.set(1);
      return;
    }
    if (seen.current.has(eventId)) return;
    animation.current?.stop();
    if (running.current !== null) callbacks.current.onCancel?.();
    seen.current.add(eventId);
    if (seen.current.size > 512)
      seen.current.delete(seen.current.values().next().value!);
    running.current = eventId;
    progress.set(0);
    policy.emitHaptic("success", `reward:${eventId}`);
    const pending = [...timeline.current.stages],
      duration = timeline.current.durationMs;
    const dispatch = (value: number) => {
      while (pending.length && pending[0].atMs <= value * duration)
        callbacks.current.onStage?.(pending.shift()!.id);
    };
    dispatchRef.current = dispatch;
    dispatch(0);
    animation.current = animate(progress, 1, {
      duration:
        policy.enabled && !policy.reducedMotion
          ? timeline.current.durationMs / 1000
          : 0,
      onUpdate: dispatch,
      onComplete: () => {
        if (running.current !== eventId) return;
        dispatch(1);
        running.current = null;
        callbacks.current.onComplete?.();
      },
    });
  }, [eventId, confirmed, progress, policy.emitHaptic]);
  useEffect(() => {
    if ((!policy.enabled || policy.reducedMotion) && running.current !== null) {
      animation.current?.stop();
      progress.set(1);
      dispatchRef.current(1);
      running.current = null;
      callbacks.current.onComplete?.();
    }
  }, [policy.enabled, policy.reducedMotion, progress]);
  useEffect(() => {
    const cancel = () => {
      animation.current?.stop();
      if (running.current !== null) callbacks.current.onCancel?.();
      running.current = null;
      progress.jump(1);
    };
    const background = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", background);
    return () => {
      document.removeEventListener("visibilitychange", background);
      cancel();
    };
  }, [progress]);
  return (
    <div style={{ position: "relative" }}>
      {children}
      {confirmed &&
        eventId !== null &&
        policy.enabled &&
        !policy.reducedMotion &&
        Array.from(
          { length: Math.max(0, Math.min(100, particleCount)) },
          (_, index) => (
            <Particle
              key={index}
              index={index}
              seed={String(eventId)}
              progress={progress}
            />
          ),
        )}
    </div>
  );
}
function Particle({
  index,
  seed,
  progress,
}: {
  index: number;
  seed: string;
  progress: ReturnType<typeof useMotionValue<number>>;
}) {
  const hash = [...seed].reduce(
      (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
      (index + 1) * 997,
    ),
    angle = (hash % 628) / 100,
    distance = 25 + (hash % 65);
  const x = useTransform(
      progress,
      (value) => Math.cos(angle) * distance * value,
    ),
    y = useTransform(
      progress,
      (value) => Math.sin(angle) * distance * value + 35 * value * value,
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
        borderRadius: "50%",
        background: "currentColor",
        pointerEvents: "none",
        x,
        y,
        opacity,
      }}
    />
  );
}
