/**
 * Screen-to-screen motion for React Router apps on phones: tabs slide by
 * order, drill-ins push and pop (with a finger-following edge swipe), task
 * screens slide up and swipe down, cards expand into their screens, and
 * moves between spaces zoom-fade. Back always plays the exact reverse.
 *
 * The app supplies its route table (`createScreenRouteTable`), renders
 * `<ScreenRoutes>` instead of `<Routes>`, and puts a `<ScreenStage>` around
 * each layout's outlet. See docs/screen-transitions.md.
 */
export * from "./types";
export * from "./routeTable";
export * from "./classify";
export * from "./history";
export * from "./tracker";
export * from "./config";
export * from "./choreography";
export * from "./screenMotionConfig";
export * from "./ScreenStage";
export * from "./ScreenRoutes";
export * from "./stageController";
export * from "./interactiveBack";
export * from "./useTaskSwipeDown";
export * from "./useScreenBack";
export * from "./expandSources";
export * from "./lazyRoute";
export * from "./routePrefetch";
export * from "./rootCssVarStack";
