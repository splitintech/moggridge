import React, { forwardRef, useEffect } from 'react';
import { animate, motion, useMotionValue, type HTMLMotionProps, type MotionValue } from 'framer-motion';
import { cardMotionPresets, clampSlideIndex, surfaceImageScale, type SpringSpec } from '../core';
import { useMotionPolicy } from './provider';

/** Uniform image pullback driven by the host's reversible progress, without React frame updates. */
export function useSurfaceImageScale(
  progress?: MotionValue<number>,
  { enabled = true, scales = cardMotionPresets.imageScale }: {
    enabled?: boolean;
    scales?: readonly [number, number, number];
  } = {},
) {
  const policy = useMotionPolicy();
  const active = enabled && policy.enabled && !policy.reducedMotion;
  const [start, middle, end] = scales;
  const scale = useMotionValue(active ? surfaceImageScale(progress?.get() ?? 1, scales) : end);
  useEffect(() => {
    const update = (value: number) => scale.set(active ? surfaceImageScale(value, [start, middle, end]) : end);
    update(progress?.get() ?? 1);
    return progress?.on('change', update);
  }, [progress, scale, active, start, middle, end]);
  return scale;
}

export interface SurfaceSlideTrackProps extends Omit<HTMLMotionProps<'div'>, 'animate' | 'initial' | 'transition'> {
  index: number;
  slideCount: number;
  spring?: Partial<SpringSpec>;
}

/** Controlled full-width slide track. The host owns selection, buttons and slide accessibility. */
export const SurfaceSlideTrack = forwardRef<HTMLDivElement, SurfaceSlideTrackProps>(function SurfaceSlideTrack(
  { index, slideCount, spring, style, ...props }, ref,
) {
  const policy = useMotionPolicy();
  const target = `${clampSlideIndex(index, slideCount) * -100}%`;
  const x = useMotionValue(target);
  const { stiffness, damping, mass } = { ...cardMotionPresets.slide, ...spring };
  useEffect(() => {
    if (!policy.enabled || policy.reducedMotion) {
      x.jump(target);
      return;
    }
    const animation = animate(x, target, { type: 'spring', stiffness, damping, mass });
    const settle = () => { if (document.hidden) { animation.stop(); x.jump(target); } };
    document.addEventListener('visibilitychange', settle);
    return () => { animation.stop(); document.removeEventListener('visibilitychange', settle); };
  }, [x, target, policy.enabled, policy.reducedMotion, stiffness, damping, mass]);
  return <motion.div {...props} ref={ref} initial={false} style={{ ...style, x }} />;
});
