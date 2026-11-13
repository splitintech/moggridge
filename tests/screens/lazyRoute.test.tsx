import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { lazyRoute } from "../../src/integrations/react-router-screens";

function Screen({ label }: { label: string }) {
  return <p>{label}</p>;
}

describe("lazyRoute", () => {
  it("suspends once on a cold load, like React.lazy", async () => {
    const Route = lazyRoute(() => Promise.resolve({ default: Screen }));
    render(
      <Suspense fallback={<p>skeleton</p>}>
        <Route label="Earnings" />
      </Suspense>
    );
    expect(screen.getByText("skeleton")).toBeTruthy();
    expect(await screen.findByText("Earnings")).toBeTruthy();
  });

  it("renders synchronously after preload, with no fallback frame", async () => {
    const factory = vi.fn(() => Promise.resolve({ default: Screen }));
    const Route = lazyRoute(factory);
    await act(async () => {
      await Route.preload();
    });
    expect(Route.isLoaded()).toBe(true);
    render(
      <Suspense fallback={<p>skeleton</p>}>
        <Route label="Earnings" />
      </Suspense>
    );
    expect(screen.queryByText("skeleton")).toBeNull();
    expect(screen.getByText("Earnings")).toBeTruthy();
    await act(async () => {
      await Route.preload();
    });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("allows a retry after a failed download", async () => {
    const factory = vi
      .fn<() => Promise<{ default: typeof Screen }>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"))
      .mockResolvedValue({ default: Screen });
    const Route = lazyRoute(factory);
    await expect(Route.preload()).rejects.toThrow("Failed to fetch");
    await expect(Route.preload()).resolves.toEqual({ default: Screen });
    expect(Route.isLoaded()).toBe(true);
  });
});
