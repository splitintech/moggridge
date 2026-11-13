# Screen transitions for React Router

`@splitin/react-mobile-interactions/integrations/react-router-screens` animates whole-screen navigation on phones:

| Kind | When | Motion |
| --- | --- | --- |
| `tab` | Peers in a bottom bar | Short slide + fade, direction from tab order |
| `push` / `pop` | Drill-in / Back | New screen slides in from the right; the old one drifts left and dims. Back is the exact reverse |
| `present` / `dismiss` | Task screens (checkout, notifications) | Slides up; dismissed down, including a swipe down from the top |
| `expand` / `collapse` | A card opening its screen | The screen grows out of the card and shrinks back into it |
| `space` | Moving between apps/dashboards (route families) | Zoom-fade |
| `crossfade` | Peers (sign-in ↔ sign-up), quick actions, excluded screens | Crossfade |

Back always plays the reverse of how a screen was entered, including after a reload (records are kept per history entry in `sessionStorage`). An edge swipe follows the finger and hands its velocity to the spring. Browser-drawn Back animations (iOS Safari's swipe, `PopStateEvent.hasUAVisualTransition`) are not animated a second time.

## Wiring

1. **Describe your routes.** One entry per route pattern; routes that render the same page share a `screen` id so moving between them never animates.

   ```ts
   import { createScreenRouteTable, createScreenTracker } from "@splitin/react-mobile-interactions/integrations/react-router-screens";

   export const screenRoutes = createScreenRouteTable({
     entries: [
       { pattern: "/", screen: "app:home", family: "app", depth: 0 },
       { pattern: "/explore", screen: "app:explore", family: "app", depth: 0, skeleton: "list" },
       { pattern: "/places/:id", screen: "app:place", family: "app", depth: 1, parent: "/explore" },
       { pattern: "/checkout", screen: "app:checkout", family: "app", depth: 1, presentation: "task", backDisabled: true },
       { pattern: "/sign-in", screen: "auth:sign-in", family: "auth", depth: 0 },
       { pattern: "/sign-up", screen: "auth:sign-up", family: "auth", depth: 0 },
     ],
     familyRoots: { app: "/", auth: "/sign-in" },
     tabOrder: (family) => (family === "app" ? ["app:home", "app:explore", "app:account"] : null),
     peers: [["auth:sign-in", "auth:sign-up"]],
     pushFamilies: ["auth"],
   });
   export const screenTracker = createScreenTracker({ table: screenRoutes });
   ```

2. **Render `<ScreenRoutes>` instead of `<Routes>`** inside a `MotionProvider` (springs, reduced motion and haptics come from it). With `enabled={false}` it is a plain `<Routes>`.

   ```tsx
   <ScreenRoutes tracker={screenTracker} enabled={motionFlag} renderSkeleton={(kind) => <Skeleton kind={kind} />} spaceLayerClassName="bg-white">
     {routeElements}
   </ScreenRoutes>
   ```

3. **Put a `<ScreenStage>` around each layout's outlet.** `scrollModel="window"` for pages that scroll the window; `scrollModel="layer"` when each screen scrolls its own container (dashboards). Give layers a background with `layerClassName`.

   ```tsx
   <ScreenStage scrollModel="window" layerClassName="bg-white pt-14" />
   ```

4. **Optional:** `useScreenBack()` for in-app Back buttons (pops, or goes to the logical parent without history); `screenIntentState({ kind: "expand", sourceId })` plus `registerExpandSource` on cards; `lazyRoute()` so prefetched screens render without a fallback frame; `pushRootCssVar` for CSS variables that overlapping layouts both set.

## Defaults

| Value | Default |
| --- | --- |
| Page spring (push, pop, present, dismiss, expand, collapse, space) | stiffness 280, damping 32, mass 1 (`DEFAULT_PAGE_SPRING`) |
| Tabs and fades | the `MotionProvider` policy spring |
| Back screen drift (parallax) | 0.3 of the width |
| Back screen dim | 0.12 |
| Tab slide | 28px |
| Space zoom | 0.96 |
| Compact viewport | `(max-width: 767.98px)` (`compactQuery`) |

`setScreenMotionOverrides` changes them at runtime (tuning panels). Reduced motion turns every kind into a 150ms crossfade; drags still follow the finger.

## Styling and fixed content

The stage's own layout is inline styles, so it needs no CSS framework. While a transition runs, window-scroll layers are pinned to the viewport (inner offset `top: -scrollY`), so `position: fixed` children stay where they are. When the transition settles, the transform and `will-change` are removed so fixed children resolve against the viewport again. Each layer has its own `Suspense` showing `renderSkeleton(kind)`, never a full-screen fallback.
