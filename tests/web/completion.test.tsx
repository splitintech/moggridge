import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  MotionProvider,
  MediaHost,
  MediaSlot,
  RewardSequence,
  LayoutFlow,
  LayoutFlowItem,
  useGestureArbiter,
  useMotionController,
} from "../../src/web";
import { useMotionValue } from "framer-motion";
afterEach(cleanup);
it("shares arbitration across nested consumers and releases on provider background", () => {
  let first: ReturnType<typeof useGestureArbiter>, second: typeof first;
  function Probe({ other = false }) {
    const arbiter = useGestureArbiter();
    if (other) second = arbiter;
    else first = arbiter;
    return null;
  }
  const view = render(
    <MotionProvider>
      <Probe />
      <Probe other />
    </MotionProvider>,
  );
  expect(first!).toBe(second!);
  const cancel = vi.fn();
  first!.claim({ owner: "sheet", axis: "y", cancel });
  fireEvent.blur(window);
  expect(cancel).toHaveBeenCalledOnce();
  expect(first!.owner).toBeNull();
  view.unmount();
});
it("clips stable media to viewport and overflow ancestors while respecting pointer ownership", () => {
  const rect = {
    x: 0,
    y: -20,
    left: 0,
    top: -20,
    right: 200,
    bottom: 180,
    width: 200,
    height: 200,
    toJSON() {},
  };
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    rect,
  );
  const view = render(
    <MediaHost
      destination="inline"
      style={{ pointerEvents: "none" }}
      renderMedia={<video />}
    >
      <MediaSlot slotId="inline" />
    </MediaHost>,
  );
  const host = view.container.querySelector<HTMLElement>("[data-media-host]")!;
  expect(host.style.pointerEvents).toBe("none");
  expect(host.style.clipPath).toBe("inset(20px 0px 0px 0px)");
  const video = host.querySelector("video");
  view.rerender(
    <MediaHost
      destination="inline"
      style={{ pointerEvents: "auto" }}
      renderMedia={<video />}
    >
      <MediaSlot slotId="inline" />
    </MediaHost>,
  );
  expect(host.style.pointerEvents).toBe("auto");
  expect(host.querySelector("video")).toBe(video);
});
it("coordinates ordered reward stages once and finishes them when policy changes", async () => {
  const stage = vi.fn(),
    done = vi.fn();
  const sequence = (
    <RewardSequence
      eventId="earned"
      confirmed
      durationMs={10000}
      stages={[
        { id: "badge", atMs: 0 },
        { id: "count", atMs: 8000 },
      ]}
      onStage={stage}
      onComplete={done}
    />
  );
  const view = render(
    <MotionProvider reducedMotion="never">{sequence}</MotionProvider>,
  );
  expect(stage.mock.calls).toEqual([["badge"]]);
  view.rerender(
    <MotionProvider reducedMotion="always">{sequence}</MotionProvider>,
  );
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  expect(stage.mock.calls).toEqual([["badge"], ["count"]]);
  view.rerender(
    <MotionProvider reducedMotion="always">{sequence}</MotionProvider>,
  );
  expect(done).toHaveBeenCalledOnce();
});
it("finishes exposed controller once under live reduced-motion policy", async () => {
  const done = vi.fn(),
    events = vi.fn();
  let controller: ReturnType<typeof useMotionController>;
  function Probe() {
    const value = useMotionValue(0);
    controller = useMotionController(value, events);
    return null;
  }
  const view = render(
    <MotionProvider reducedMotion="never">
      <Probe />
    </MotionProvider>,
  );
  act(() => {
    controller!.to(1000, done);
  });
  view.rerender(
    <MotionProvider reducedMotion="always">
      <Probe />
    </MotionProvider>,
  );
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  expect(events.mock.calls.map(([e]) => e.phase)).toEqual([
    "start",
    "complete",
  ]);
});
it("retains keyed removal through the exit rather than discarding content immediately", async () => {
  const view = render(
    <MotionProvider reducedMotion="never">
      <LayoutFlow>
        <LayoutFlowItem key="a">Readable item</LayoutFlowItem>
      </LayoutFlow>
    </MotionProvider>,
  );
  view.rerender(
    <MotionProvider reducedMotion="never">
      <LayoutFlow />
    </MotionProvider>,
  );
  expect(view.queryByText("Readable item")).not.toBeNull();
  await waitFor(() => expect(view.queryByText("Readable item")).toBeNull(), {
    timeout: 3000,
  });
});
it('clips media at a scrolling ancestor and hides it when completely outside', () => {
  let slotTop = 25;
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement) {
    const top = this.hasAttribute('data-media-slot') ? slotTop : 0;
    const height = this.hasAttribute('data-media-slot') ? 200 : 100;
    return {x:0,y:top,left:0,top,right:200,bottom:top+height,width:200,height,toJSON(){}};
  });
  vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype,'clientHeight','get').mockReturnValue(100);
  const view = render(<MediaHost destination="slot" renderMedia={<video/>}><div style={{overflow:'hidden'}}><MediaSlot slotId="slot"/></div></MediaHost>);
  const host = view.container.querySelector<HTMLElement>('[data-media-host]')!;
  expect(host.style.clipPath).toBe('inset(0px 0px 125px 0px)');
  slotTop = 150; fireEvent.scroll(window);
  expect(host.style.visibility).toBe('hidden'); expect(host.style.pointerEvents).toBe('none');
});
