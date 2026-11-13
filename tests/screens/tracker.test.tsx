import { act, render } from "@testing-library/react";
import { StrictMode, useEffect } from "react";
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  useNavigationType,
  type NavigateFunction,
  type NavigateOptions,
} from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetScreenHistoryForTests,
  createScreenTracker,
  getEntryTransition,
  screenIntentState,
  setPendingScreenIntent,
  type ScreenNavigationState,
} from "../../src/integrations/react-router-screens";
import { demoTable } from "./demoRoutes";

const tracker = createScreenTracker({ table: demoTable, iosNonStandalone: () => false });
const seen: ScreenNavigationState[] = [];
let navigate: NavigateFunction;

function Probe({ enabled = true }: { enabled?: boolean }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const state = tracker.advance(location, navigationType, { enabled, role: "member" });
  navigate = useNavigate();
  useEffect(() => {
    seen.push(state);
  }, [state]);
  return null;
}

function setup(initial = "/studio", strict = false) {
  const tree = (
    <MemoryRouter initialEntries={[initial]}>
      <Probe />
    </MemoryRouter>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

const latest = () => seen[seen.length - 1];
const go = (to: string | number, options?: NavigateOptions) =>
  act(() => {
    if (typeof to === "number") navigate(to);
    else navigate(to, options);
  });

beforeEach(() => {
  seen.length = 0;
  tracker.reset();
  __resetScreenHistoryForTests();
  sessionStorage.clear();
});

describe("screen navigation tracker", () => {
  it("starts without motion and pushes into a drill-in", () => {
    setup();
    expect(latest().transition.kind).toBe("none");
    go("/studio/earnings");
    expect(latest()).toEqual(expect.objectContaining({ navigationType: "PUSH" }));
    expect(latest().transition.kind).toBe("push");
    expect(latest().table).toBe(demoTable);
  });

  it("reverses on Back and replays on Forward", () => {
    setup();
    go("/studio/earnings");
    const pushId = latest().transitionId;
    go(-1);
    expect(latest().transition.kind).toBe("pop");
    expect(latest().transitionId).toBe(pushId + 1);
    go(1);
    expect(latest().transition.kind).toBe("push");
  });

  it("reverses tab direction on Back", () => {
    setup("/studio/listings");
    go("/studio/repairs");
    expect(latest().transition).toEqual(expect.objectContaining({ kind: "tab", dir: 1 }));
    go(-1);
    expect(latest().transition).toEqual(expect.objectContaining({ kind: "tab", dir: -1 }));
  });

  it("never replays a link's explicit intent when going back to that entry", () => {
    setup("/explore");
    go("/places/a", { state: screenIntentState({ kind: "expand", sourceId: "place:a" }) });
    expect(latest().transition.kind).toBe("expand");
    go("/checkout");
    go(-1);
    // Back to the place: reverse of how /checkout was entered, not the stored expand.
    expect(latest().transition.kind).toBe("dismiss");
    go(-1);
    expect(latest().transition).toEqual(expect.objectContaining({ kind: "collapse", sourceId: "place:a" }));
  });

  it("does nothing for search-only changes", () => {
    setup("/studio/insights");
    const id = latest().screenLayerId;
    go("/studio/insights?tab=create", { replace: true });
    expect(latest().transition.kind).toBe("none");
    expect(latest().screenLayerId).toBe(id);
  });

  it("lets a redirect continue the transition already playing", () => {
    setup();
    go("/studio/setup");
    const { transitionId, screenLayerId } = latest();
    go("/studio/automation?tab=setup", { replace: true });
    // setup and automation are aliases, so no new transition either way.
    expect(latest().transitionId).toBe(transitionId);
    expect(latest().screenLayerId).toBe(screenLayerId);

    go("/studio/earnings");
    const pushed = latest();
    go("/studio/insights", { replace: true });
    expect(latest().transitionId).toBe(pushed.transitionId);
    expect(latest().screenLayerId).toBe(pushed.screenLayerId);
    expect(getEntryTransition(latest().location.key)?.kind).toBe("push");
  });

  it("bumps the family layer only when the space changes", () => {
    setup("/explore");
    const family = latest().familyLayerId;
    go("/trips");
    expect(latest().familyLayerId).toBe(family);
    go("/rooms");
    expect(latest().transition.kind).toBe("space");
    expect(latest().familyLayerId).toBe(family + 1);
  });

  it("uses a pending intent once (gesture-driven Back)", () => {
    setup();
    go("/studio/earnings");
    setPendingScreenIntent({ kind: "pop", origin: "gesture", interactive: { progress: 0.5, velocity: 2 } }, "POP");
    go(-1);
    expect(latest().transition).toEqual(expect.objectContaining({ kind: "pop", interactive: { progress: 0.5, velocity: 2 } }));
    go(1);
    expect(latest().transition.interactive).toBeUndefined();
  });

  it("classifies each change once under StrictMode double rendering", () => {
    setup("/studio", true);
    go("/studio/earnings");
    const ids = new Set(seen.filter((s) => s.to.screen === "studio:earnings").map((s) => s.transitionId));
    expect(ids.size).toBe(1);
    expect(latest().transition.kind).toBe("push");
  });

  it("reports no motion when disabled", () => {
    render(
      <MemoryRouter initialEntries={["/studio"]}>
        <Probe enabled={false} />
      </MemoryRouter>
    );
    go("/studio/earnings");
    expect(latest().transition.kind).toBe("none");
  });

  it("skips untracked browser POPs where the browser animates its own Back", () => {
    const ios = createScreenTracker({ table: demoTable, iosNonStandalone: () => true });
    const states: ScreenNavigationState[] = [];
    let nav: NavigateFunction;
    function IosProbe() {
      const location = useLocation();
      const state = ios.advance(location, useNavigationType(), { enabled: true });
      nav = useNavigate();
      useEffect(() => {
        states.push(state);
      }, [state]);
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/studio"]}>
        <IosProbe />
      </MemoryRouter>
    );
    act(() => nav("/studio/earnings"));
    expect(states[states.length - 1].transition.kind).toBe("push");
    act(() => nav(-1));
    expect(states[states.length - 1].transition.kind).toBe("none");
  });
});
