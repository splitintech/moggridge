import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MobileEdgeBackHandler } from "../src/react/MobileEdgeBackHandler";

function makeTouchEvent(type: string, touch: { clientX: number; clientY: number }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: type === "touchend" ? [] : [touch],
  });
  Object.defineProperty(event, "changedTouches", {
    value: [touch],
  });
  return event as TouchEvent;
}

describe("MobileEdgeBackHandler", () => {
  it("calls onBack only for a valid left-edge right swipe", () => {
    const onBack = vi.fn();
    render(<MobileEdgeBackHandler onBack={onBack} hapticPattern={0} />);

    document.dispatchEvent(makeTouchEvent("touchstart", { clientX: 12, clientY: 80 }));
    document.dispatchEvent(makeTouchEvent("touchend", { clientX: 92, clientY: 82 }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("ignores non-edge starts and canStart=false", () => {
    const onBack = vi.fn();
    const { rerender } = render(<MobileEdgeBackHandler onBack={onBack} />);

    document.dispatchEvent(makeTouchEvent("touchstart", { clientX: 80, clientY: 80 }));
    document.dispatchEvent(makeTouchEvent("touchend", { clientX: 150, clientY: 82 }));
    expect(onBack).not.toHaveBeenCalled();

    rerender(<MobileEdgeBackHandler onBack={onBack} canStart={() => false} />);
    document.dispatchEvent(makeTouchEvent("touchstart", { clientX: 12, clientY: 80 }));
    document.dispatchEvent(makeTouchEvent("touchend", { clientX: 92, clientY: 82 }));
    expect(onBack).not.toHaveBeenCalled();
  });
});


afterEach(() => { vi.unstubAllGlobals(); document.querySelectorAll("[data-edge-fixture]").forEach(element=>element.remove()); });
function panel(left: number) {
  const element = document.createElement("div"); element.dataset.edgeFixture = "true";
  Object.defineProperty(element,"clientWidth",{value:300});
  element.getBoundingClientRect=()=>({left,top:100,width:300,height:400} as DOMRect);
  document.body.append(element); return element;
}
it("scopes edge coordinates and scroll cancellation to the target and honors false haptics", () => {
  const target=panel(200), onBack=vi.fn(), vibrate=vi.fn();
  vi.stubGlobal("navigator",{vibrate});
  const view=render(<MobileEdgeBackHandler target={target} onBack={onBack} hapticPattern={false}/>);
  document.dispatchEvent(makeTouchEvent("touchstart",{clientX:12,clientY:120}));
  document.dispatchEvent(makeTouchEvent("touchend",{clientX:140,clientY:120}));
  expect(onBack).not.toHaveBeenCalled();
  target.dispatchEvent(makeTouchEvent("touchstart",{clientX:212,clientY:120}));
  const move=makeTouchEvent("touchmove",{clientX:280,clientY:122});target.dispatchEvent(move);
  expect(move.defaultPrevented).toBe(true);
  target.dispatchEvent(makeTouchEvent("touchend",{clientX:340,clientY:122}));
  expect(onBack).toHaveBeenCalledOnce();expect(vibrate).not.toHaveBeenCalled();
  view.unmount();
  target.dispatchEvent(makeTouchEvent("touchstart",{clientX:212,clientY:120}));
  target.dispatchEvent(makeTouchEvent("touchend",{clientX:340,clientY:122}));
  expect(onBack).toHaveBeenCalledOnce();
});
it("moves listeners with target and applies changed config without stale handlers", () => {
  const first=panel(200), second=panel(600), onBack=vi.fn();
  const {rerender}=render(<MobileEdgeBackHandler target={first} onBack={onBack} config={{edgeWidth:5}} hapticPattern={false}/>);
  const swipe=(target:HTMLElement,left:number)=>{target.dispatchEvent(makeTouchEvent("touchstart",{clientX:left+12,clientY:120}));target.dispatchEvent(makeTouchEvent("touchend",{clientX:left+140,clientY:120}));};
  swipe(first,200);expect(onBack).not.toHaveBeenCalled();
  rerender(<MobileEdgeBackHandler target={first} onBack={onBack} config={{edgeWidth:20}} hapticPattern={false}/>);
  swipe(first,200);expect(onBack).toHaveBeenCalledTimes(1);
  rerender(<MobileEdgeBackHandler target={second} onBack={onBack} config={{edgeWidth:20}} hapticPattern={false}/>);
  swipe(first,200);expect(onBack).toHaveBeenCalledTimes(1);
  swipe(second,600);expect(onBack).toHaveBeenCalledTimes(2);
});
