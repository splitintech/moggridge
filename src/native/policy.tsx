import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, AppState } from "react-native";
import {
  cancelAnimation,
  runOnJS,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { capabilityCatalog, type MotionCapability, motionPresets, type MotionFamily, type MotionPolicy, type SpringSpec } from "../core";
import { GestureOwnershipScope } from "./ownership";
export type HapticIntent =
  | "press"
  | "selection"
  | "snap"
  | "success"
  | "warning"
  | "error"
  | "drag-start"
  | "drag-end";
export type HapticDriver = (intent: HapticIntent) => void | Promise<void>;
export interface NativeMotionEvent {
  id: number;
  phase: "start" | "complete" | "cancel";
  reason?: string;
}
export interface MotionProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  preset?: MotionFamily;
  spring?: Partial<SpringSpec>;
  reducedMotion?: MotionPolicy;
  haptics?: HapticDriver;
  /** Receives lifecycle boundaries only, never animation frames. */
  diagnostics?(event: NativeMotionEvent): void;
}
const Context = createContext({
  enabled: true,
  reducedMotion: false,
  preset: motionPresets.precise,
  presetName: "precise" as MotionFamily,
  diagnostics: undefined as ((event: NativeMotionEvent) => void) | undefined,
  emitHaptic: (_intent: HapticIntent, _key?: string) => {},
});
export function MotionProvider({
  children,
  enabled = true,
  preset = "precise",
  spring,
  reducedMotion = "system",
  haptics,
  diagnostics,
}: MotionProviderProps) {
  const [system, setSystem] = useState(false);
  const keys = useRef(new Set<string>());
  useEffect(() => {
    let alive = true;
    let receivedEvent = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive && !receivedEvent) setSystem(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        receivedEvent = true;
        setSystem(value);
      },
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  const emitHaptic = useCallback(
    (intent: HapticIntent, key?: string) => {
      if (!enabled || !haptics || (key && keys.current.has(key))) return;
      if (key) {
        keys.current.add(key);
        if (keys.current.size > 512)
          keys.current.delete(keys.current.values().next().value!);
      }
      try { Promise.resolve(haptics(intent)).catch(() => {}); } catch { /* Optional device feedback must never break the action. */ }
    },
    [enabled, haptics],
  );
  const value = useMemo(
    () => ({
      enabled,
      diagnostics,
      reducedMotion:
        reducedMotion === "always" || (reducedMotion === "system" && system),
      preset: { ...motionPresets[preset], ...spring },
      presetName: preset,
      emitHaptic,
    }),
    [enabled, reducedMotion, system, preset, spring, emitHaptic, diagnostics],
  );
  return <Context.Provider value={value}><GestureOwnershipScope>{children}</GestureOwnershipScope></Context.Provider>;
}
export const useMotionPolicy = () => useContext(Context);
/** Frames stay on UI; only lifecycle boundaries are delivered to JavaScript. */
export function useSpringValue(
  initial: number,
  onEvent?: (event: NativeMotionEvent) => void,
) {
  const { enabled, reducedMotion, preset, diagnostics } = useMotionPolicy();
  const value = useSharedValue(initial);
  const target = useSharedValue(initial);
  const counter = useRef(0),
    active = useRef<number | null>(null),
    callback = useRef(onEvent);
  callback.current = event => { onEvent?.(event); diagnostics?.(event); };
  const finish = useCallback((id: number, complete: boolean) => {
    if (active.current !== id) return;
    active.current = null;
    callback.current?.({ id, phase: complete ? "complete" : "cancel" });
  }, []);
  const cancel = useCallback(() => {
    if (active.current !== null) finish(active.current, false);
    cancelAnimation(value);
  }, [value, finish]);
  const animateTo = useCallback(
    (next: number) => {
      cancel();
      const id = ++counter.current;
      active.current = id;
      target.value = next;
      callback.current?.({ id, phase: "start" });
      if (!enabled || reducedMotion) {
        value.value = next;
        finish(id, true);
      } else
        value.value = withSpring(next, preset, (completed) => {
          runOnJS(finish)(id, !!completed);
        });
    },
    [cancel, enabled, reducedMotion, preset],
  );
  useEffect(() => {
    if (!enabled || reducedMotion) {
      cancel();
      value.value = target.value;
    }
  }, [enabled, reducedMotion, cancel]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        cancel();
        value.value = target.value;
      }
    });
    return () => {
      subscription.remove();
      cancel();
    };
  }, [cancel]);
  return { value, animateTo, cancel };
}

export interface NativeCapabilities {
  patterns: MotionCapability[];
  renderer: "reanimated";
  geometry: "supported";
  persistentMedia: "supported";
  scrollTracking: "platform-specific";
  haptics: "supported" | "unavailable";
  nativeSharedElement: "unavailable";
}
/** Optional integrations are reported from actual consumer configuration. */
export function getNativeCapabilities(options: { haptics?: HapticDriver } = {}): NativeCapabilities {
  return { patterns: capabilityCatalog({ "elastic-sheet": {status: "platform-specific", reason: "Handle owns dragging; content owns native scrolling."}, "momentum-snap": {status: "platform-specific", reason: "ScrollView uses platform decay; MomentumSurface uses portable target policy."} }), renderer: "reanimated", geometry: "supported", persistentMedia: "supported", scrollTracking: "platform-specific", haptics: options.haptics ? "supported" : "unavailable", nativeSharedElement: "unavailable" };
}

export const nativeCapabilities = getNativeCapabilities;
/** Cancels decorative/gesture work on background and disposal without frame callbacks. */
export function useMotionCancellation(reset: () => void) {
  const latest = useRef(reset);
  latest.current = reset;
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") latest.current(); });
    return () => { subscription.remove(); latest.current(); };
  }, []);
}
