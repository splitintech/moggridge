import { frameTransform, insetFor, layerFrame } from "../../src/integrations/react-router-screens";
import type { ScreenTransition } from "../../src/integrations/react-router-screens";

const viewport = { width: 390, height: 844 };
const t = (kind: ScreenTransition["kind"], extra: Partial<ScreenTransition> = {}): ScreenTransition => ({ kind, spring: "smooth", ...extra });
const frame = (transition: ScreenTransition, role: "enter" | "exit", progress: number, extra = {}) =>
  layerFrame({ transition, role, progress, viewport, ...extra });

describe("screen choreography", () => {
  it("pushes the new screen in from the right while the old one drifts left and dims", () => {
    expect(frame(t("push"), "enter", 0).x).toBe(390);
    expect(frame(t("push"), "enter", 1).x).toBe(0);
    expect(frame(t("push"), "exit", 1)).toEqual(expect.objectContaining({ x: -117, dim: 0.12 }));
    expect(frame(t("push"), "enter", 0.5).z).toBeGreaterThan(frame(t("push"), "exit", 0.5).z);
  });

  it("pops as the exact mirror, with the leaving screen on top", () => {
    expect(frame(t("pop"), "exit", 0).x).toBe(0);
    expect(frame(t("pop"), "exit", 1).x).toBe(390);
    expect(frame(t("pop"), "enter", 0)).toEqual(expect.objectContaining({ x: -117, dim: 0.12 }));
    expect(frame(t("pop"), "enter", 1)).toEqual(expect.objectContaining({ x: 0, dim: 0 }));
    expect(frame(t("pop"), "exit", 0.5).z).toBeGreaterThan(frame(t("pop"), "enter", 0.5).z);
  });

  it("slides tabs a short way in the direction of travel", () => {
    expect(frame(t("tab", { dir: 1, spring: "precise" }), "enter", 0)).toEqual(expect.objectContaining({ x: 28, opacity: 0 }));
    expect(frame(t("tab", { dir: -1, spring: "precise" }), "enter", 0).x).toBe(-28);
    expect(frame(t("tab", { dir: 1, spring: "precise" }), "exit", 1)).toEqual(expect.objectContaining({ x: -28, opacity: 0 }));
  });

  it("presents from the bottom and dismisses back down", () => {
    expect(frame(t("present"), "enter", 0).y).toBe(844);
    expect(frame(t("present"), "exit", 1).dim).toBe(0.3);
    expect(frame(t("dismiss"), "exit", 1).y).toBe(844);
    expect(frame(t("dismiss"), "exit", 0.5).z).toBeGreaterThan(frame(t("dismiss"), "enter", 0.5).z);
  });

  it("zoom-fades between spaces", () => {
    expect(frame(t("space"), "enter", 0)).toEqual(expect.objectContaining({ scale: 0.96, opacity: 0 }));
    expect(frame(t("space"), "exit", 1)).toEqual(expect.objectContaining({ scale: 0.96, opacity: 0 }));
  });

  it("grows the detail out of the card rect and shrinks it back", () => {
    const sourceRect = { x: 16, y: 120, width: 358, height: 480 };
    expect(frame(t("expand"), "enter", 0, { sourceRect }).clip).toBe("inset(120px 16px 244px 16px round 24px)");
    expect(frame(t("expand"), "enter", 1, { sourceRect }).clip).toBe("inset(0px 0px 0px 0px round 0px)");
    expect(frame(t("collapse"), "exit", 1, { sourceRect }).clip).toBe("inset(120px 16px 244px 16px round 24px)");
    // Without a card, expand falls back to a short rise + fade.
    expect(frame(t("expand"), "enter", 0).opacity).toBe(0);
  });

  it("replaces all movement with a crossfade for reduced motion", () => {
    const entering = frame(t("push"), "enter", 0.5, { reducedMotion: true });
    expect(entering).toEqual(expect.objectContaining({ x: 0, y: 0, scale: 1, opacity: 0.5 }));
    expect(frame(t("push"), "exit", 0.5, { reducedMotion: true })).toEqual(expect.objectContaining({ x: 0, opacity: 1 }));
  });

  it("writes no transform at rest", () => {
    expect(frameTransform(frame(t("push"), "enter", 1))).toBe("none");
    expect(frameTransform(frame(t("push"), "enter", 0))).toBe("translate3d(390px, 0px, 0) scale(1)");
    expect(insetFor({ x: -5, y: 0, width: 400, height: 900 }, viewport, 0)).toBe("inset(0px 0px 0px 0px round 0px)");
  });
});
