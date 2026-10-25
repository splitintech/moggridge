import React, { useEffect } from "react";
import { AppState } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { resolveMomentumTarget, type MomentumPolicy } from "../core";
import { useGestureOwnership } from "./ownership";
import { useMotionPolicy } from "./policy";
import type { SurfaceProps } from "./catalog";

/** Bounded, velocity-aware snapping; frame updates execute entirely on the UI thread. */
export function MomentumSurface({ children, style, testID, points, axis = "x", initial = 0, policy, onSettle }: SurfaceProps & {
  points: readonly number[];
  axis?: "x" | "y";
  initial?: number;
  policy?: MomentumPolicy;
  onSettle?(position: number): void;
}) {
  const { owner, id } = useGestureOwnership();
  const { enabled, reducedMotion, preset, emitHaptic } = useMotionPolicy();
  const stops = points.filter(Number.isFinite).sort((a, b) => a - b);
  if (!stops.length) stops.push(0);
  const position = useSharedValue(resolveMomentumTarget(initial, 0, stops));
  const start = useSharedValue(position.value);
  const settled = (target: number) => { onSettle?.(target); emitHaptic("snap"); };
  useEffect(() => {
    const cancel = () => { cancelAnimation(position); if (owner.value === id) owner.value = 0; position.value = resolveMomentumTarget(position.value, 0, stops); };
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") cancel(); });
    if (!enabled || reducedMotion) cancel();
    return () => { subscription.remove(); cancelAnimation(position); };
  }, [enabled, reducedMotion, points]);
  let pan = Gesture.Pan().onTouchesDown((_event, manager) => { if (owner.value !== 0 && owner.value !== id) manager.fail(); }).onStart(() => { if (owner.value === 0) owner.value = id; cancelAnimation(position); start.value = position.value; })
    .onUpdate(event => {
      if (owner.value !== id) return;
      const next = start.value + (axis === "x" ? event.translationX : event.translationY);
      const min = stops[0], max = stops[stops.length - 1];
      position.value = next < min ? min + (next - min) * .15 : next > max ? max + (next - max) * .15 : next;
    })
    .onEnd(event => {
      if (owner.value !== id) return;
      const target = resolveMomentumTarget(position.value, axis === "x" ? event.velocityX : event.velocityY, stops, policy);
      if (enabled && !reducedMotion) position.value = withSpring(target, preset, done => { if (done) runOnJS(settled)(target); });
      else { position.value = target; runOnJS(settled)(target); }
    }).onFinalize((_event, success) => { if (owner.value === id) owner.value = 0; if (!success) position.value = enabled && !reducedMotion ? withSpring(start.value, preset) : start.value; });
  pan = axis === "x" ? pan.activeOffsetX([-8, 8]).failOffsetY([-16, 16]) : pan.activeOffsetY([-8, 8]).failOffsetX([-16, 16]);
  const animated = useAnimatedStyle(() => ({ transform: axis === "x" ? [{ translateX: position.value }] : [{ translateY: position.value }] }));
  return <GestureDetector gesture={pan}><Animated.View testID={testID} style={[style, animated]} accessible accessibilityRole="adjustable" accessibilityLabel="Momentum position"
    accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
    onAccessibilityAction={event => {
      const current = resolveMomentumTarget(position.value, 0, stops);
      const index = Math.max(0, Math.min(stops.length - 1, stops.indexOf(current) + (event.nativeEvent.actionName === "increment" ? 1 : -1)));
      position.value = enabled && !reducedMotion ? withSpring(stops[index], preset) : stops[index];
      settled(stops[index]);
    }}>{children}</Animated.View></GestureDetector>;
}
