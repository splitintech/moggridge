import { releaseVelocity, shouldCommitInteractiveBack, shouldLockInteractiveBack } from "../../src/integrations/react-router-screens";

describe("interactive edge swipe back", () => {
  it("locks on only for a clearly horizontal, rightward drag", () => {
    expect(shouldLockInteractiveBack(14, 4)).toBe(true);
    expect(shouldLockInteractiveBack(8, 0)).toBe(false);
    expect(shouldLockInteractiveBack(20, 19)).toBe(false);
    expect(shouldLockInteractiveBack(-30, 0)).toBe(false);
  });

  it("measures release speed over the last 100 ms", () => {
    const samples = [
      { x: 0, t: 0 },
      { x: 100, t: 300 },
      { x: 130, t: 340 },
      { x: 170, t: 380 },
    ];
    expect(releaseVelocity(samples)).toBeCloseTo(0.875, 5); // (170 - 100) / (380 - 300)
    expect(releaseVelocity([{ x: 10, t: 0 }])).toBe(0);
  });

  it("commits past a third of the width or on a flick, and a leftward flick cancels", () => {
    expect(shouldCommitInteractiveBack(0.34, 0)).toBe(true);
    expect(shouldCommitInteractiveBack(0.1, 0.6)).toBe(true);
    expect(shouldCommitInteractiveBack(0.2, 0.2)).toBe(false);
    expect(shouldCommitInteractiveBack(0.6, -0.5)).toBe(false);
  });
});
