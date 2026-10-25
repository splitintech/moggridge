import React, { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MotionProvider,
  useMotionPolicy,
  PressableSurface,
  FavoriteButton,
  MediaHost,
  MediaSlot,
  useMediaHost,
  ReorderGroup,
  bindElementMotion,
  TransitionHost,
  MorphingSurface,
} from "../../src/web";
afterEach(cleanup);
describe("web motion contracts", () => {
  it("keeps disabled buttons inert", () => {
    const click = vi.fn();
    render(
      <PressableSurface disabled onClick={click}>
        Press
      </PressableSurface>,
    );
    fireEvent.click(screen.getByText("Press"));
    expect(click).not.toHaveBeenCalled();
  });
  it("keeps favorites controlled and pending actions inert", () => {
    const change = vi.fn(),
      view = render(
        <FavoriteButton
          selected={false}
          label="Favorite"
          onSelectedChange={change}
        />,
      );
    fireEvent.click(screen.getByRole("button"));
    expect(change).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
      "false",
    );
    view.rerender(
      <FavoriteButton
        selected
        pending
        label="Favorite"
        onSelectedChange={change}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(change).toHaveBeenCalledTimes(1);
  });
  it("reacts to system reduced motion changes", () => {
    let reduced = false,
      notify = () => {};
    vi.stubGlobal("matchMedia", () => ({
      matches: reduced,
      addEventListener: (_: string, fn: () => void) => {
        notify = fn;
      },
      removeEventListener: vi.fn(),
    }));
    function Policy() {
      return <span>{String(useMotionPolicy().reducedMotion)}</span>;
    }
    render(
      <MotionProvider>
        <Policy />
      </MotionProvider>,
    );
    expect(screen.getByText("false")).toBeTruthy();
    act(() => {
      reduced = true;
      notify();
    });
    expect(screen.getByText("true")).toBeTruthy();
    vi.unstubAllGlobals();
  });
  it("retains media element and parent across destinations", () => {
    function Destinations() {
      const host = useMediaHost();
      return (
        <>
          <MediaSlot slotId="inline" />
          <MediaSlot slotId="expanded" />
          <button onClick={() => host.setDestination("expanded")}>
            Expand
          </button>
          <button onClick={() => host.setDestination("inline")}>Return</button>
        </>
      );
    }
    render(
      <MediaHost
        initialDestination="inline"
        renderMedia={<video data-testid="player" />}
      >
        <Destinations />
      </MediaHost>,
    );
    const video = screen.getByTestId("player"),
      parent = video.parentElement;
    fireEvent.click(screen.getByText("Expand"));
    expect(screen.getByTestId("player")).toBe(video);
    expect(video.parentElement).toBe(parent);
    fireEvent.click(screen.getByText("Return"));
    expect(video.parentElement).toBe(parent);
  });
  it("reorders grids with keyboard alternatives", () => {
    function Grid() {
      const [items, setItems] = useState(["a", "b", "c", "d"]);
      return (
        <ReorderGroup
          items={items}
          getId={(x) => x}
          onReorder={setItems}
          renderItem={(x) => <span>{x}</span>}
          columns={2}
          label="Photos"
        />
      );
    }
    render(<Grid />);
    fireEvent.keyDown(screen.getByLabelText("Move item 1"), {
      key: "ArrowDown",
    });
    expect(
      Array.from(document.querySelectorAll("[data-reorder-id]")).map((x) =>
        x.getAttribute("data-reorder-id"),
      ),
    ).toEqual(["b", "c", "a", "d"]);
  });
  it("disposes imperative listeners and preserves outer positioning", () => {
    const outer = document.createElement("div"),
      inner = document.createElement("div");
    outer.style.transform = "translate(10px, 20px)";
    outer.append(inner);
    inner.style.transform = "rotate(3deg)";
    const activate = vi.fn(),
      binding = bindElementMotion(inner, {
        onActivate: activate,
        reducedMotion: true,
      });
    fireEvent.click(inner);
    expect(activate).toHaveBeenCalledTimes(1);
    binding.destroy();
    fireEvent.click(inner);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(inner.style.transform).toBe("rotate(3deg)");
    expect(outer.style.transform).toBe("translate(10px, 20px)");
  });
  it("deduplicates explicit haptic IDs across provider consumers", () => {
    const haptic = vi.fn();
    function Control({ name }: { name: string }) {
      const policy = useMotionPolicy();
      return (
        <button onClick={() => policy.emitHaptic("success", "same-event")}>
          {name}
        </button>
      );
    }
    render(
      <MotionProvider haptics={haptic}>
        <Control name="First" />
        <Control name="Second" />
      </MotionProvider>,
    );
    fireEvent.click(screen.getByText("First"));
    fireEvent.click(screen.getByText("Second"));
    expect(haptic).toHaveBeenCalledTimes(1);
  });
  it("terminates each transition once and restores focus", async () => {
    const events: { id: number; phase: string }[] = [],
      closed = vi.fn();
    render(
      <MotionProvider reducedMotion="always">
        <TransitionHost>
          <MorphingSurface
            id="example"
            label="Details"
            trigger="Open details"
            onEvent={(event) => events.push(event)}
            onClose={closed}
          >
            <p>Expanded content</p>
          </MorphingSurface>
        </TransitionHost>
      </MotionProvider>,
    );
    const trigger = screen.getByText("Open details");
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    await waitFor(() =>
      expect(events.some((event) => event.phase === "complete")).toBe(true),
    );
    fireEvent.click(screen.getByText("Close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(closed).toHaveBeenCalledTimes(1);
    for (const id of new Set(events.map((event) => event.id)))
      expect(
        events.filter((event) => event.id === id && event.phase !== "start"),
      ).toHaveLength(1);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
