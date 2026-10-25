import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  findNodeHandle,
  useWindowDimensions,
  type LayoutRectangle,
} from "react-native";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useMotionPolicy, useMotionCancellation } from "./policy";
import { resolveMomentumTarget } from "../core";
import { useGestureOwnership } from "./ownership";
import type { SurfaceProps } from "./catalog";

type NativeFocusRef = React.RefObject<React.ElementRef<typeof View> | null>;
function useRetainedVisibility(open: boolean, triggerRef?: NativeFocusRef) {
  const [present, setPresent] = useState(open);
  const generation = useRef(0);
  const wasPresent = useRef(open);
  const latestOpen = useRef(open);
  latestOpen.current = open;
  const begin = useCallback(() => {
    const token = ++generation.current;
    if (latestOpen.current) { wasPresent.current = true; setPresent(true); }
    return token;
  }, []);
  const complete = useCallback((token: number) => {
    if (token !== generation.current || latestOpen.current) return;
    setPresent(false);
    if (!wasPresent.current) return;
    wasPresent.current = false;
    const node = triggerRef?.current;
    const handle = node ? findNodeHandle(node) : null;
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, [triggerRef]);
  useEffect(() => () => { ++generation.current; }, []);
  return { present, begin, complete };
}
export function ElasticSheet({
  open,
  onOpenChange,
  snapPoints = [240, 480],
  initialSnap = 0,
  children,
  style,
  testID,
  bottomInset = 0,
  dismissible = true,
  triggerRef,
}: SurfaceProps & {
  open: boolean;
  onOpenChange(open: boolean): void;
  snapPoints?: number[];
  initialSnap?: number;
  bottomInset?: number;
  dismissible?: boolean;
  triggerRef?: NativeFocusRef;
}) {
  const { height } = useWindowDimensions();
  const { owner, id } = useGestureOwnership();
  const { enabled, reducedMotion, preset, emitHaptic } = useMotionPolicy();
  const points = [
    ...new Set(snapPoints.filter((point) => Number.isFinite(point) && point > 0).map((point) => Math.min(height, point))),
  ].sort((a, b) => a - b);
  if (points.length === 0) points.push(height);
  const maximum = points[points.length - 1];
  const {present, begin, complete} = useRetainedVisibility(open, triggerRef);
  const extent = useSharedValue(0),
    start = useSharedValue(0);
  useMotionCancellation(() => { cancelAnimation(extent); if (owner.value === id) owner.value = 0; extent.value = open ? points[initialSnap] || maximum : 0; });
  useEffect(() => {
    cancelAnimation(extent);
    const target = open ? points[initialSnap] || maximum : 0;
    const token = begin();
    if (enabled && !reducedMotion) {
      extent.value = withSpring(target, preset, finished => {
        if (finished) runOnJS(complete)(token);
      });
    } else { extent.value = target; complete(token); }
    return () => cancelAnimation(extent);
  }, [open, maximum, initialSnap, enabled, reducedMotion, preset]);
  const settled = (target: number) => {
    if (target === 0 && dismissible) onOpenChange(false);
    else emitHaptic("snap");
  };
  // Only the handle owns pan; nested content retains native scrolling and input gestures.
  const pan = Gesture.Pan()
    .onTouchesDown((_event, manager) => { if (owner.value !== 0 && owner.value !== id) manager.fail(); })
    .onStart(() => { if (owner.value === 0) owner.value = id; })
    .activeOffsetY([-6, 6])
    .failOffsetX([-24, 24])
    .onBegin(() => {
      cancelAnimation(extent);
      start.value = extent.value;
    })
    .onUpdate((event) => {
      if (owner.value !== id) return;
      const next = start.value - event.translationY;
      extent.value =
        next > maximum ? maximum + (next - maximum) * 0.15 : Math.max(0, next);
    })
    .onEnd((event) => {
      if (owner.value !== id) return;
      const target = resolveMomentumTarget(extent.value, -event.velocityY, dismissible ? [0, ...points] : points);
      if (enabled && !reducedMotion) {
        extent.value = withSpring(target, preset, finished => {
          if (finished) runOnJS(settled)(target);
        });
      } else { extent.value = target; runOnJS(settled)(target); }
    })
    .onFinalize((_event, success) => {
      if (owner.value === id) owner.value = 0;
      if (!success)
        extent.value =
          enabled && !reducedMotion
            ? withSpring(start.value, preset)
            : start.value;
    });
  const animated = useAnimatedStyle(() => ({
    height: Math.max(0, extent.value),
  }));
  return (
    <Modal
      visible={present}
      transparent
      animationType="none"
      onRequestClose={() => { if (dismissible) onOpenChange(false); }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Pressable
          accessibilityLabel="Close sheet"
          style={{ position: "absolute", inset: 0, backgroundColor: "#0006" }}
          disabled={!dismissible}
          onPress={() => { if (dismissible) onOpenChange(false); }}
        />
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          style={[
            {
              backgroundColor: "white",
              overflow: "hidden",
              paddingBottom: bottomInset,
            },
            style,
            animated,
          ]}
        >
          <GestureDetector gesture={pan}>
            <Animated.View
              accessible
              accessibilityLabel="Sheet position"
              accessibilityRole="adjustable"
              accessibilityActions={[
                { name: "increment" },
                { name: "decrement" },
                ...(dismissible ? [{ name: "dismiss" as const }] : []),
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "dismiss") {
                  if (dismissible) onOpenChange(false);
                  return;
                }
                const current = points.findIndex(
                  (point) => point >= extent.value,
                );
                const index = Math.max(
                  0,
                  Math.min(
                    points.length - 1,
                    current +
                      (event.nativeEvent.actionName === "increment" ? 1 : -1),
                  ),
                );
                extent.value =
                  enabled && !reducedMotion
                    ? withSpring(points[index], preset)
                    : points[index];
              }}
              style={{ padding: 16, alignItems: "center" }}
            >
              <View
                style={{
                  width: 40,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: "#aaa",
                }}
              />
            </Animated.View>
          </GestureDetector>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function DismissibleSurface({
  children,
  style,
  onDismiss,
  threshold = 100,
  scrollOffset,
  gestureEnabled = true,
}: SurfaceProps & { onDismiss(): void; threshold?: number; scrollOffset?: SharedValue<number>; gestureEnabled?: boolean }) {
  const { enabled, reducedMotion, preset } = useMotionPolicy();
  const { owner, id } = useGestureOwnership();
  const y = useSharedValue(0);
  const committing = useSharedValue(false);
  const committed = useRef(false);
  const commit = useCallback(() => {
    if (committed.current) return;
    committed.current = true;
    committing.value = true;
    cancelAnimation(y);
    onDismiss();
  }, [onDismiss, committing, y]);
  useEffect(() => {
    const reset = () => { cancelAnimation(y); y.value = 0; if (!committed.current) committing.value = false; if (owner.value === id) owner.value = 0; };
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") reset(); });
    if (!enabled || reducedMotion || !gestureEnabled) reset();
    return () => { subscription.remove(); reset(); };
  }, [enabled, reducedMotion, gestureEnabled]);
  const gesture = Gesture.Pan()
    .enabled(gestureEnabled)
    .onTouchesDown((_event, manager) => { if ((scrollOffset?.value || 0) > 0 || (owner.value !== 0 && owner.value !== id)) manager.fail(); })
    .onStart(() => { if (owner.value === 0) owner.value = id; })
    .activeOffsetY(12)
    .failOffsetX([-20, 20])
    .onBegin(() => { if (!committing.value) cancelAnimation(y); })
    .onUpdate((event) => {
      if (!committing.value && owner.value === id) y.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (committing.value || owner.value !== id) return;
      if (y.value > threshold || event.velocityY > 1000) {
        committing.value = true;
        y.value = withTiming(
          600,
          { duration: enabled && !reducedMotion ? 180 : 0 },
          (finished) => {
            if (finished) runOnJS(commit)();
          },
        );
      } else y.value = enabled && !reducedMotion ? withSpring(0, preset) : 0;
    })
    .onFinalize((_event, success) => {
      if (owner.value === id) owner.value = 0;
      if (!success && !committing.value)
        y.value = enabled && !reducedMotion ? withSpring(0, preset) : 0;
    });
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: Math.max(0, 1 - y.value / 600),
  }));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityLabel="Dismissible surface"
        accessibilityActions={[{ name: "dismiss" }]}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'dismiss') commit(); }}
        style={[style, animated]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
export function AnchoredMenu({
  open,
  onOpenChange,
  anchor,
  triggerRef,
  children,
  style,
}: SurfaceProps & {
  open: boolean;
  onOpenChange(open: boolean): void;
  anchor: LayoutRectangle;
  triggerRef?: NativeFocusRef;
}) {
  const { width, height } = useWindowDimensions();
  const { enabled, reducedMotion, preset } = useMotionPolicy();
  const [size, setSize] = useState({ width: 240, height: 100 });
  const progress = useSharedValue(0);
  useMotionCancellation(() => { cancelAnimation(progress); progress.value = open ? 1 : 0; });
  const {present, begin, complete} = useRetainedVisibility(open, triggerRef);
  const body = useRef<React.ElementRef<typeof View>>(null);
  useEffect(() => {
    const token = begin();
    cancelAnimation(progress);
    if (enabled && !reducedMotion) progress.value = withSpring(open ? 1 : 0, preset, finished => {
      if (finished) runOnJS(complete)(token);
    });
    else { progress.value = open ? 1 : 0; complete(token); }
    return () => cancelAnimation(progress);
  }, [open, enabled, reducedMotion, preset]);
  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * -8 },
      { scale: 0.96 + 0.04 * progress.value },
    ],
  }));
  return (
    <Modal
      visible={present}
      transparent
      animationType="none"
      onRequestClose={() => onOpenChange(false)}
      onShow={() => {
        const handle = findNodeHandle(body.current);
        if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
      }}
    >
      <Pressable
        accessibilityLabel="Close menu"
        style={{ position: "absolute", inset: 0 }}
        onPress={() => onOpenChange(false)}
      />
      <Animated.View
        ref={body}
        accessibilityViewIsModal
        onLayout={(event) => setSize(event.nativeEvent.layout)}
        style={[
          {
            position: "absolute",
            left: Math.max(8, Math.min(anchor.x, width - size.width - 8)),
            top: Math.max(
              8,
              Math.min(anchor.y + anchor.height, height - size.height - 8),
            ),
            maxWidth: width - 16,
            maxHeight: height - 16,
            transformOrigin: "top left",
          },
          style,
          animated,
        ]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}
