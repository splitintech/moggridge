import React, { useEffect } from "react";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useMotionPolicy, useMotionCancellation } from "./policy";
import type { SurfaceProps } from "./catalog";

/** Native equivalents of the portable entrance/motion families; no DOM variants cross this boundary. */
export const nativePresetNames = ["fade", "slide-up", "slide-down", "slide-start", "slide-end", "scale", "pop", "flip", "rotate", "blur-fallback"] as const;
export type NativePresetName = typeof nativePresetNames[number];
export function PresetSurface({ name = "fade", visible = true, rtl = false, children, style, testID }: SurfaceProps & { name?: NativePresetName; visible?: boolean; rtl?: boolean }) {
  const { enabled, reducedMotion, preset } = useMotionPolicy();
  const progress = useSharedValue(visible ? 0 : 1);
  useEffect(() => {
    cancelAnimation(progress);
    progress.value = enabled && !reducedMotion ? withSpring(visible ? 1 : 0, preset) : visible ? 1 : 0;
    return () => cancelAnimation(progress);
  }, [visible, enabled, reducedMotion, preset]);
  useMotionCancellation(() => { cancelAnimation(progress); progress.value = visible ? 1 : 0; });
  const animated = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, progress.value)), distance = (1 - p) * 24;
    return {
      opacity: p,
      transform: [
        { perspective: 800 },
        { translateX: name === "slide-start" ? distance * (rtl ? 1 : -1) : name === "slide-end" ? distance * (rtl ? -1 : 1) : 0 },
        { translateY: name === "slide-up" ? distance : name === "slide-down" ? -distance : 0 },
        { scale: name === "scale" || name === "pop" ? 0.9 + p * .1 : 1 },
        { rotateY: `${name === "flip" ? (1 - p) * 90 : 0}deg` },
        { rotate: `${name === "rotate" ? (1 - p) * -12 : 0}deg` },
      ],
    };
  });
  return <Animated.View testID={testID} pointerEvents={visible ? "auto" : "none"} accessibilityElementsHidden={!visible} importantForAccessibility={visible ? "auto" : "no-hide-descendants"} style={[style, animated]}>{children}</Animated.View>;
}
