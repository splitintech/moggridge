import { __resetRootCssVarStacksForTests, pushRootCssVar } from "../../src/integrations/react-router-screens";

const NAME = "--mobile-bottom-nav-height";
const read = () => document.documentElement.style.getPropertyValue(NAME);

describe("pushRootCssVar", () => {
  beforeEach(() => {
    __resetRootCssVarStacksForTests();
    document.documentElement.style.removeProperty(NAME);
  });

  it("behaves like set-and-restore for a single owner", () => {
    document.documentElement.style.setProperty(NAME, "56px");
    const release = pushRootCssVar(NAME, "61px");
    expect(read()).toBe("61px");
    release();
    expect(read()).toBe("56px");
  });

  it("removes the property when there was no value before", () => {
    const release = pushRootCssVar(NAME, "61px");
    release();
    expect(read()).toBe("");
  });

  it("keeps the newer owner's value when the older owner leaves last", () => {
    const releaseOld = pushRootCssVar(NAME, "calc(80px + 12px)");
    const releaseNew = pushRootCssVar(NAME, "61px");
    // The leaving screen's bar unmounts after the entering one mounted.
    releaseOld();
    expect(read()).toBe("61px");
    releaseNew();
    expect(read()).toBe("");
  });

  it("falls back to the remaining owner when the newest leaves", () => {
    const releaseOld = pushRootCssVar(NAME, "calc(80px + 12px)");
    const releaseNew = pushRootCssVar(NAME, "61px");
    releaseNew();
    expect(read()).toBe("calc(80px + 12px)");
    releaseOld();
    expect(read()).toBe("");
  });

  it("ignores a second release", () => {
    const releaseA = pushRootCssVar(NAME, "61px");
    const releaseB = pushRootCssVar(NAME, "70px");
    releaseB();
    releaseB();
    expect(read()).toBe("61px");
    releaseA();
  });
});
