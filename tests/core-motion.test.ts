import { describe, expect, it } from "vitest";
import {
  createMotionLifecycle,
  snapTarget,
  rubberBand,
  legacyVelocityToUnitsPerSecond,
  unitsPerSecondToLegacyVelocity,
  createGestureArbiter,
  lockGestureAxis,
  shouldScrollConsume,
  createHapticEmitter,
  createReorderSession,
  moveItem,
  edgeScrollVelocity,
  createRewardParticles,
  truthfulProgress,
  capabilityCatalog,
  resolveReducedMotion,
  type MotionEvent,
} from "../src/core";
import { createEffectTestDouble } from "../src/extensions";
describe("portable motion contracts", () => {
  it("converts old velocity thresholds and projects snaps in seconds", () => {
    expect(legacyVelocityToUnitsPerSecond(0.35)).toBe(350);
    expect(unitsPerSecondToLegacyVelocity(350)).toBe(0.35);
    expect(snapTarget(20, 500, [0, 100, 200])).toBe(100);
    expect(snapTarget(0, 1e6, [0, 100])).toBe(100);
    expect(snapTarget(50, 0, [100, 0])).toBe(0);
    expect(() => snapTarget(0, 0, [])).toThrow();
    expect(() => snapTarget(NaN, 0, [0])).toThrow();
  });
  it("resists overscroll continuously and symmetrically with finite bounds", () => {
    expect(rubberBand(50, 0, 100)).toBe(50);
    expect(rubberBand(-80, 0, 100)).toBe(-40);
    expect(rubberBand(180, 0, 100)).toBe(140);
    expect(rubberBand(1e9, 0, 100)).toBeLessThan(180);
    expect(rubberBand(200, 0, 100, 0)).toBe(100);
  });
  it("retains sampled velocity on retarget and completes each run once", () => {
    const events: MotionEvent[] = [];
    const c = createMotionLifecycle((e) => events.push(e));
    const first = c.start(100);
    c.sample(first, 40, 200);
    const second = c.retarget(0);
    expect(c.snapshot).toEqual({
      position: 40,
      velocity: 200,
      target: 0,
      runId: second,
    });
    expect(c.complete(first)).toBe(false);
    expect(c.sample(first, 99, 0)).toBe(false);
    expect(c.complete(second)).toBe(true);
    expect(c.complete(second)).toBe(false);
    c.dispose();
    expect(events.map((e) => [e.id, e.phase])).toEqual([
      [1, "start"],
      [1, "cancel"],
      [2, "start"],
      [2, "complete"],
    ]);
    expect(() => c.start()).toThrow();
  });
  it("queues reentrant cancellation without orphaning or duplicating starts", () => {
    const events: MotionEvent[] = [];
    const c = createMotionLifecycle((e) => {
      events.push(e);
      if (e.id === 1 && e.phase === "cancel") c.cancel("listener");
    });
    c.start(1);
    c.start(2);
    expect(events.map((e) => [e.id, e.phase])).toEqual([
      [1, "start"],
      [1, "cancel"],
      [2, "start"],
      [2, "cancel"],
    ]);
    expect(c.snapshot.runId).toBeNull();
    const silent = createMotionLifecycle();
    silent.start();
    silent.cancel();
    silent.dispose();
  });
  it("arbitrates owner priority, axis and nested scroll boundaries", () => {
    let cancelled = 0;
    const a = createGestureArbiter();
    expect(
      a.claim({ owner: "sheet", axis: "y", cancel: () => cancelled++ }),
    ).toBe(true);
    expect(a.claim({ owner: "list", axis: "y" })).toBe(false);
    expect(a.claim({ owner: "slider", axis: "x", priority: 10 })).toBe(true);
    expect(cancelled).toBe(1);
    expect(a.release("sheet")).toBe(false);
    expect(a.release("slider")).toBe(true);
    expect(lockGestureAxis(30, 10)).toBe("x");
    expect(lockGestureAxis(10, 10)).toBeNull();
    expect(shouldScrollConsume(5, 0, 100)).toBe(false);
    expect(shouldScrollConsume(-5, 0, 100)).toBe(true);
  });
  it("dedupes semantic events per emitter and handles failed optional drivers", async () => {
    let count = 0,
      errors = 0;
    const h = createHapticEmitter(
      () => {
        count++;
        return Promise.reject("unavailable");
      },
      256,
      () => errors++,
    );
    expect(h.emit("success", "event")).toBe(true);
    expect(h.emit("success", "event")).toBe(false);
    h.reset();
    h.emit("success", "event");
    await Promise.resolve();
    expect(count).toBe(2);
    expect(errors).toBe(2);
  });
  it("restores cancelled reorder snapshots and rejects item injection", () => {
    const initial = ["a", "b", "c"];
    const s = createReorderSession(initial);
    s.update(moveItem(initial, 0, 2));
    expect(s.value).toEqual(["b", "c", "a"]);
    expect(() => s.update(["a", "b", "z"])).toThrow();
    expect(s.cancel()).toEqual(initial);
    expect(s.update(initial)).toBe(false);
    expect(initial).toEqual(["a", "b", "c"]);
    expect(() => moveItem(initial, -1, 0)).toThrow();
    expect(edgeScrollVelocity(0, 0, 100)).toBe(-600);
    expect(edgeScrollVelocity(50, 0, 100)).toBe(0);
  });
  it("uses finite deterministic reward data and truthful progress", () => {
    const particles = createRewardParticles(42);
    expect(particles).toEqual(createRewardParticles(42));
    expect(particles).not.toEqual(createRewardParticles(43));
    expect(particles.every((p) => p.delayMs + p.durationMs <= 720)).toBe(true);
    expect(() => createRewardParticles(42, -1)).toThrow();
    expect(truthfulProgress(0.8, 0.6)).toBe(0.6);
    expect(capabilityCatalog()).toHaveLength(13);
    expect(capabilityCatalog().every((c) => c.status === "unavailable")).toBe(
      true,
    );
    expect(resolveReducedMotion("never", true)).toBe(false);
    expect(resolveReducedMotion("always", false)).toBe(true);
  });
  it("extension double rejects stale callbacks and settles reduced motion synchronously", () => {
    const events: MotionEvent[] = [];
    const e = createEffectTestDouble((event) => events.push(event));
    const first = e.start({
      target: 100,
      policy: { enabled: true, reducedMotion: false },
    });
    e.retarget({ target: 0, policy: { enabled: true, reducedMotion: true } });
    expect(e.complete(first)).toBe(false);
    expect(events.map((e) => e.phase)).toEqual([
      "start",
      "cancel",
      "start",
      "complete",
    ]);
    e.dispose();
    expect(() =>
      e.start({ target: 1, policy: { enabled: true, reducedMotion: false } }),
    ).toThrow();
  });
});

import { resolveMomentumTarget, rewardTimeline } from "../src/core";
it("bounds shared momentum with configurable projection and velocity", () => {
  expect(
    resolveMomentumTarget(0, 1000, [0, 100, 200], { projectionMs: 100 }),
  ).toBe(100);
  expect(
    resolveMomentumTarget(0, 1000, [0, 100, 200], { maxVelocity: 0 }),
  ).toBe(0);
  expect(resolveMomentumTarget(150, 1e6, [0, 100, 200])).toBe(200);
  expect(() => resolveMomentumTarget(0, 1, [0], { maxVelocity: -1 })).toThrow();
});
it("validates reward stages and preserves simultaneous declaration order", () => {
  expect(
    rewardTimeline(
      [
        { id: "count", atMs: 10 },
        { id: "badge", atMs: 0 },
        { id: "particles", atMs: 10 },
      ],
      20,
    ).map((s) => s.id),
  ).toEqual(["badge", "count", "particles"]);
  expect(() => rewardTimeline([{ id: "late", atMs: 21 }], 20)).toThrow();
  expect(() =>
    rewardTimeline(
      [
        { id: "same", atMs: 0 },
        { id: "same", atMs: 1 },
      ],
      20,
    ),
  ).toThrow();
});
