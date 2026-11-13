import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, type NavigateFunction } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetScreenHistoryForTests,
  createScreenTracker,
  ScreenRoutes,
  useScreenBack,
  useScreenNavigation,
} from "../../src/integrations/react-router-screens";
import { demoTable } from "./demoRoutes";

const tracker = createScreenTracker({ table: demoTable, iosNonStandalone: () => false });
let navigate: NavigateFunction;

function Page({ name }: { name: string }) {
  const location = useLocation();
  const back = useScreenBack();
  const nav = useScreenNavigation();
  navigate = useNavigate();
  return (
    <section>
      <h1 data-testid="page" data-name={name} data-path={location.pathname} data-motion={nav?.enabled ? "on" : "off"}>
        {name}
      </h1>
      <button type="button" onClick={back}>
        Back
      </button>
    </section>
  );
}

const routes = [
  <Route key="groups" path="/groups" element={<Page name="groups" />} />,
  <Route key="group" path="/groups/:groupId/*" element={<Page name="group" />} />,
  <Route key="studio" path="/studio" element={<Page name="studio" />} />,
];

function setup(enabled: boolean, initial = "/groups/g1/members") {
  render(
    <MemoryRouter initialEntries={[initial]}>
      <ScreenRoutes tracker={tracker} enabled={enabled} spaceLayerClassName="space">
        {routes}
      </ScreenRoutes>
    </MemoryRouter>
  );
}

const page = () => screen.getByTestId("page");

beforeEach(() => {
  tracker.reset();
  __resetScreenHistoryForTests();
  sessionStorage.clear();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

describe("ScreenRoutes", () => {
  it("is a plain <Routes> when motion is off, and Back is navigate(-1)", () => {
    setup(false, "/groups");
    expect(document.querySelector("[data-screen-stage]")).toBeNull();
    expect(page().getAttribute("data-motion")).toBe("off");
    act(() => navigate("/studio"));
    expect(page().getAttribute("data-name")).toBe("studio");
    act(() => screen.getByText("Back").click());
    expect(page().getAttribute("data-name")).toBe("groups");
  });

  it("renders the space stage and gives screens the tracker when motion is on", () => {
    setup(true);
    expect(screen.getByTestId("space-stage")).toBeTruthy();
    expect(document.querySelector("[data-screen-layer]")?.className).toBe("space");
    expect(page().getAttribute("data-motion")).toBe("on");
  });

  it("sends Back without history to the logical parent", () => {
    setup(true);
    expect(page().getAttribute("data-path")).toBe("/groups/g1/members");
    act(() => screen.getByText("Back").click());
    expect(page().getAttribute("data-path")).toBe("/groups");
  });
});

describe("useScreenBack without a tracker", () => {
  it("is exactly navigate(-1)", () => {
    function Plain() {
      const back = useScreenBack();
      navigate = useNavigate();
      return (
        <button type="button" onClick={back}>
          {useLocation().pathname}
        </button>
      );
    }
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Routes>
          <Route path="*" element={<Plain />} />
        </Routes>
      </MemoryRouter>
    );
    act(() => navigate("/b"));
    act(() => screen.getByText("/b").click());
    expect(screen.getByText("/a")).toBeTruthy();
  });
});
