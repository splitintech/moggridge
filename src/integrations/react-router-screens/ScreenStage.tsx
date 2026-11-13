import { AnimatePresence, animate, useMotionValue, usePresence, type AnimationPlaybackControls, type MotionValue } from "framer-motion";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ContextType,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { Routes, UNSAFE_LocationContext, useOutlet } from "react-router-dom";
import { useMotionPolicy, useMotionTransition } from "../../web/provider";
import { DEFAULT_SCREEN_MOTION_TOKENS, frameTransform, layerFrame, type LayerFrame, type Rect, type ScreenMotionTokens, type Viewport } from "./choreography";
import { useCompactViewport, useScreenStageConfig } from "./config";
import { expandSourceRect, findVisibleSource } from "./expandSources";
import { getEntryTransition } from "./history";
import { ScreenNavigationProvider, useScreenNavigation, type ScreenNavigationState } from "./tracker";
import type { ScreenSkeletonKind, ScreenTransition } from "./types";
import { registerInteractiveBackStage, type InteractiveBackSession } from "./stageController";
import { useTaskSwipeDown } from "./useTaskSwipeDown";
import { preciseScreenSpring, reducedFadeDuration, screenMotionTokens, smoothScreenSpring } from "./screenMotionConfig";

const noDrag = () => null;

/** Class names joined without a CSS framework (the stage's own layout is inline styles). */
const joinClasses = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ") || undefined;

const FILL: CSSProperties = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_BACKGROUND = "Canvas";

/**
 * Holds the entering and leaving screen during a transition.
 *
 * - The leaving screen keeps its last outlet element and location (frozen by
 *   AnimatePresence), so it never re-renders with the new URL.
 * - One progress value drives both layers through `layerFrame`.
 * - Window-scroll layouts pin both layers to the viewport while moving, so
 *   `position: fixed` children (reel, map, chat room) stay where they are; the
 *   stage unpins and restores scroll only after the old screen is gone.
 * - Each layer has its own Suspense, so a screen whose code is still loading
 *   shows a skeleton inside the moving layer instead of the full-screen logo.
 */

export type ScreenStageScrollModel = "window" | "layer";

type LocationContextValue = ContextType<typeof UNSAFE_LocationContext>;

interface Run {
  id: number;
  transition: ScreenTransition;
  enteringId: number;
  exitingId: number | null;
  viewport: Viewport;
  exitOffset: number;
  enterOffset: number;
  sourceRect: Rect | null;
  reduced: boolean;
}

type DragAxis = "x" | "y";

interface Drag {
  id: number;
  axis: DragAxis;
  viewport: Viewport;
  offset: number;
}

interface StageState {
  enteringId: number;
  run: Run | null;
  drag: Drag | null;
  frozenHeight: number | null;
}

interface LayerNodes {
  root: HTMLDivElement;
  veil: HTMLDivElement;
}

/** Imperative style writer: React never sets these properties, so it never fights the spring. */
class StageEngine {
  layers = new Map<number, LayerNodes>();
  run: Run | null = null;
  drag: Drag | null = null;
  backdrop: HTMLDivElement | null = null;
  exitCallbacks = new Map<number, () => void>();
  tokens: ScreenMotionTokens = DEFAULT_SCREEN_MOTION_TOKENS;

  apply(progress: number) {
    for (const [id, nodes] of this.layers) {
      if (this.drag && id === this.drag.id) {
        const p = Math.max(0, progress);
        const { axis, viewport } = this.drag;
        this.write(nodes, {
          x: axis === "x" ? p * viewport.width : 0,
          y: axis === "y" ? p * viewport.height : 0,
          scale: 1,
          opacity: 1,
          dim: 0,
          shadow: axis === "x" ? 1 : 0,
          clip: null,
          z: 2,
        });
        continue;
      }
      const run = this.run;
      const role = !run ? null : id === run.enteringId ? "enter" : id === run.exitingId ? "exit" : null;
      if (!run || !role) {
        this.rest(nodes);
        continue;
      }
      this.write(
        nodes,
        layerFrame({
          transition: run.transition,
          role,
          progress,
          viewport: run.viewport,
          sourceRect: run.sourceRect,
          reducedMotion: run.reduced,
          tokens: this.tokens,
        })
      );
    }
    if (this.backdrop) {
      this.backdrop.style.opacity = this.drag ? String(0.08 * (1 - Math.min(1, Math.max(0, progress)))) : "0";
    }
  }

  write({ root, veil }: LayerNodes, frame: LayerFrame) {
    root.style.transform = frameTransform(frame);
    root.style.opacity = frame.opacity >= 1 ? "" : String(Math.max(0, frame.opacity));
    root.style.zIndex = String(frame.z);
    root.style.clipPath = frame.clip ?? "";
    root.style.boxShadow = frame.shadow > 0 ? `-10px 0 28px rgba(0, 0, 0, ${(0.16 * frame.shadow).toFixed(3)})` : "";
    root.style.willChange = "transform, opacity";
    veil.style.display = frame.dim > 0 ? "block" : "none";
    veil.style.opacity = frame.dim > 0 ? String(frame.dim) : "";
  }

  rest({ root, veil }: LayerNodes) {
    root.style.transform = "";
    root.style.opacity = "";
    root.style.zIndex = "";
    root.style.clipPath = "";
    root.style.boxShadow = "";
    root.style.willChange = "";
    veil.style.display = "none";
    veil.style.opacity = "";
  }

  releaseExits() {
    const callbacks = Array.from(this.exitCallbacks.values());
    this.exitCallbacks.clear();
    for (const callback of callbacks) callback();
  }
}

interface StageContextValue {
  engine: StageEngine;
  run: Run | null;
  drag: Drag | null;
  scrollModel: ScreenStageScrollModel;
  pinned: boolean;
  /** The present screen is a task that can be swiped down to close. */
  dismissible: boolean;
  startDismissDrag: () => InteractiveBackSession | null;
}

const StageContext = createContext<StageContextValue | null>(null);

const SCROLL_KEY = (key: string) => `splitin:scroll:${key}`;
const LAYER_SCROLL_KEY = (key: string) => `splitin:scroll:layer:${key}`;

function readSavedWindowScroll(nav: ScreenNavigationState): number {
  if (nav.navigationType !== "POP") return 0;
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY(nav.location.key || `${nav.location.pathname}${nav.location.search}`));
    const value = raw == null ? 0 : Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

const PINNED_ATTRIBUTE = "screenStage";

function focusHeading(root: HTMLElement | undefined) {
  if (!root) return;
  if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return;
  if (root.contains(document.activeElement)) return;
  const target = root.querySelector<HTMLElement>("h1, [data-route-heading]");
  if (!target) return;
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

export interface ScreenStageProps {
  scrollModel: ScreenStageScrollModel;
  /** Element for the stage viewport (dashboards use <main>). */
  as?: ElementType;
  viewportClassName?: string;
  /** Classes for each screen layer (layout padding, scroller classes). */
  layerClassName?: string;
  /** Classes for the wrapper inside each layer. */
  contentClassName?: string;
  /** Attributes only the present layer carries (e.g. the bottom-nav scroll container marker). */
  presentLayerAttributes?: Record<string, string>;
  /** Defaults to the route outlet. */
  children?: ReactNode;
  testId?: string;
}

export function ScreenStage(props: ScreenStageProps) {
  const nav = useScreenNavigation();
  const outlet = useOutlet();
  const content = props.children ?? outlet;
  if (!nav || !nav.enabled) return <StaticStage {...props}>{content}</StaticStage>;
  return <ActiveStage {...props} nav={nav} content={content} level="screen" />;
}

/**
 * App-level stage: animates only when the space changes (renter app, a
 * dashboard, Mates, Neighborhood, sign-in). Each space layer renders its own
 * <Routes> for its own location, so a leaving space stays exactly as it was.
 */
export function SpaceStage({ nav, routes, layerClassName }: { nav: ScreenNavigationState; routes: ReactNode; layerClassName?: string }) {
  return (
    <ActiveStage nav={nav} level="space" scrollModel="window" testId="space-stage" layerClassName={layerClassName} content={
      <ScreenNavigationProvider value={nav}>
        <Routes location={nav.location}>{routes}</Routes>
      </ScreenNavigationProvider>
    } />
  );
}

/** Same DOM as an idle stage, without the engine (no tracker mounted). */
function StaticStage({ scrollModel, as: Viewport = "div", viewportClassName, layerClassName, contentClassName, presentLayerAttributes, children, testId }: ScreenStageProps) {
  return (
    <div data-screen-stage={scrollModel} data-testid={testId} style={scrollModel === "layer" ? { display: "contents" } : undefined}>
      <Viewport data-screen-stage-viewport className={viewportClassName} style={{ position: "relative" }}>
        <div
          data-screen-layer="static"
          className={layerClassName}
          style={scrollModel === "layer" ? FILL : { position: "relative" }}
          {...presentLayerAttributes}
        >
          <div className={contentClassName}>{children}</div>
        </div>
      </Viewport>
    </div>
  );
}

function ActiveStage({
  nav,
  content,
  scrollModel,
  as: Viewport = "div",
  viewportClassName,
  layerClassName,
  contentClassName,
  presentLayerAttributes,
  testId,
  level,
}: ScreenStageProps & { nav: ScreenNavigationState; content: ReactNode; level: "screen" | "space" }) {
  const layerId = level === "space" ? nav.familyLayerId : nav.screenLayerId;
  const isMobile = useCompactViewport();
  const policy = useMotionPolicy();
  const preciseTransition = useMotionTransition();
  const shouldAnimate = policy.enabled && !policy.reducedMotion;
  const background = useScreenStageConfig().background ?? DEFAULT_BACKGROUND;
  const locationContext = useContext(UNSAFE_LocationContext);
  const engineRef = useRef<StageEngine | null>(null);
  if (!engineRef.current) engineRef.current = new StageEngine();
  const engine = engineRef.current;
  const progress = useMotionValue(1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef<Run | null>(null);

  const [stage, setStage] = useState<StageState>(() => ({ enteringId: layerId, run: null, drag: null, frozenHeight: null }));

  // A new screen: decide the run during render so pinning lands in the same commit as the new layer.
  if (layerId !== stage.enteringId) {
    const animateRun = isMobile && nav.transition.kind !== "none";
    let run: Run | null = null;
    if (animateRun) {
      run = {
        id: nav.transitionId,
        transition: nav.transition,
        enteringId: layerId,
        exitingId: stage.enteringId,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        exitOffset: scrollModel === "window" ? (stage.drag ? stage.drag.offset : window.scrollY) : 0,
        enterOffset: scrollModel === "window" ? readSavedWindowScroll(nav) : 0,
        sourceRect: nav.transition.kind === "expand" ? expandSourceRect(nav.transition.sourceId) : null,
        reduced: !shouldAnimate,
      };
    }
    const frozenHeight =
      run && scrollModel === "window" ? stage.frozenHeight ?? wrapperRef.current?.offsetHeight ?? null : null;
    setStage({ enteringId: layerId, run, drag: null, frozenHeight });
  }

  const pinned = scrollModel === "window" && Boolean(stage.run || stage.drag);

  // Drive DOM writes from the single progress value.
  useEffect(() => progress.on("change", (value) => engine.apply(value)), [engine, progress]);

  // Mark the document while pinned so ScrollToTop doesn't record positions taken under the pin.
  useLayoutEffect(() => {
    if (!pinned) return undefined;
    document.documentElement.dataset[PINNED_ATTRIBUTE] = "pinned";
    return () => {
      delete document.documentElement.dataset[PINNED_ATTRIBUTE];
    };
  }, [pinned]);

  // Run lifecycle.
  const runId = stage.run?.id ?? null;
  useLayoutEffect(() => {
    const run = stage.run;
    engine.run = run;
    engine.drag = null;
    engine.tokens = screenMotionTokens();
    if (!run) {
      engine.apply(1);
      engine.releaseExits();
      const finished = finishedRef.current;
      finishedRef.current = null;
      if (finished && scrollModel === "window") {
        window.scrollTo({ top: finished.enterOffset, left: 0, behavior: "instant" as ScrollBehavior });
        const target = finished.enterOffset;
        requestAnimationFrame(() => {
          if (Math.abs(window.scrollY - target) > 1) window.scrollTo({ top: target, left: 0, behavior: "instant" as ScrollBehavior });
        });
      }
      if (finished && finished.transition.kind !== "none") focusHeading(engine.layers.get(finished.enteringId)?.root);
      return undefined;
    }

    let controls: AnimationPlaybackControls | null = null;
    let frame = 0;
    let cancelled = false;
    let hiddenSource: HTMLElement | null = null;
    const start = run.transition.interactive?.progress ?? 0;
    const velocity = run.transition.interactive?.velocity ?? 0;

    // Leaving screen: inert, media paused.
    const exiting = run.exitingId != null ? engine.layers.get(run.exitingId)?.root : undefined;
    if (exiting) {
      exiting.setAttribute("inert", "");
      exiting.setAttribute("aria-hidden", "true");
      exiting.querySelectorAll("video").forEach((video) => {
        try {
          video.pause();
        } catch {
          /* detached media */
        }
      });
    }

    const settle = () => {
      if (cancelled) return;
      if (hiddenSource) hiddenSource.style.visibility = "";
      finishedRef.current = run;
      // Let the old screen unmount (and its cleanups, e.g. scroll-lock release, run)
      // before unpinning, so a restored scroll position can't be overwritten.
      engine.releaseExits();
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          setStage((current) => (current.run?.id === run.id ? { ...current, run: null, frozenHeight: null } : current));
        });
      });
    };

    const begin = () => {
      if (cancelled) return;
      progress.jump(start);
      engine.apply(start);
      const spring = run.reduced
        ? { duration: reducedFadeDuration(), ease: "easeOut" as const }
        : run.transition.spring === "smooth"
          ? smoothScreenSpring()
          : preciseScreenSpring(preciseTransition);
      controls = animate(progress as MotionValue<number>, 1, { ...spring, velocity, onComplete: settle });
    };

    if (run.transition.kind === "collapse") {
      // Give the previous screen a frame to restore its scroll/reel position, then find the card.
      engine.apply(0);
      frame = requestAnimationFrame(() => {
        const entering = engine.layers.get(run.enteringId)?.root ?? null;
        const card = findVisibleSource(entering, run.transition.sourceId, run.viewport.height) as HTMLElement | null;
        if (card) {
          const box = card.getBoundingClientRect();
          run.sourceRect = { x: box.left, y: box.top, width: box.width, height: box.height };
          hiddenSource = card;
          card.style.visibility = "hidden";
        } else {
          run.transition = { ...run.transition, kind: "pop" };
        }
        begin();
      });
    } else {
      // Paint the start position now, but start the spring's clock on the next
      // frame. Mounting a heavy screen (Explore, dashboards) can block the main
      // thread for a few hundred ms after this commit; timing from here would
      // spend the whole transition before its first painted frame.
      progress.jump(start);
      engine.apply(start);
      frame = requestAnimationFrame(begin);
    }

    const onHidden = () => {
      if (!document.hidden) return;
      controls?.stop();
      progress.jump(1);
      settle();
    };
    document.addEventListener("visibilitychange", onHidden);

    return () => {
      cancelled = true;
      controls?.stop();
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onHidden);
      if (hiddenSource) hiddenSource.style.visibility = "";
      if (exiting) {
        exiting.removeAttribute("inert");
        exiting.removeAttribute("aria-hidden");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Interactive gestures: edge swipe back (x) and swipe down to close a task (y).
  // The gesture handler drives the current screen while the finger is down.
  const latest = useRef({ stage, nav, isMobile });
  latest.current = { stage, nav, isMobile };
  const startDragRef = useRef<(axis: DragAxis) => InteractiveBackSession | null>(() => null);
  startDragRef.current = (axis: DragAxis) => {
    const { stage: current, nav: currentNav, isMobile: mobile } = latest.current;
    if (level !== "screen" || !mobile || current.run || current.drag) return null;
    const screen = currentNav.to;
    if (screen.backDisabled) return null;
    if (axis === "x") {
      if (screen.presentation !== "screen") return null;
      const record = getEntryTransition(currentNav.location.key);
      const draggable = record ? record.kind === "push" || record.kind === "expand" : screen.depth > 0 && Boolean(screen.parentPath);
      if (!draggable) return null;
    } else if (screen.presentation !== "task") {
      return null;
    }
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const drag: Drag = { id: current.enteringId, axis, viewport, offset: scrollModel === "window" ? window.scrollY : 0 };
    const frozenHeight = scrollModel === "window" ? wrapperRef.current?.offsetHeight ?? null : null;
    setStage((state) => ({ ...state, drag, frozenHeight }));
    engine.drag = drag;
    progress.jump(0);
    let last = 0;
    let watchdog = 0;
    let springBack: AnimationPlaybackControls | null = null;
    const release = () => {
      engine.drag = null;
      setStage((state) => (state.drag === drag ? { ...state, drag: null, frozenHeight: state.run ? state.frozenHeight : null } : state));
      engine.apply(1);
    };
    return {
      width: axis === "x" ? viewport.width : viewport.height,
      update(value: number) {
        last = Math.max(0, Math.min(1, value));
        engine.apply(last);
      },
      commit() {
        // The navigation that follows continues from `last`. If nothing
        // navigates (a form guard, an overlay entry), spring back.
        window.clearTimeout(watchdog);
        watchdog = window.setTimeout(() => {
          if (engine.drag !== drag) return;
          springBack = animate(progress as MotionValue<number>, 0, { ...smoothScreenSpring(), onComplete: release });
        }, 400);
      },
      cancel(velocity: number) {
        window.clearTimeout(watchdog);
        springBack?.stop();
        progress.jump(last);
        springBack = animate(progress as MotionValue<number>, 0, { ...smoothScreenSpring(), velocity: -Math.abs(velocity), onComplete: release });
      },
    };
  };

  useEffect(() => {
    // Back across spaces is a zoom-fade, never a drag; only screen stages take the gesture.
    if (level !== "screen") return undefined;
    return registerInteractiveBackStage({ beginInteractiveBack: () => startDragRef.current("x") });
  }, [level]);

  const dismissible =
    level === "screen" && isMobile && nav.to.presentation === "task" && !nav.to.backDisabled;
  // Stable, so the layer's touch listeners aren't re-attached mid-swipe.
  const startDismissDrag = useCallback(() => startDragRef.current("y"), []);
  const context: StageContextValue = {
    engine,
    run: stage.run,
    drag: stage.drag,
    scrollModel,
    pinned,
    dismissible,
    startDismissDrag,
  };
  const skeleton = nav.to.skeleton;

  return (
    <StageContext.Provider value={context}>
      <div
        ref={wrapperRef}
        data-screen-stage={scrollModel}
        data-screen-phase={stage.run ? "running" : stage.drag ? "dragging" : "idle"}
        data-screen-kind={stage.run?.transition.kind ?? "none"}
        data-testid={testId}
        style={{
          ...(scrollModel === "layer" ? { display: "contents" } : null),
          ...(pinned && stage.frozenHeight != null ? { height: stage.frozenHeight } : null),
        }}
      >
        <Viewport
          data-screen-stage-viewport
          className={viewportClassName}
          style={
            pinned
              ? { ...FILL, position: "fixed", zIndex: 0, overflow: "hidden", background }
              : { position: "relative" }
          }
        >
          {stage.drag ? (
            <div
              ref={(node: HTMLDivElement | null) => {
                engine.backdrop = node;
              }}
              aria-hidden
              style={{ ...FILL, zIndex: 0, background: "#000", pointerEvents: "none", opacity: 0.08 }}
            />
          ) : null}
          <AnimatePresence initial={false}>
            <ScreenLayer
              key={layerId}
              id={layerId}
              locationContext={locationContext}
              skeleton={skeleton}
              className={layerClassName}
              contentClassName={contentClassName}
              presentAttributes={presentLayerAttributes}
            >
              {content}
            </ScreenLayer>
          </AnimatePresence>
        </Viewport>
      </div>
    </StageContext.Provider>
  );
}

interface ScreenLayerProps {
  id: number;
  locationContext: LocationContextValue;
  skeleton: ScreenSkeletonKind;
  className?: string;
  contentClassName?: string;
  presentAttributes?: Record<string, string>;
  children: ReactNode;
}

function ScreenLayer({ id, locationContext, skeleton, className, contentClassName, presentAttributes, children }: ScreenLayerProps) {
  const stage = useContext(StageContext);
  const { renderSkeleton } = useScreenStageConfig();
  const [isPresent, safeToRemove] = usePresence();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const veilRef = useRef<HTMLDivElement | null>(null);

  useTaskSwipeDown(rootRef, Boolean(stage?.dismissible && isPresent), stage?.startDismissDrag ?? noDrag);

  // Register DOM nodes with the engine before the stage's layout effect writes the first frame.
  useLayoutEffect(() => {
    const engine = stage?.engine;
    const root = rootRef.current;
    const veil = veilRef.current;
    if (!engine || !root || !veil) return undefined;
    engine.layers.set(id, { root, veil });
    return () => {
      engine.layers.delete(id);
    };
  }, [id, stage?.engine]);

  // Leaving: wait for the transition only when this is the screen being animated out.
  // A passive effect on purpose: AnimatePresence starts tracking an exit in its own
  // layout effect, which runs after ours, and ignores safeToRemove before that.
  const run = stage?.run ?? null;
  useEffect(() => {
    if (isPresent || !safeToRemove) return;
    if (stage && run && run.exitingId === id) {
      stage.engine.exitCallbacks.set(id, safeToRemove);
      return;
    }
    stage?.engine.exitCallbacks.delete(id);
    safeToRemove();
  }, [id, isPresent, run, safeToRemove, stage]);

  // Dashboard layers scroll themselves: remember and restore their position per history entry.
  const scrollModel = stage?.scrollModel ?? "window";
  const locationKey = locationContext.location.key;
  const navigationType = locationContext.navigationType;
  useLayoutEffect(() => {
    if (scrollModel !== "layer" || !isPresent) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;
    let raf = 0;
    const save = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(LAYER_SCROLL_KEY(locationKey), String(root.scrollTop));
        } catch {
          /* storage unavailable */
        }
      });
    };
    root.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("scroll", save);
    };
  }, [isPresent, locationKey, scrollModel]);

  useLayoutEffect(() => {
    if (scrollModel !== "layer") return undefined;
    const root = rootRef.current;
    if (!root) return undefined;
    let target = 0;
    try {
      const raw = navigationType === "POP" ? sessionStorage.getItem(LAYER_SCROLL_KEY(locationKey)) : null;
      target = raw == null ? 0 : Number(raw) || 0;
    } catch {
      target = 0;
    }
    root.scrollTop = target;
    if (!target) return undefined;
    // Content may still be loading; keep trying briefly.
    const startedAt = performance.now();
    let raf = 0;
    const retry = () => {
      if (Math.abs(root.scrollTop - target) <= 1 || performance.now() - startedAt > 500) return;
      root.scrollTop = target;
      raf = requestAnimationFrame(retry);
    };
    raf = requestAnimationFrame(retry);
    return () => cancelAnimationFrame(raf);
    // Only when this layer first shows a location.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey]);

  const pinned = Boolean(stage?.pinned);
  let offset = 0;
  if (stage?.run) {
    if (stage.run.exitingId === id) offset = stage.run.exitOffset;
    else if (stage.run.enteringId === id) offset = stage.run.enterOffset;
  } else if (stage?.drag && stage.drag.id === id) {
    offset = stage.drag.offset;
  }

  return (
    <div
      ref={rootRef}
      data-screen-layer={id}
      data-screen-layer-present={isPresent ? "true" : "false"}
      className={joinClasses(className)}
      style={pinned ? { ...FILL, overflow: "hidden" } : scrollModel === "layer" ? FILL : { position: "relative" }}
      {...(isPresent ? presentAttributes : undefined)}
    >
      <div
        className={contentClassName}
        style={pinned && scrollModel === "window" ? { position: "relative", top: -offset } : undefined}
      >
        <UNSAFE_LocationContext.Provider value={locationContext}>
          <Suspense fallback={renderSkeleton ? renderSkeleton(skeleton) : null}>{children}</Suspense>
        </UNSAFE_LocationContext.Provider>
      </div>
      {/* Dimming veil: shown and faded only by the engine (no React-managed style). */}
      <div
        ref={veilRef}
        aria-hidden
        data-screen-veil
        style={{ ...FILL, zIndex: 1000, display: "none", background: "#000", pointerEvents: "none" }}
      />
    </div>
  );
}
