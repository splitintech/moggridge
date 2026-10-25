import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useEffect,
  useSyncExternalStore,
} from "react";
import {
  motionPresets,
  createGestureArbiter,
  capabilityCatalog,
  interactionCatalog,
  type MotionEvent,
  type MotionFamily,
  type MotionPolicy,
  type SpringSpec,
} from "../core";
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
export interface MotionProviderProps {
  children?: React.ReactNode;
  enabled?: boolean;
  preset?: MotionFamily;
  reducedMotion?: MotionPolicy;
  spring?: Partial<SpringSpec>;
  haptics?: HapticDriver;
  diagnostics?: (event: MotionEvent) => void;
}
const GestureContext = createContext<ReturnType<
  typeof createGestureArbiter
> | null>(null);
export function useGestureArbiter() {
  const shared = useContext(GestureContext);
  const local = useRef<ReturnType<typeof createGestureArbiter> | null>(null);
  if (!local.current) local.current = createGestureArbiter();
  return shared ?? local.current;
}
const Context = createContext<
  Omit<MotionProviderProps, "children"> & { keys?: Set<string> }
>({});
const subscribe = (notify: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const snapshot = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const serverSnapshot = () => true;
export function MotionProvider({ children, ...props }: MotionProviderProps) {
  const keys = useRef(new Set<string>());
  const arbiter = useMemo(() => createGestureArbiter(), []);
  useEffect(() => {
    const cancel = () => {
      if (document.hidden) arbiter.cancel();
    };
    document.addEventListener("visibilitychange", cancel);
    window.addEventListener("blur", arbiter.cancel);
    return () => {
      document.removeEventListener("visibilitychange", cancel);
      window.removeEventListener("blur", arbiter.cancel);
      arbiter.cancel();
    };
  }, [arbiter]);
  return (
    <Context.Provider value={{ ...props, keys: keys.current }}>
      <GestureContext.Provider value={arbiter}>
        {children}
      </GestureContext.Provider>
    </Context.Provider>
  );
}
export function useMotionPolicy() {
  const context = useContext(Context);
  const system = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const fallback = useRef(new Set<string>());
  const keys = context.keys ?? fallback.current;
  const emitHaptic = useCallback(
    (intent: HapticIntent, key?: string) => {
      if (context.enabled === false || (key && keys.has(key))) return;
      if (key) {
        keys.add(key);
        if (keys.size > 1024) keys.delete(keys.values().next().value!);
      }
      try {
        Promise.resolve(context.haptics?.(intent)).catch(() => {});
      } catch {}
    },
    [context.enabled, context.haptics, keys],
  );
  const presetName = context.preset ?? "precise";
  const preset = useMemo(
    () => ({ ...motionPresets[presetName], ...context.spring }),
    [presetName, context.spring],
  );
  return useMemo(
    () => ({
      enabled: context.enabled !== false,
      reducedMotion:
        context.reducedMotion === "always" ||
        (context.reducedMotion !== "never" && system),
      preset,
      presetName,
      emitHaptic,
      diagnostics: context.diagnostics,
    }),
    [
      context.enabled,
      context.diagnostics,
      context.reducedMotion,
      system,
      preset,
      presetName,
      emitHaptic,
    ],
  );
}
export function useMotionTransition() {
  const policy = useMotionPolicy();
  return useMemo(
    () =>
      policy.enabled && !policy.reducedMotion
        ? { type: "spring" as const, ...policy.preset }
        : { duration: 0 },
    [policy.enabled, policy.reducedMotion, policy.preset],
  );
}

/** Runtime feature declarations, independent of browser/device qualification evidence. */
export function webCapabilities() {
  return capabilityCatalog(
    Object.fromEntries(
      interactionCatalog.map((pattern) => [
        pattern,
        {
          status:
            pattern === "momentum-snap" ? "platform-specific" : "supported",
          ...(pattern === "momentum-snap"
            ? {
                reason:
                  "Native scroll by default; explicit shared momentum policy uses Motion settling.",
              }
            : {}),
        },
      ]),
    ),
  );
}
