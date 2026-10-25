import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  AppState,
  BackHandler,
  I18nManager,
  Pressable,
  View,
  findNodeHandle,
  useWindowDimensions,
  type LayoutRectangle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { useMotionPolicy, type NativeMotionEvent } from "./policy";
export type NativeScrollOffset = SharedValue<{ x: number; y: number }>;
type Slot = { measure(): Promise<LayoutRectangle | null>; focus?(): void; scrollOffset?: NativeScrollOffset };
interface HostAPI {
  register(
    id: string,
    measure: Slot["measure"],
    focus?: () => void,
    scrollOffset?: NativeScrollOffset,
  ): () => void;
  activate(id: string): Promise<boolean>;
  setDestination(id: string): Promise<boolean>;
  close(): Promise<boolean>;
}
const TransitionContext = createContext<HostAPI | null>(null),
  MediaContext = createContext<HostAPI | null>(null);
export interface HostProps {
  children: React.ReactNode;
  surface?: React.ReactNode;
  renderMedia?: React.ReactNode;
  initialSlot?: string;
  initialDestination?: string;
  destinationSlot?: string;
  style?: StyleProp<ViewStyle>;
  onExpandedChange?(expanded: boolean): void;
  onMotionEvent?(event: NativeMotionEvent): void;
  /** Visibility only; consumers own whether loss of a slot pauses playback. */
  onSlotAvailabilityChange?(available: boolean): void;
  mode?: "fullscreen" | "anchored" | "start" | "end" | "right";
  /** Registered destination measured in window coordinates at activation. */
  targetSlot?: string;
  expandedContent?: React.ReactNode;
  destination?: LayoutRectangle;
  expandedWidth?: number;
  borderRadius?: number;
  handleBack?: boolean;
}
const zero = { x: 0, y: 0, width: 0, height: 0 };
/** One parent owns the content for its entire lifetime, including hidden/direct-entry states. */
function PersistentHost({
  children,
  surface,
  renderMedia,
  initialSlot,
  initialDestination,
  destinationSlot,
  style,
  onExpandedChange,
  onMotionEvent,
  onSlotAvailabilityChange,
  mode = "fullscreen",
  destination,
  targetSlot,
  expandedContent,
  expandedWidth = 420,
  borderRadius = 16,
  handleBack = true,
  media = false,
}: HostProps & { media?: boolean }) {
  const { enabled, reducedMotion, preset, diagnostics } = useMotionPolicy();
  const window = useWindowDimensions();
  const [bounds, setBounds] = useState({
    width: window.width,
    height: window.height,
  });
  const dimensions = bounds;
  const slots = useRef(new Map<string, Slot>()),
    root = useRef<React.ElementRef<typeof View>>(null),
    closeControl = useRef<React.ElementRef<typeof View>>(null);
  const source = useRef(initialSlot || initialDestination),
    selected = useRef(initialSlot || initialDestination);
  const [visible, setVisible] = useState(false),
    [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false),
    operation = useRef(0),
    nextRun = useRef(0);
  const run = useRef<{ id: number; resolve(value: boolean): void } | null>(
    null,
  );
  const callbacks = useRef({ onMotionEvent, onExpandedChange, onSlotAvailabilityChange, diagnostics });
  callbacks.current = { onMotionEvent, onExpandedChange, onSlotAvailabilityChange, diagnostics };
  const available = useRef(false);
  const setAvailability = useCallback((next: boolean) => {
    setVisible(next);
    if (available.current !== next) { available.current = next; callbacks.current.onSlotAvailabilityChange?.(next); }
  }, []);
  const from = useSharedValue(zero),
    to = useSharedValue(zero),
    progress = useSharedValue(1),
    radiusFrom = useSharedValue(borderRadius),
    radiusTo = useSharedValue(borderRadius),
    revealFrom = useSharedValue(0),
    revealTo = useSharedValue(0);
  const activeScroll = useSharedValue<NativeScrollOffset | null>(null);
  const measuredScroll = useSharedValue({ x: 0, y: 0 });
  const reveal = useDerivedValue(() => revealFrom.value + (revealTo.value - revealFrom.value) * Math.max(0, Math.min(1, progress.value)));
  const current = useDerivedValue(() => {
    const p = Math.max(0, Math.min(1, progress.value));
    return {
      x: from.value.x + (to.value.x - from.value.x) * p,
      y: from.value.y + (to.value.y - from.value.y) * p,
      width: from.value.width + (to.value.width - from.value.width) * p,
      height: from.value.height + (to.value.height - from.value.height) * p,
    };
  });
  const finish = useCallback((id: number, completed: boolean) => {
    if (run.current?.id !== id) return;
    const active = run.current;
    run.current = null;
    callbacks.current.onMotionEvent?.({
      id,
      phase: completed ? "complete" : "cancel",
      ...(completed ? {} : { reason: "interrupted" }),
    });
    callbacks.current.diagnostics?.({ id, phase: completed ? "complete" : "cancel" });
    active.resolve(completed);
  }, []);
  const animate = useCallback(
    (rect: LayoutRectangle, nextRadius: number) => {
      if (run.current) finish(run.current.id, false);
      cancelAnimation(progress);
      from.value = current.value;
      to.value = rect;
      radiusFrom.value = radiusFrom.value + (radiusTo.value - radiusFrom.value) * Math.max(0, Math.min(1, progress.value));
      radiusTo.value = nextRadius;
      revealFrom.value = reveal.value;
      revealTo.value = expandedRef.current ? 1 : 0;
      progress.value = 0;
      const id = ++nextRun.current;
      callbacks.current.onMotionEvent?.({ id, phase: "start" });
      callbacks.current.diagnostics?.({ id, phase: "start" });
      setAvailability(true);
      return new Promise<boolean>((resolve) => {
        run.current = { id, resolve };
        if (!enabled || reducedMotion) {
          progress.value = 1;
          finish(id, true);
        } else {

          progress.value = withSpring(1, preset, (complete) => {
            runOnJS(finish)(id, !!complete);
          });
        }
      });
    },
    [enabled, reducedMotion, preset, finish],
  );
  const measure = useCallback(async (id: string, token?: number) => {
    const rect = await slots.current.get(id)?.measure();
    if (token !== undefined && token !== operation.current) return null;
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    const origin = await new Promise<{ x: number; y: number }>((resolve) => {
      if (root.current)
        root.current.measureInWindow((x, y) => resolve({ x, y }));
      else resolve({ x: 0, y: 0 });
    });
    if (token !== undefined && token !== operation.current) return null;
    return { ...rect, x: rect.x - origin.x, y: rect.y - origin.y };
  }, []);
  const side = mode === "start" || mode === "end" || mode === "right";
  const right = mode === "right" || (mode === "end" && !I18nManager.isRTL) || (mode === "start" && I18nManager.isRTL);
  const target = destination || {
    x:
      right
        ? Math.max(0, dimensions.width - expandedWidth)
        : 0,
    y: 0,
    width:
      side
        ? Math.min(expandedWidth, dimensions.width)
        : dimensions.width,
    height: dimensions.height,
  };
  const targetRef = useRef(target);
  targetRef.current = target;
  const activate = useCallback(
    async (id: string) => {
      const token = ++operation.current;
      const rect = await measure(id, token);
      if (token !== operation.current) return false;
      selected.current = id;
      if (media) {
        activeScroll.value = slots.current.get(id)?.scrollOffset || null;
        measuredScroll.value = activeScroll.value?.value || { x: 0, y: 0 };
        if (rect) return animate(rect, borderRadius);
        if (run.current) finish(run.current.id, false);
        cancelAnimation(progress);
        setAvailability(false);
        return false;
      }
      source.current = id;
      if (!visible) {
        from.value = rect || targetRef.current;
        to.value = rect || targetRef.current;
      }
      expandedRef.current = true;
      setExpanded(true);
      callbacks.current.onExpandedChange?.(true);
      const measuredTarget = targetSlot ? await measure(targetSlot, token) : null;
      if (token !== operation.current) return false;
      const completed = await animate(
        measuredTarget || targetRef.current,
        mode === "fullscreen" ? 0 : borderRadius,
      );
      if (completed && token === operation.current) {
        const handle = findNodeHandle(closeControl.current);
        if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
      }
      return completed && token === operation.current;
    },
    [measure, animate, media, borderRadius, mode, visible, targetSlot],
  );
  const close = useCallback(async () => {
    const token = ++operation.current;
    expandedRef.current = false;
    setExpanded(false);
    callbacks.current.onExpandedChange?.(false);
    const id = source.current,
      rect = id ? await measure(id) : null;
    if (token !== operation.current) return false;
    if (rect) {
      const completed = await animate(rect, borderRadius);
      if (completed && token === operation.current)
        slots.current.get(id!)?.focus?.();
      return completed;
    }
    if (run.current) finish(run.current.id, false);
    cancelAnimation(progress);
    setAvailability(false);
    return true;
  }, [measure, animate, borderRadius, finish]);
  const register = useCallback(
    (id: string, measureSlot: Slot["measure"], focus?: () => void, scrollOffset?: NativeScrollOffset) => {
      const slot = { measure: measureSlot, focus, scrollOffset };
      slots.current.set(id, slot);
      if (media && selected.current === id)
        void measure(id).then((rect) => {
          if (selected.current !== id || slots.current.get(id) !== slot) return;
          if (rect && !expandedRef.current) {
            activeScroll.value = scrollOffset || null;
            measuredScroll.value = scrollOffset?.value || { x: 0, y: 0 };
            void animate(rect, borderRadius);
          }
          else if (!rect) setAvailability(false);
        });
      return () => {
        if (slots.current.get(id) === slot) {
          slots.current.delete(id);
          if (media && selected.current === id) {
            ++operation.current;
            if (run.current) finish(run.current.id, false);
            cancelAnimation(progress);
            setAvailability(false);
          }
        }
      };
    },
    [media, measure, animate, borderRadius],
  );
  const api = useMemo(
    () => ({ register, activate, setDestination: activate, close }),
    [register, activate, close],
  );
  useEffect(() => {
    if (!expanded || !handleBack) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        void close();
        return true;
      },
    );
    return () => subscription.remove();
  }, [expanded, handleBack, close]);
  useEffect(() => {
    if (initialDestination) void activate(initialDestination);
  }, []);
  useEffect(() => {
    if (destinationSlot) void activate(destinationSlot);
  }, [destinationSlot]);
  useEffect(() => {
    if (expandedRef.current) {
      const token = operation.current;
      if (targetSlot) void measure(targetSlot, token).then(rect => { if (token === operation.current) void animate(rect || targetRef.current, mode === "fullscreen" ? 0 : borderRadius); });
      else void animate(targetRef.current, mode === "fullscreen" ? 0 : borderRadius);
    }
    else if (selected.current)
      void measure(selected.current).then((rect) => {
        if (rect) void animate(rect, borderRadius);
      });
  }, [dimensions.width, dimensions.height, enabled, reducedMotion, targetSlot, mode, destination?.x, destination?.y, destination?.width, destination?.height]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        ++operation.current;
        if (run.current) finish(run.current.id, false);
        cancelAnimation(progress);
        progress.value = 1;
      }
    });
    return () => {
      subscription.remove();
      ++operation.current;
      if (run.current) finish(run.current.id, false);
      cancelAnimation(progress);
    };
  }, [finish]);
  const animated = useAnimatedStyle(() => ({
    left: current.value.x - ((activeScroll.value?.value.x || 0) - measuredScroll.value.x),
    top: current.value.y - ((activeScroll.value?.value.y || 0) - measuredScroll.value.y),
    width: current.value.width,
    height: current.value.height,
    borderRadius: radiusFrom.value + (radiusTo.value - radiusFrom.value) * Math.max(0, Math.min(1, progress.value)),
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: reveal.value, transform: [{ translateY: (1 - reveal.value) * 12 }] }));
  const Context = media ? MediaContext : TransitionContext;
  return (
    <Context.Provider value={api}>
      <View
        ref={root}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setBounds((previous) =>
            previous.width === width && previous.height === height
              ? previous
              : { width, height },
          );
        }}
        style={[{ flex: 1, overflow: media ? "hidden" : "visible" }, style]}
      >
        <View
          style={{ flex: 1 }}
          pointerEvents={expanded ? "none" : "auto"}
          accessibilityElementsHidden={expanded}
          importantForAccessibility={expanded ? "no-hide-descendants" : "auto"}
          testID="motion-transition-background"
        >{children}</View>
        {!media && visible && (
          <Animated.View pointerEvents={expanded ? "auto" : "none"} style={[{ position: "absolute", inset: 0, zIndex: 99 }, backdropStyle]}>
          <Pressable
            accessibilityLabel="Close expansion"
            onPress={() => void close()}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#0006",
              zIndex: 99,
            }}
          />
          </Animated.View>
        )}
        <Animated.View
          testID="motion-persistent-surface"
          pointerEvents={visible ? "auto" : "none"}
          accessibilityElementsHidden={!visible}
          importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
          accessibilityViewIsModal={expanded}
          style={[
            {
              position: "absolute",
              overflow: "hidden",
              opacity: visible ? 1 : 0,
              zIndex: 100,
            },
            animated,
          ]}
        >
          {surface || renderMedia}
          {expandedContent && <Animated.View pointerEvents={expanded ? "auto" : "none"} accessibilityElementsHidden={!expanded} style={[{position: "absolute", inset: 0}, contentStyle]}>{expandedContent}</Animated.View>}
          {expanded && (
            <Pressable
              ref={closeControl}
              accessibilityRole="button"
              accessibilityLabel="Close expanded surface"
              onPress={() => void close()}
              style={{ position: "absolute", right: 16, top: 48, padding: 16 }}
            >
              <View style={{ width: 24, height: 4, backgroundColor: "#555" }} />
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Context.Provider>
  );
}
export function TransitionHost(props: HostProps) {
  return <PersistentHost {...props} />;
}
export function MediaHost(props: HostProps) {
  return <PersistentHost {...props} media />;
}
function SlotView({
  id,
  slotId,
  children,
  style,
  media,
  active = false,
  activateOnMount = false,
  label = "Expand surface",
  scrollOffset,
}: {
  id?: string;
  slotId?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  media?: boolean;
  active?: boolean;
  activateOnMount?: boolean;
  label?: string;
  /** Sum offsets of scrolling ancestors; update from a Reanimated scroll handler. */
  scrollOffset?: NativeScrollOffset;
}) {
  const key = id || slotId;
  if (!key) throw new Error("A stable slot id is required");
  const api = useContext(media ? MediaContext : TransitionContext),
    view = useRef<React.ElementRef<typeof View>>(null);
  const measure = useCallback(
    () =>
      new Promise<LayoutRectangle | null>((resolve) => {
        if (!view.current) return resolve(null);
        view.current.measureInWindow((x, y, width, height) =>
          resolve({ x, y, width, height }),
        );
      }),
    [],
  );
  const focus = useCallback(() => {
    const handle = findNodeHandle(view.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);
  useEffect(
    () => api?.register(key, measure, focus, scrollOffset),
    [api?.register, key, measure, focus, scrollOffset],
  );
  useEffect(() => {
    if (active || activateOnMount) void api?.activate(key);
  }, [active, activateOnMount, key]);
  return (
    <View
      ref={view}
      collapsable={false}
      onLayout={() => {
        if (active) void api?.activate(key);
      }}
      style={style}
    >
      {media ? (
        children
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          style={{ flex: 1 }}
          onPress={() => void api?.activate(key)}
        >
          {children}
        </Pressable>
      )}
    </View>
  );
}
export function MorphingSurface(props: React.ComponentProps<typeof SlotView>) {
  return <SlotView {...props} />;
}
export function MediaSlot(props: React.ComponentProps<typeof SlotView>) {
  return <SlotView {...props} media />;
}
export function useTransitionHost() {
  const value = useContext(TransitionContext);
  if (!value) throw new Error("TransitionHost is required");
  return value;
}
export function useMediaHost() {
  const value = useContext(MediaContext);
  if (!value) throw new Error("MediaHost is required");
  return value;
}
