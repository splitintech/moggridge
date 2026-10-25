import { test, expect } from "@playwright/test";
test("all thirteen patterns render and keyboard alternatives change host state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("article.scene")).toHaveCount(13);
  await page.getByRole("button", { name: "Continue →" }).click();
  await expect(page.locator(".diagnostics")).toContainText("press · completed");
  const mechanical = page.getByRole("button", { name: "Reserve your spot" });
  await mechanical.scrollIntoViewIfNeeded();
  const hit = await mechanical.boundingBox();
  await mechanical.hover();
  await page.mouse.down();
  await expect
    .poll(() =>
      mechanical
        .locator("span")
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe("none");
  expect((await mechanical.boundingBox())?.y).toBe(hit?.y);
  await page.mouse.up();
  await page.getByRole("button", { name: "Yearly", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Yearly", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const homes = page.getByRole("region", { name: "Homes" });
  await homes.getByRole("button", { name: "Next" }).click();
  await expect(homes.getByRole("button", { name: "Previous" })).toBeEnabled();
  await homes.getByRole("button", { name: "Next" }).click();
  await expect(homes.getByRole("button", { name: "Next" })).toBeDisabled();
  await page.getByRole("button", { name: "Add room" }).click();
  await expect(page.getByRole("button", { name: "Room 4 ×" })).toBeVisible();
  await page.getByRole("button", { name: "Room 4 ×" }).click();
  await expect(page.getByRole("button", { name: "Room 4 ×" })).toHaveCount(0);
  await page.getByRole("slider", { name: "Confirmed progress" }).press("End");
  await expect(
    page.getByRole("progressbar", { name: "Profile completion" }),
  ).toHaveAttribute("aria-valuenow", "100");
  await page.getByRole("button", { name: "Toggle anticipation" }).click();
  await expect(page.locator(".anticipation-badge")).toBeVisible();
  await page.getByRole("button", { name: "Save home", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save home", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Simulate rejection" }).click();
  await expect(
    page.getByRole("button", { name: "Save home", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Move item 1", exact: true })
    .press("ArrowDown");
  await expect(page.locator("[data-reorder-id]").nth(2)).toHaveAttribute(
    "data-reorder-id",
    "Kitchen",
  );
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Restore notice" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm milestone" }).click();
  await expect(page.locator(".reward-badge")).toContainText("100");
  expect(errors).toEqual([]);
});
test("sheet and anchored popover close with Escape and restore focus", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open sheet" }).click();
  await expect(
    page.getByRole("dialog", { name: "Home details" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Collapse sheet" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Home options" });
  await trigger.click();
  await expect(
    page.getByRole("button", { name: "Save this home" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
test("morph reverses, lands, and returns focus under live reduced motion", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Spatial & media", exact: true })
    .click();
  const trigger = page.getByRole("button", { name: /fullscreen Source/ });
  await trigger.click();
  await page.getByRole("button", { name: "Reverse now" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const rect = await page.getByRole("dialog").boundingBox();
  expect(rect?.x).toBe(0);
  expect(rect?.y).toBe(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("video keeps player,parent,source and time through route and return", async ({
  page,
  browserName,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Spatial & media", exact: true })
    .click();
  await page.getByRole("button", { name: "Show inline video" }).click();
  const video = page.getByTestId("persistent-video");
  await video.evaluate(async (element) => {
    const player = element as HTMLVideoElement;
    await player.play();
    (window as any).__player = player;
    (window as any).__parent = player.parentElement;
    (window as any).__src = player.currentSrc;
  });
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0.1);
  await page.getByRole("button", { name: "Open video route" }).click();
  await expect(page).toHaveURL(/listing\/demo/);
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await video.evaluate((element) => element.closest('[aria-hidden="true"]')),
  ).toBeNull();
  await page.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  for (
    let attempt = 0;
    attempt < 8 &&
    !(await video.evaluate((element) => document.activeElement === element));
    attempt++
  ) {
    await page.keyboard.press("Shift+Tab");
  }
  await expect(video).toBeFocused();
  // Chromium native video controls can consume Escape internally. The named
  // surface close control remains keyboard reachable outside that native UI.
  await page.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  expect(
    await video.evaluate(
      (element) =>
        element === (window as any).__player &&
        element.parentElement === (window as any).__parent &&
        (element as HTMLVideoElement).currentSrc === (window as any).__src,
    ),
  ).toBe(true);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0.2);
  expect(
    await video.evaluate((element) => (element as HTMLVideoElement).paused),
  ).toBe(false);
});

test("lab desktop and mobile visual artifacts", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("article.scene")).toHaveCount(13);
  await page.screenshot({
    path: "/private/tmp/motion-lab-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/private/tmp/motion-lab-mobile.png",
    fullPage: true,
  });
});

test("100 reduced-motion morph cycles release global listeners and overlays", async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    const ids = new WeakMap<object, number>();
    const active = new Set<string>();
    let nextId = 0;
    const key = (target: EventTarget, type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
      if ((target !== window && target !== document) || !callback) return null;
      if (typeof options === "object" && options.once) return null;
      if (!ids.has(callback)) ids.set(callback, ++nextId);
      return `${target === window ? "window" : "document"}:${type}:${typeof options === "boolean" ? options : !!options?.capture}:${ids.get(callback)}`;
    };
    EventTarget.prototype.addEventListener = function(type, callback, options) {
      const id = key(this, type, callback, options);
      if (id) active.add(id);
      return add.call(this, type, callback, options);
    };
    EventTarget.prototype.removeEventListener = function(type, callback, options) {
      const id = key(this, type, callback, options);
      if (id) active.delete(id);
      return remove.call(this, type, callback, options);
    };
    (window as any).__motionGlobalListeners = () => [...active].sort();
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Spatial & media", exact: true }).click();
  const trigger = page.getByRole("button", { name: /fullscreen Source/ });
  const cycle = async () => {
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Reverse now" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  };
  // Warm lazy event registration before comparing lifecycle cleanup.
  await cycle();
  const baseline = await page.evaluate(() => ({
    listeners: (window as any).__motionGlobalListeners(),
    guards: document.querySelectorAll('[data-radix-focus-guard]').length,
  }));
  for (let cycleIndex = 0; cycleIndex < 100; cycleIndex++) await cycle();
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => (window as any).__motionGlobalListeners())).toEqual(baseline.listeners);
  expect(await page.locator('[data-radix-focus-guard]').count()).toBe(baseline.guards);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === "running").length)).toBe(0);
});
