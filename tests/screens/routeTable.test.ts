import { describe, expect, it } from "vitest";
import { createScreenRouteTable } from "../../src/integrations/react-router-screens";
import { demoTable } from "./demoRoutes";

describe("createScreenRouteTable", () => {
  it("resolves screens with their params, parents and defaults", () => {
    const place = demoTable.resolveScreen("/places/42");
    expect(place).toEqual(
      expect.objectContaining({ screen: "app:place", key: "app:place?id=42", family: "app", depth: 1, parentPath: "/explore", skeleton: "detail" })
    );
    expect(demoTable.resolveScreen("/checkout")).toEqual(expect.objectContaining({ presentation: "task", backDisabled: true }));
    expect(demoTable.resolveScreen("/trips/9/live").presentation).toBe("excluded");
    expect(demoTable.resolveScreen("/explore/").screen).toBe("app:explore");
  });

  it("keeps aliases, search params and splat segments on one screen key", () => {
    expect(demoTable.resolveScreen("/studio/repairs").key).toBe(demoTable.resolveScreen("/studio/repairs/orders").key);
    expect(demoTable.resolveScreen("/studio/setup").key).toBe(demoTable.resolveScreen("/studio/automation").key);
    expect(demoTable.resolveScreen("/leases/l1").key).toBe(demoTable.resolveScreen("/leases/l1/payments").key);
    expect(demoTable.resolveScreen("/leases/l1").key).not.toBe(demoTable.resolveScreen("/leases/l2").key);
  });

  it("falls back for unknown paths", () => {
    expect(demoTable.resolveScreen("/nowhere")).toEqual(
      expect.objectContaining({ screen: "app:unknown", family: "app", depth: 1, parentPath: "/" })
    );
  });

  it("finds the logical parent for Back without history", () => {
    expect(demoTable.logicalParentPath("/groups/g1/members")).toBe("/groups");
    expect(demoTable.logicalParentPath("/studio/earnings")).toBe("/studio");
    expect(demoTable.logicalParentPath("/rooms")).toBe("/account");
    expect(demoTable.logicalParentPath("/sign-up")).toBe("/sign-in");
    expect(demoTable.logicalParentPath("/explore")).toBe("/");
  });

  it("answers tab orders per role, peers (with prefixes) and family rules", () => {
    expect(demoTable.tabOrderFor("app", "guest")?.[0]).toBe("app:home");
    expect(demoTable.tabOrderFor("app", "member")?.[0]).toBe("app:explore");
    expect(demoTable.tabOrderFor("rooms", null)).toBeNull();
    expect(demoTable.isPeer("auth:sign-up", "auth:sign-in")).toBe(true);
    expect(demoTable.isPeer("app:home", "waitlist:home")).toBe(true);
    expect(demoTable.isPeer("app:home", "app:explore")).toBe(false);
    expect(demoTable.isPushFamily("auth")).toBe(true);
    expect(demoTable.isCrossfadeFamily("tools")).toBe(true);
  });

  it("works with only entries", () => {
    const table = createScreenRouteTable({ entries: [{ pattern: "/a", screen: "x:a", family: "x", depth: 0 }] });
    expect(table.resolveScreen("/a").screen).toBe("x:a");
    expect(table.familyRoot("x")).toBe("/");
    expect(table.tabOrderFor("x", null)).toBeNull();
    expect(table.isPeer("x:a", "x:b")).toBe(false);
  });
});
