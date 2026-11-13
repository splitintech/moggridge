import type { ReactNode } from "react";
import { createRoutesFromChildren, Route } from "react-router-dom";
import { lazyRoute } from "../../src/integrations/react-router-screens";
import { __resetRoutePrefetchForTests, preloadersForPath, prefetchRoute, registerPrefetchRoutes } from "../../src/integrations/react-router-screens";

const Guard = ({ children }: { children: ReactNode }) => <>{children}</>;
const view = (name: string) => () => <p>{name}</p>;

describe("route prefetch registry", () => {
  const layoutFactory = vi.fn(() => Promise.resolve({ default: view("layout") }));
  const earningsFactory = vi.fn(() => Promise.resolve({ default: view("earnings") }));
  const messagesFactory = vi.fn(() => Promise.resolve({ default: view("messages") }));
  const StudioLayout = lazyRoute(layoutFactory);
  const Earnings = lazyRoute(earningsFactory);
  const Messages = lazyRoute(messagesFactory);

  beforeEach(() => {
    __resetRoutePrefetchForTests();
    vi.clearAllMocks();
    registerPrefetchRoutes(
      createRoutesFromChildren(
        <>
          <Route path="/studio" element={<StudioLayout />}>
            <Route path="earnings" element={<Earnings />} />
            <Route path="messages" element={<Guard><Messages /></Guard>} />
          </Route>
        </>
      )
    );
  });

  it("finds the layout and the screen for a path, including inside guards", () => {
    expect(preloadersForPath("/studio/earnings")).toEqual([StudioLayout.preload, Earnings.preload]);
    expect(preloadersForPath("/studio/messages")).toEqual([StudioLayout.preload, Messages.preload]);
    expect(preloadersForPath("/nowhere")).toEqual([]);
  });

  it("starts each download once", async () => {
    prefetchRoute("/studio/earnings");
    prefetchRoute("/studio/earnings");
    prefetchRoute("/studio/messages");
    await Promise.resolve();
    expect(layoutFactory).toHaveBeenCalledTimes(1);
    expect(earningsFactory).toHaveBeenCalledTimes(1);
    expect(messagesFactory).toHaveBeenCalledTimes(1);
  });
});
