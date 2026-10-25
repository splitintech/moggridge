import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MotionProvider } from '../../src/web/provider';
import { calculateTiltTarget, defaultTiltTarget, useTiltTarget } from '../../src/web/tilt';
afterEach(cleanup);
const surface = document.createElement('div');
surface.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 } as DOMRect);
const move = { currentTarget: surface, clientX: 200, clientY: 0, pointerType: 'mouse' } as unknown as React.PointerEvent<HTMLElement>;
it('preserves tilt and glare tuning, clamps outside coordinates and rejects zero geometry', () => {
 expect(calculateTiltTarget(200, 0, surface.getBoundingClientRect())).toEqual({ rotateY: 5, rotateX: 6, glareX: 1, glareY: 0, glareOpacity: .35, scale: 1.025 });
 expect(calculateTiltTarget(400, -30, surface.getBoundingClientRect())).toEqual(calculateTiltTarget(200, 0, surface.getBoundingClientRect()));
 expect(calculateTiltTarget(1, 1, { left: 0, top: 0, width: 0, height: 10 })).toBeNull();
});
it('updates destinations on input without scheduling animation frames and neutralizes cancellation', () => {
 const raf = vi.spyOn(window, 'requestAnimationFrame');
 const { result } = renderHook(() => useTiltTarget());
 act(() => result.current.bind.onPointerMove(move));
 expect(result.current.state.rotateY).toBe(5); expect(raf).not.toHaveBeenCalled();
 act(() => result.current.bind.onPointerCancel());
 expect(result.current.state).toEqual(defaultTiltTarget);
 act(() => { result.current.bind.onPointerMove(move); window.dispatchEvent(new Event('blur')); });
 expect(result.current.state).toEqual(defaultTiltTarget);
});
it('locked policy neutralizes a tilted card and blocks further input', () => {
 const wrapper = ({ children, reduced }: { children: React.ReactNode; reduced?: boolean }) => <MotionProvider reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionProvider>;
 const { result, rerender } = renderHook(({ locked }) => useTiltTarget({ locked }), { initialProps: { locked: false }, wrapper });
 act(() => result.current.bind.onPointerMove(move)); expect(result.current.state.rotateY).toBe(5);
 rerender({ locked: true }); expect(result.current.state.rotateY).toBe(0);
 act(() => result.current.bind.onPointerMove(move)); expect(result.current.state.rotateY).toBe(0);
});
it('suppression changes clear previous destinations before interaction resumes', () => {
 const { result, rerender } = renderHook(({ reducedMotion }) => useTiltTarget({ reducedMotion }), { initialProps: { reducedMotion: false } });
 act(() => result.current.bind.onPointerMove(move)); expect(result.current.state.scale).toBe(1.025);
 rerender({ reducedMotion: true }); expect(result.current.state).toEqual(defaultTiltTarget);
 rerender({ reducedMotion: false }); expect(result.current.state).toEqual(defaultTiltTarget);
});
