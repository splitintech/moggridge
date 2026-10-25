# Web motion workshop

From the package root, install the documented web peers and run `npm run dev:lab`. The Vite server listens on `127.0.0.1:4177`. Build the standalone example with `npx vite build --config examples/web/vite.config.ts`.

`Workshop.tsx` exports `MotionWorkshop`, which expects a React Router context. `main.tsx` supplies BrowserRouter for the standalone lab. The stylesheet is scoped to `.workshop` and `.motion-workshop-portal`, including content rendered through Radix portals. Applications may copy this example into a development-only route and replace the source imports with package subpaths; the gallery is not part of the published runtime entrypoint.

The catalog renders all thirteen interaction patterns. The spatial tab exercises fullscreen, right-edge and anchored surfaces, and one video that survives inline → expanded route → return. The local `public/continuity.mp4` is a deterministic test-pattern fixture shared with the native example, not external customer media.

Controls cover preset selection, stiffness/damping/mass, live reduced-motion policy, RTL, large text, disabled and pending states. Each example includes source; configuration export downloads JSON. The lifecycle log records semantic events only and does not put animation frames into React state.

Run `npx playwright test` for Chromium, Firefox and WebKit contracts. Browser automation does not establish physical mobile Safari/Chrome, installed-PWA, 120Hz, native video surface, or physical-device performance qualification.

## Persistent-media accessibility contract

A `MediaHost` outside a modal dialog is not automatically part of that dialog's focus or accessibility scope. Media expansion requests in this example explicitly set `modal: false`, yielding a named nonmodal surface with Escape/Close and focus restoration while leaving the stable player reachable by keyboard. The host remains in one DOM parent. The example assigns a higher z-index only while the expanded slot is selected; the library does not globally elevate inline media. For a truly modal player, the application must provide a stable media parent within its modal focus/branch architecture.

`RewardSequence` deduplicates the latest 512 event IDs per mounted instance; do not reuse old IDs as a business-level eligibility mechanism.
