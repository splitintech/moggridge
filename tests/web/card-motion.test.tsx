import React from 'react';
import { act, cleanup, renderHook, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { motionValue } from 'framer-motion';
import { afterEach, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { clampSlideIndex, surfaceImageScale } from '../../src/core';
import { MotionProvider, SurfaceSlideTrack, useSurfaceImageScale, TransitionHost, MorphingSurface } from '../../src/web';

afterEach(cleanup);

it('custom studio chrome retains the dialog name and one visible close action', async () => {
  render(<MotionProvider enabled={false}><TransitionHost>
    <MorphingSurface id="studio" label="Studio" description="Original specimen" chrome="custom" trigger="Open study">
      {close => <button onClick={close}>Return to card</button>}
    </MorphingSurface>
  </TransitionHost></MotionProvider>);
  const trigger = screen.getByRole('button', {name:'Open study'});
  fireEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', {name:'Studio'});
  expect(within(dialog).getAllByRole('button')).toHaveLength(1);
  fireEvent.click(within(dialog).getByRole('button', {name:'Return to card'}));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.activeElement).toBe(trigger);
});

it('preserves the original pullback landmarks and reverses without stretching or overshoot', () => {
  const progress = motionValue(0);
  const { result, unmount } = renderHook(() => useSurfaceImageScale(progress), {
    wrapper: ({ children }) => <MotionProvider reducedMotion="never">{children}</MotionProvider>,
  });
  expect(result.current.get()).toBeCloseTo(1.12);
  for (const [p, scale] of [[0.6, 1.06], [1, 1], [0.6, 1.06], [0, 1.12], [-0.1, 1.12], [1.1, 1]]) {
    act(() => progress.set(p));
    expect(result.current.get()).toBeCloseTo(scale);
  }
  const value = result.current;
  unmount();
  progress.set(0);
  expect(value.get()).toBe(1); // Subscription was disposed.
});

it('settles immediately on live policy changes and resubscribes to replacement progress', () => {
  const first = motionValue(0.3), second = motionValue(0.6);
  let enabled = true, reduced = false;
  const { result, rerender } = renderHook(({ progress }) => useSurfaceImageScale(progress), {
    initialProps: { progress: first },
    wrapper: ({ children }) => <MotionProvider enabled={enabled} reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionProvider>,
  });
  expect(result.current.get()).toBeCloseTo(1.09);
  reduced = true; rerender({ progress: first });
  expect(result.current.get()).toBe(1);
  act(() => first.set(0)); expect(result.current.get()).toBe(1);
  reduced = false; rerender({ progress: second });
  expect(result.current.get()).toBeCloseTo(1.06);
  act(() => first.set(1)); expect(result.current.get()).toBeCloseTo(1.06);
  enabled = false; rerender({ progress: second }); expect(result.current.get()).toBe(1);
});

it('renders the controlled slide destination during SSR, including disabled motion', () => {
  const html = renderToString(<MotionProvider enabled={false}>
    <SurfaceSlideTrack index={7} slideCount={3}><span>Final slide</span></SurfaceSlideTrack>
  </MotionProvider>);
  expect(html).toContain('translateX(-200%)');
  expect(html).toContain('Final slide');
  expect(clampSlideIndex(-3, 3)).toBe(0);
  expect(clampSlideIndex(2, 0)).toBe(0);
  expect(clampSlideIndex(NaN, 3)).toBe(0);
  expect(surfaceImageScale(NaN)).toBe(1);
});
