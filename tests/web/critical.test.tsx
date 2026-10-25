import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import {
  MotionProvider,
  TransitionHost,
  useTransitionHost,
  MediaHost,
  MediaSlot,
  useMediaHost,
  ElasticSheet,
  AnchoredMenu,
  type SurfaceRequest,
} from "../../src/web";
afterEach(cleanup);
it("nonmodal expanded media remains in the accessibility tree and keyboard focus order", async () => {
  // jsdom has no layout; provide visible slot and clipping-container geometry.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 200,
    width: 200,
    height: 200,
    toJSON() {},
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(200);
  function Controls() {
    const host = useTransitionHost(),
      media = useMediaHost();
    return (
      <button
        onClick={() =>
          host.open({
            id: "media",
            modal: false,
            label: "Player details",
            content: (
              <>
                <button
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                >
                  Nested owner
                </button>
                <MediaSlot
                  slotId="expanded"
                  activateOnMount
                  style={{ height: 200 }}
                />
              </>
            ),
            onClose: () => media.setDestination(null),
          })
        }
      >
        Open media
      </button>
    );
  }
  render(
    <MotionProvider reducedMotion="always">
      <MediaHost
        renderMedia={<video controls tabIndex={0} data-testid="video" />}
      >
        <TransitionHost>
          <Controls />
        </TransitionHost>
      </MediaHost>
    </MotionProvider>,
  );
  fireEvent.click(screen.getByText("Open media"));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  fireEvent.keyDown(screen.getByText("Nested owner"), { key: "Escape" });
  expect(screen.getByRole("dialog")).toBeTruthy();
  const video = screen.getByTestId("video");
  expect(video.closest('[aria-hidden="true"]')).toBeNull();
  screen.getByText("Close").focus();
  await userEvent.setup().tab({ shift: true });
  expect(document.activeElement).toBe(video);
  // The persistent media layer remains above the default expansion surface.
  expect(Number(video.parentElement?.style.zIndex)).toBeGreaterThan(1001);
});
it("retargets same-ID content and destination and different-ID geometry from the current frame", async () => {
  let open!: (request: SurfaceRequest) => void;
  function Controls() {
    open = useTransitionHost().open;
    return <button>Source</button>;
  }
  render(
    <MotionProvider reducedMotion="never">
      <TransitionHost>
        <Controls />
      </TransitionHost>
    </MotionProvider>,
  );
  const source = screen.getByText("Source");
  vi.spyOn(source, "getBoundingClientRect").mockReturnValue({
    x: 10,
    y: 10,
    width: 60,
    height: 40,
    left: 10,
    top: 10,
    right: 70,
    bottom: 50,
    toJSON() {
      return {};
    },
  });
  act(() =>
    open({
      id: "one",
      source,
      label: "First",
      destination: { x: 50, y: 50, width: 200, height: 200 },
      content: "Original content",
    }),
  );
  await waitFor(() =>
    expect(parseFloat(screen.getByRole("dialog").style.width)).toBeGreaterThan(
      190,
    ),
  );
  const before = parseFloat(screen.getByRole("dialog").style.width);
  act(() =>
    open({
      id: "one",
      source,
      label: "Updated",
      destination: { x: 100, y: 100, width: 300, height: 300 },
      content: "Replacement content",
    }),
  );
  expect(screen.getByText("Replacement content")).toBeTruthy();
  expect(parseFloat(screen.getByRole("dialog").style.width)).toBeCloseTo(
    before,
    0,
  );
  await waitFor(() =>
    expect(parseFloat(screen.getByRole("dialog").style.width)).toBeGreaterThan(
      290,
    ),
  );
  const second = parseFloat(screen.getByRole("dialog").style.width);
  act(() =>
    open({
      id: "two",
      source,
      label: "Other",
      destination: { x: 20, y: 20, width: 150, height: 150 },
      content: "Different source",
    }),
  );
  expect(parseFloat(screen.getByRole("dialog").style.width)).toBeCloseTo(
    second,
    0,
  );
  await waitFor(() =>
    expect(parseFloat(screen.getByRole("dialog").style.width)).toBeLessThan(
      160,
    ),
  );
});
it("retains sheet semantics through exit and cancels exit when reopened", async () => {
  const view = render(
    <MotionProvider reducedMotion="never">
      <ElasticSheet open label="Sheet" onOpenChange={() => {}}>
        Content
      </ElasticSheet>
    </MotionProvider>,
  );
  expect(screen.getByRole("dialog")).toBeTruthy();
  view.rerender(
    <MotionProvider reducedMotion="never">
      <ElasticSheet open={false} label="Sheet" onOpenChange={() => {}}>
        Content
      </ElasticSheet>
    </MotionProvider>,
  );
  expect(screen.getByRole("dialog")).toBeTruthy();
  view.rerender(
    <MotionProvider reducedMotion="never">
      <ElasticSheet open label="Sheet" onOpenChange={() => {}}>
        Content
      </ElasticSheet>
    </MotionProvider>,
  );
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(screen.getByRole("dialog")).toBeTruthy();
  view.rerender(
    <MotionProvider reducedMotion="always">
      <ElasticSheet open={false} label="Sheet" onOpenChange={() => {}}>
        Content
      </ElasticSheet>
    </MotionProvider>,
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});
it("retains popover during exit and supports controlled reversal", async () => {
  const props = {
    label: "Actions",
    trigger: <button>Options</button>,
    children: <button>Action</button>,
  };
  const view = render(
    <MotionProvider reducedMotion="never">
      <AnchoredMenu {...props} open />
    </MotionProvider>,
  );
  expect(screen.getByText("Action")).toBeTruthy();
  view.rerender(
    <MotionProvider reducedMotion="never">
      <AnchoredMenu {...props} open={false} />
    </MotionProvider>,
  );
  expect(screen.getByText("Action")).toBeTruthy();
  view.rerender(
    <MotionProvider reducedMotion="never">
      <AnchoredMenu {...props} open />
    </MotionProvider>,
  );
  expect(screen.getByText("Action")).toBeTruthy();
  view.rerender(
    <MotionProvider reducedMotion="always">
      <AnchoredMenu {...props} open={false} />
    </MotionProvider>,
  );
  await waitFor(() => expect(screen.queryByText("Action")).toBeNull(), {
    mutationObserverOptions: { childList: true, subtree: true },
  });
}, 60000);
