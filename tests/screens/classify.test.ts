import { describe, expect, it } from "vitest";
import {
  classifyScreenTransition,
  reverseTransition,
  type ClassifyInput,
  type ScreenTransition,
} from "../../src/integrations/react-router-screens";
import { demoTable } from "./demoRoutes";

const on = { active: true };

function move(
  from: string,
  to: string,
  extra: Partial<Omit<ClassifyInput, "from" | "to" | "table">> = {}
): ScreenTransition {
  return classifyScreenTransition({
    table: demoTable,
    from: demoTable.resolveScreen(from),
    to: demoTable.resolveScreen(to),
    navigationType: "PUSH",
    idxDelta: 1,
    role: "member",
    env: on,
    ...extra,
  });
}

describe("classifyScreenTransition", () => {
  it("does nothing when inactive, on first load, or within one screen", () => {
    expect(move("/explore", "/trips", { env: { active: false } }).kind).toBe("none");
    expect(
      classifyScreenTransition({ table: demoTable, from: null, to: demoTable.resolveScreen("/explore"), navigationType: "POP", idxDelta: 0, env: on }).kind
    ).toBe("none");
    expect(move("/studio/repairs", "/studio/repairs/orders").kind).toBe("none");
    expect(move("/leases/l1", "/leases/l1/payments").kind).toBe("none");
  });

  it.each([
    ["member", "/explore", "/trips", 1],
    ["member", "/saved", "/explore", -1],
    ["guest", "/", "/explore", 1],
    ["guest", "/account", "/", -1],
  ] as const)("slides %s bottom tabs by tab order (%s -> %s)", (role, from, to, dir) => {
    expect(move(from, to, { role })).toEqual(expect.objectContaining({ kind: "tab", dir, spring: "precise" }));
  });

  it.each([
    ["/studio/listings", "/studio/inbox", 1],
    ["/studio/repairs", "/studio/messages", -1],
    ["/studio/inbox", "/studio/messages", 1],
    ["/studio", "/studio/repairs", 1],
    ["/studio/messages", "/studio", -1],
  ] as const)("slides same-side dashboard tabs the right way (%s -> %s)", (from, to, dir) => {
    expect(move(from, to)).toEqual(expect.objectContaining({ kind: "tab", dir }));
  });

  it("pushes drill-ins and pops to the logical parent", () => {
    expect(move("/studio", "/studio/earnings")).toEqual(expect.objectContaining({ kind: "push", spring: "smooth" }));
    expect(move("/explore", "/places/1").kind).toBe("push");
    expect(move("/account", "/help").kind).toBe("push");
    expect(move("/account", "/account/edit").kind).toBe("push");
    // A push-style "back" link to the parent still animates as a pop.
    expect(move("/help", "/account").kind).toBe("pop");
    expect(move("/groups/g1/overview", "/groups").kind).toBe("pop");
  });

  it("presents task screens and dismisses them", () => {
    expect(move("/places/a", "/checkout").kind).toBe("present");
    expect(move("/account", "/notifications").kind).toBe("present");
    expect(move("/trips", "/trips/s1/lobby").kind).toBe("present");
    expect(move("/studio", "/studio/notifications").kind).toBe("present");
    expect(move("/checkout", "/explore").kind).toBe("dismiss");
  });

  it("zoom-fades between spaces and pushes into push families", () => {
    expect(move("/account", "/rooms").kind).toBe("space");
    expect(move("/rooms", "/account").kind).toBe("space");
    expect(move("/explore", "/studio").kind).toBe("space");
    expect(move("/explore", "/sign-in").kind).toBe("push");
    expect(move("/sign-in", "/explore", { navigationType: "REPLACE" }).kind).toBe("space");
  });

  it("crossfades peers and pushes sub-steps", () => {
    expect(move("/sign-in", "/sign-up").kind).toBe("crossfade");
    expect(move("/sign-up", "/sign-in").kind).toBe("crossfade");
    expect(move("/", "/waitlist").kind).toBe("crossfade");
    expect(move("/sign-in", "/forgot").kind).toBe("push");
    expect(move("/forgot", "/reset").kind).toBe("push");
  });

  it("fades into excluded screens and crossfade families", () => {
    expect(move("/trips/s1/lobby", "/trips/s1/live").kind).toBe("crossfade");
    expect(move("/explore", "/onboarding").kind).toBe("crossfade");
    expect(move("/onboarding", "/studio").kind).toBe("crossfade");
  });

  it("uses explicit intents first", () => {
    expect(move("/explore", "/places/a", { intent: { kind: "expand", sourceId: "place:a" } })).toEqual(
      expect.objectContaining({ kind: "expand", sourceId: "place:a", spring: "smooth" })
    );
    expect(move("/studio", "/studio/inbox", { intent: { origin: "quick-action" } }).kind).toBe("crossfade");
  });

  it("plays the exact reverse on Back, using how the screen was entered", () => {
    const entered = move("/explore", "/places/a", { intent: { kind: "expand", sourceId: "place:a" } });
    const back = move("/places/a", "/explore", { navigationType: "POP", idxDelta: -1, record: entered });
    expect(back).toEqual(expect.objectContaining({ kind: "collapse", sourceId: "place:a" }));

    const tab = move("/explore", "/saved");
    expect(move("/saved", "/explore", { navigationType: "POP", idxDelta: -1, record: tab })).toEqual(
      expect.objectContaining({ kind: "tab", dir: -1 })
    );
    const present = move("/account", "/notifications");
    expect(move("/notifications", "/account", { navigationType: "POP", idxDelta: -1, record: present }).kind).toBe("dismiss");
  });

  it("derives a reverse when no record exists (reload, then Back)", () => {
    expect(move("/studio/earnings", "/studio", { navigationType: "POP", idxDelta: -1 }).kind).toBe("pop");
    expect(move("/checkout", "/places/a", { navigationType: "POP", idxDelta: -1 }).kind).toBe("dismiss");
  });

  it("replays the original motion on Forward", () => {
    const push = move("/studio", "/studio/earnings");
    expect(move("/studio", "/studio/earnings", { navigationType: "POP", idxDelta: 1, record: push }).kind).toBe("push");
  });

  it("skips POPs the browser already animated, unless the app started them", () => {
    const record = move("/studio", "/studio/earnings");
    const pop = { navigationType: "POP" as const, idxDelta: -1, record };
    expect(move("/studio/earnings", "/studio", { ...pop, env: { active: true, uaTransition: true } }).kind).toBe("none");
    expect(move("/studio/earnings", "/studio", { ...pop, env: { active: true, iosNonStandalone: true } }).kind).toBe("none");
    expect(
      move("/studio/earnings", "/studio", { ...pop, env: { active: true, iosNonStandalone: true }, intent: { origin: "in-app-back" } }).kind
    ).toBe("pop");
    expect(move("/studio/earnings", "/studio", { ...pop, env: { active: true } }).kind).toBe("pop");
    expect(
      move("/studio/earnings", "/studio", {
        ...pop,
        env: { active: true, uaTransition: true },
        intent: { origin: "gesture", interactive: { progress: 0.4, velocity: 1.2 } },
      })
    ).toEqual(expect.objectContaining({ kind: "pop", interactive: { progress: 0.4, velocity: 1.2 } }));
  });

  it("reverses every kind symmetrically", () => {
    expect(reverseTransition({ kind: "push", spring: "smooth" }).kind).toBe("pop");
    expect(reverseTransition({ kind: "present", spring: "smooth" }).kind).toBe("dismiss");
    expect(reverseTransition({ kind: "expand", spring: "smooth", sourceId: "x" })).toEqual(
      expect.objectContaining({ kind: "collapse", sourceId: "x" })
    );
    expect(reverseTransition({ kind: "tab", dir: 1, spring: "precise" }).dir).toBe(-1);
    expect(reverseTransition({ kind: "space", spring: "smooth" }).kind).toBe("space");
  });
});
