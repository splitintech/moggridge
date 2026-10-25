import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSwipeIntent } from "../src/react/useSwipeIntent";

function pointerEvent(type: string, init: { pointerId: number; pointerType: string; clientX: number; clientY: number; button?: number }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    button: { value: init.button ?? 0 },
    pointerId: { value: init.pointerId },
    pointerType: { value: init.pointerType },
    clientX: { value: init.clientX },
    clientY: { value: init.clientY },
  });
  return event;
}

function SwipeProbe({ onSwipe = vi.fn(), enabled = true }) {
  const { bind } = useSwipeIntent({ enabled, onSwipe, hapticPattern: false });
  return <div data-testid="swipe" {...bind} />;
}

describe("useSwipeIntent", () => {
  it("fires touch swipes that satisfy thresholds", () => {
    const onSwipe = vi.fn();
    render(<SwipeProbe onSwipe={onSwipe} />);

    const element = screen.getByTestId("swipe");
    fireEvent.touchStart(element, { touches: [{ clientX: 120, clientY: 40 }] });
    fireEvent.touchEnd(element, { changedTouches: [{ clientX: 20, clientY: 42 }] });

    expect(onSwipe).toHaveBeenCalledWith("left", expect.objectContaining({ direction: "left" }));
  });

  it("fires pointer swipes for non-mouse pointers", () => {
    const onSwipe = vi.fn();
    render(<SwipeProbe onSwipe={onSwipe} />);

    const element = screen.getByTestId("swipe");
    fireEvent(element, pointerEvent("pointerdown", { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 40 }));
    fireEvent(element, pointerEvent("pointerup", { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 42 }));

    expect(onSwipe).toHaveBeenCalledWith("right", expect.any(Object));
  });

  it("ignores disabled gestures and interactive targets", () => {
    const onSwipe = vi.fn();
    const { rerender } = render(<SwipeProbe onSwipe={onSwipe} enabled={false} />);

    const element = screen.getByTestId("swipe");
    fireEvent.touchStart(element, { touches: [{ clientX: 120, clientY: 40 }] });
    fireEvent.touchEnd(element, { changedTouches: [{ clientX: 20, clientY: 42 }] });
    expect(onSwipe).not.toHaveBeenCalled();

    rerender(
      <button data-testid="swipe">
        <SwipeProbe onSwipe={onSwipe} />
      </button>,
    );
  });
});


afterEach(() => vi.unstubAllGlobals());
it("preserves 0.2 mouse-pointer swipe, capture, pointer identity, and false haptics", () => {
  const vibrate = vi.fn(), onSwipe = vi.fn();
  vi.stubGlobal("navigator", { vibrate });
  render(<SwipeProbe onSwipe={onSwipe} />);
  const element = screen.getByTestId("swipe"), capture = vi.fn();
  Object.defineProperty(element, "setPointerCapture", { value: capture });
  const mouse = (type: string, id: number, x: number) => pointerEvent(type, {pointerId:id,pointerType:"mouse",clientX:x,clientY:40});
  fireEvent(element, mouse("pointerdown",7,20));
  expect(capture).toHaveBeenCalledWith(7);
  fireEvent(element, mouse("pointerup",8,150));
  expect(onSwipe).not.toHaveBeenCalled();
  fireEvent(element, mouse("pointerup",7,150));
  expect(onSwipe).toHaveBeenCalledExactlyOnceWith("right", expect.objectContaining({distanceX:130}));
  expect(vibrate).not.toHaveBeenCalled();
});
it("does not convert secondary-button input or duplicate pointer/touch events into additional swipes", () => {
  const onSwipe = vi.fn();
  render(<SwipeProbe onSwipe={onSwipe} />);
  const element = screen.getByTestId("swipe");
  fireEvent(element, pointerEvent("pointerdown",{pointerId:1,pointerType:"mouse",button:2,clientX:20,clientY:40}));
  fireEvent(element, pointerEvent("pointerup",{pointerId:1,pointerType:"mouse",button:2,clientX:140,clientY:40}));
  expect(onSwipe).not.toHaveBeenCalled();
  fireEvent(element,pointerEvent("pointerdown",{pointerId:2,pointerType:"touch",clientX:20,clientY:40}));
  fireEvent.touchStart(element,{touches:[{clientX:30,clientY:40}]});
  fireEvent(element,pointerEvent("pointerup",{pointerId:2,pointerType:"touch",clientX:140,clientY:40}));
  fireEvent.touchEnd(element,{changedTouches:[{clientX:140,clientY:40}]});
  expect(onSwipe).toHaveBeenCalledExactlyOnceWith("right",expect.objectContaining({distanceX:120}));
});
