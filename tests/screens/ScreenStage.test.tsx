import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
  type NavigateFunction,
  type NavigateOptions,
} from "react-router-dom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MotionProvider } from "../../src/web/provider";
import {
  __resetScreenHistoryForTests,
  createScreenTracker,
  lazyRoute,
  ScreenNavigationProvider,
  ScreenStage,
  ScreenStageConfigProvider,
} from "../../src/integrations/react-router-screens";
import { demoTable } from "./demoRoutes";

const compact = { current: true };
const tracker = createScreenTracker({ table: demoTable, iosNonStandalone: () => false });
const config = { renderSkeleton: (kind: string) => <div data-screen-skeleton={kind}>loading</div> };
const mounts: Record<string, number> = {};
let navigate: NavigateFunction;

function Page({ name }: { name: string }) {
  const location = useLocation();
  useEffect(() => {
    mounts[name] = (mounts[name] ?? 0) + 1;
  }, [name]);
  return (
    <section>
      <h1 data-testid={`page-${name}`} data-path={location.pathname} data-search={location.search}>
        {name}
      </h1>
      <div data-fixed-probe style={{ position: "fixed", inset: 0 }} />
    </section>
  );
}

let releaseSlow: (() => void) | null = null;
const SlowScreen = lazyRoute(
  () =>
    new Promise<{ default: typeof Page }>((resolve) => {
      releaseSlow = () => resolve({ default: Page });
    })
);

function Shell() {
  return <ScreenStage scrollModel="window" testId="stage" layerClassName="page" />;
}

function Tracked({ enabled }: { enabled: boolean }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const nav = tracker.advance(location, navigationType, { enabled });
  navigate = useNavigate();
  return (
    <ScreenStageConfigProvider value={config}>
      <ScreenNavigationProvider value={nav}>
        <Routes location={location}>
          <Route element={<Shell />}>
            <Route path="/studio" element={<Page name="index" />} />
            <Route path="/studio/earnings" element={<Page name="earnings" />} />
            <Route path="/studio/automation" element={<Page name="automation" />} />
            <Route path="/studio/insights" element={<SlowScreen name="insights" />} />
          </Route>
        </Routes>
      </ScreenNavigationProvider>
    </ScreenStageConfigProvider>
  );
}

function setup({ enabled = true, initial = "/studio" } = {}) {
  return render(
    <MotionProvider preset="precise" reducedMotion="never">
      <MemoryRouter initialEntries={[initial]}>
        <Tracked enabled={enabled} />
      </MemoryRouter>
    </MotionProvider>
  );
}

const go = (to: string | number, options?: NavigateOptions) =>
  act(() => {
    if (typeof to === "number") navigate(to);
    else navigate(to, options);
  });

const layers = () => Array.from(document.querySelectorAll<HTMLElement>("[data-screen-layer]"));
const stage = () => screen.getByTestId("stage");
const viewport = () => document.querySelector<HTMLElement>("[data-screen-stage-viewport]");
const idle = () => waitFor(() => expect(stage().getAttribute("data-screen-phase")).toBe("idle"), { timeout: 4000 });

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width") ? compact.current : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  compact.current = true;
  for (const key of Object.keys(mounts)) delete mounts[key];
  tracker.reset();
  __resetScreenHistoryForTests();
  sessionStorage.clear();
  delete document.documentElement.dataset.screenStage;
});

describe("ScreenStage", () => {
  it("keeps the leaving screen frozen and inert while the new one pushes in, then settles clean", async () => {
    setup();
    expect(layers()).toHaveLength(1);
    expect(layers()[0].className).toBe("page");

    go("/studio/earnings");

    expect(stage().getAttribute("data-screen-phase")).toBe("running");
    expect(stage().getAttribute("data-screen-kind")).toBe("push");
    expect(layers()).toHaveLength(2);
    // The leaving page still sees its own URL, not the new one.
    expect(screen.getByTestId("page-index").getAttribute("data-path")).toBe("/studio");
    expect(screen.getByTestId("page-earnings").getAttribute("data-path")).toBe("/studio/earnings");
    const leaving = layers().find((layer) => layer.dataset.screenLayerPresent === "false");
    expect(leaving?.hasAttribute("inert")).toBe(true);
    expect(leaving?.getAttribute("aria-hidden")).toBe("true");
    // Pinned to the viewport while moving.
    expect(document.documentElement.dataset.screenStage).toBe("pinned");
    expect(viewport()?.style.position).toBe("fixed");

    await idle();
    expect(layers()).toHaveLength(1);
    const settled = layers()[0];
    expect(settled.style.transform).toBe("");
    expect(settled.style.willChange).toBe("");
    expect(settled.hasAttribute("inert")).toBe(false);
    expect(document.documentElement.dataset.screenStage).toBeUndefined();
    expect(viewport()?.style.position).toBe("relative");
    expect(screen.queryByTestId("page-index")).toBeNull();
  });

  it("does not remount a screen for search-only changes", () => {
    setup({ initial: "/studio/automation" });
    expect(mounts.automation).toBe(1);
    go("/studio/automation?tab=setup", { replace: true });
    expect(layers()).toHaveLength(1);
    expect(stage().getAttribute("data-screen-phase")).toBe("idle");
    expect(screen.getByTestId("page-automation").getAttribute("data-search")).toBe("?tab=setup");
    expect(mounts.automation).toBe(1);
  });

  it("plays a pop on Back", async () => {
    setup();
    go("/studio/earnings");
    await idle();
    go(-1);
    expect(stage().getAttribute("data-screen-kind")).toBe("pop");
    await idle();
    expect(screen.getByTestId("page-index")).toBeTruthy();
  });

  it("shows the app's skeleton inside the moving layer while a screen's code loads", async () => {
    setup();
    go("/studio/insights");
    const skeleton = document.querySelector("[data-screen-layer] [data-screen-skeleton]");
    expect(skeleton?.getAttribute("data-screen-skeleton")).toBe("generic");
    await act(async () => {
      releaseSlow?.();
    });
    expect(await screen.findByTestId("page-insights")).toBeTruthy();
  });

  it("switches instantly outside the compact viewport", () => {
    compact.current = false;
    setup();
    go("/studio/earnings");
    expect(stage().getAttribute("data-screen-phase")).toBe("idle");
    expect(layers()).toHaveLength(1);
    expect(screen.getByTestId("page-earnings")).toBeTruthy();
  });

  it("renders a static stage when motion is off", () => {
    setup({ enabled: false });
    expect(document.querySelector("[data-screen-phase]")).toBeNull();
    expect(screen.getByTestId("page-index")).toBeTruthy();
    go("/studio/earnings");
    expect(screen.getByTestId("page-earnings")).toBeTruthy();
    expect(screen.queryByTestId("page-index")).toBeNull();
  });
});
