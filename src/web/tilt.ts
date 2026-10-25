import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react';
import { useMotionPolicy } from './provider';

export interface TiltTarget {
  rotateX: number; rotateY: number; glareX: number; glareY: number; glareOpacity: number; scale: number;
}
export const defaultTiltTarget: Readonly<TiltTarget> = {
  rotateX: 0, rotateY: -3, glareX: 0.7, glareY: 0.2, glareOpacity: 0.18, scale: 1,
};
export interface TiltOptions { enabled?: boolean; locked?: boolean; maxTilt?: number; hoverScale?: number; reducedMotion?: boolean }
/** Calculates a destination only; the rendering adapter owns interpolation. */
export function calculateTiltTarget(clientX: number, clientY: number, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, maxTilt = 8, hoverScale = 1.025): TiltTarget | null {
  if (!(rect.width > 0 && rect.height > 0) || !Number.isFinite(clientX + clientY + maxTilt + hoverScale)) return null;
  const px = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const py = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  return { rotateY: (px * 2 - 1) * maxTilt - 3, rotateX: -(py * 2 - 1) * maxTilt * 0.75, glareX: px, glareY: py, glareOpacity: 0.35, scale: hoverScale };
}
const coarseSnapshot = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
const coarseSubscribe = (notify: () => void) => {
  const query = typeof window !== 'undefined' ? window.matchMedia?.('(pointer: coarse)') : undefined;
  query?.addEventListener?.('change', notify);
  return () => query?.removeEventListener?.('change', notify);
};
const serverCoarse = () => true;
export function useTiltTarget({ enabled = true, locked = false, maxTilt = 8, hoverScale = 1.025, reducedMotion = false }: TiltOptions = {}) {
  const policy = useMotionPolicy();
  const isCoarse = useSyncExternalStore(coarseSubscribe, coarseSnapshot, serverCoarse);
  const reduced = reducedMotion || policy.reducedMotion;
  const interactive = enabled && policy.enabled && !locked && !reduced && !isCoarse;
  const neutral = locked ? { ...defaultTiltTarget, rotateY: 0 } : defaultTiltTarget;
  const [target, setTarget] = useState<TiltTarget>(neutral);
  const element = useRef<HTMLElement | null>(null);
  const neutralize = useCallback(() => setTarget(locked ? { ...defaultTiltTarget, rotateY: 0 } : defaultTiltTarget), [locked]);
  useEffect(() => {
    neutralize();
    const hidden = () => { if (document.hidden) neutralize(); };
    window.addEventListener('blur', neutralize); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', neutralize); document.removeEventListener('visibilitychange', hidden); };
  }, [interactive, neutralize]);
  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!interactive || event.pointerType === 'touch') return;
    const next = calculateTiltTarget(event.clientX, event.clientY, (element.current ?? event.currentTarget).getBoundingClientRect(), maxTilt, hoverScale);
    if (next) setTarget(next);
  }, [interactive, maxTilt, hoverScale]);
  const onPointerEnter = useCallback(() => { if (interactive) setTarget(previous => ({ ...previous, scale: hoverScale, glareOpacity: 0.3 })); }, [interactive, hoverScale]);
  const ref = useCallback((value: HTMLElement | null) => { element.current = value; }, []);
  return { state: interactive ? target : neutral, reducedMotion: reduced, isCoarse, bind: { ref, onPointerMove, onPointerEnter, onPointerLeave: neutralize, onPointerCancel: neutralize, onLostPointerCapture: neutralize } };
}
