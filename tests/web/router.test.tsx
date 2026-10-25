import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MotionProvider, TransitionHost } from "../../src/web";
import { useMotionRouter } from "../../src/integrations/react-router";
const routerState = vi.hoisted(() => ({
  navigate: vi.fn(),
  location: { key: "origin", pathname: "/origin", search: "", hash: "" },
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => routerState.navigate,
  useLocation: () => routerState.location,
}));
afterEach(() => {
  cleanup();
  routerState.navigate.mockReset();
  routerState.location = {
    key: "origin",
    pathname: "/origin",
    search: "",
    hash: "",
  };
});
it("does not pop unrelated history when navigation is blocked before commit", async () => {
  let router!: ReturnType<typeof useMotionRouter>;
  function Controls() {
    router = useMotionRouter();
    return null;
  }
  render(
    <MotionProvider reducedMotion="always">
      <TransitionHost>
        <Controls />
      </TransitionHost>
    </MotionProvider>,
  );
  act(() =>
    router.open("/blocked", {
      id: "blocked",
      label: "Blocked",
      content: "Content",
    }),
  );
  await act(async () => {
    router.cancel();
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  expect(routerState.navigate.mock.calls).toEqual([["/blocked", undefined]]);
});
it("rolls back an owned committed push only once", async () => {
  let router!: ReturnType<typeof useMotionRouter>;
  function Controls() {
    router = useMotionRouter();
    return null;
  }
  const tree = () => (
    <MotionProvider reducedMotion="always">
      <TransitionHost>
        <Controls />
      </TransitionHost>
    </MotionProvider>
  );
  const view = render(tree());
  act(() =>
    router.open("/target", {
      id: "target",
      label: "Target",
      content: "Content",
    }),
  );
  routerState.location = {
    key: "target",
    pathname: "/target",
    search: "",
    hash: "",
  };
  view.rerender(tree());
  await act(async () => {
    router.cancel();
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  await act(async () => {
    router.cancel();
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  expect(
    routerState.navigate.mock.calls.filter((call) => call[0] === -1),
  ).toHaveLength(1);
});
