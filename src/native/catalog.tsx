import React, { useEffect, useRef } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type LayoutRectangle,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useGestureOwnership } from "./ownership";
import { useMotionPolicy, useSpringValue, useMotionCancellation } from "./policy";
export interface SurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
export function PressableSurface({
  children,
  variant = "compression",
  compression = 0.97,
  displacement = 3,
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, "children" | "style"> &
  SurfaceProps & { variant?: "compression" | "mechanical"; compression?: number; displacement?: number }) {
  const { enabled, reducedMotion, emitHaptic } = useMotionPolicy();
  const { value, animateTo } = useSpringValue(0);
  useEffect(() => {
    if (disabled) animateTo(0);
  }, [disabled, animateTo]);
  const visual = useAnimatedStyle(() => ({
    transform:
      variant === "compression"
        ? [{ scale: 1 - value.value * (1 - Math.max(0, Math.min(1, compression))) }]
        : [{ translateY: value.value * displacement }],
    shadowOpacity: 0.18 * (1 - value.value),
  }));
  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        if (enabled && !reducedMotion) animateTo(1);
        emitHaptic("press");
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(0);
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, visual]}>{children}</Animated.View>
    </Pressable>
  );
}
export function SelectionIndicator({
  rect,
  style,
}: {
  rect: LayoutRectangle;
  style?: StyleProp<ViewStyle>;
}) {
  const { enabled, reducedMotion, preset } = useMotionPolicy();
  const geometry = useSharedValue(rect);
  useMotionCancellation(() => { cancelAnimation(geometry); geometry.value = rect; });
  useEffect(() => {
    geometry.value =
      enabled && !reducedMotion ? withSpring(rect, preset) : rect;
  }, [rect.x, rect.y, rect.width, rect.height, enabled, reducedMotion, preset]);
  const animated = useAnimatedStyle(() => ({
    left: geometry.value.x,
    top: geometry.value.y,
    width: geometry.value.width,
    height: geometry.value.height,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      style={[{ position: "absolute" }, style, animated]}
    />
  );
}
export function SnapCarousel({
  children,
  itemSize,
  vertical = false,
  onIndexChange,
  style,
  decelerationRate = "fast",
  disableIntervalMomentum = false,
}: SurfaceProps & {
  itemSize: number;
  vertical?: boolean;
  onIndexChange?(index: number): void;
  decelerationRate?: "normal" | "fast" | number;
  disableIntervalMomentum?: boolean;
}) {
  const { emitHaptic } = useMotionPolicy();
  const lastIndex = useRef(-1);
  const count = React.Children.count(children);
  const interval = Number.isFinite(itemSize) && itemSize > 0 ? itemSize : 1;
  return (
    <ScrollView
      style={style}
      horizontal={!vertical}
      snapToInterval={interval}
      decelerationRate={decelerationRate}
      disableIntervalMomentum={disableIntervalMomentum}
      snapToStart
      snapToEnd
      bounces={false}
      onMomentumScrollEnd={(event) => {
        const index = Math.max(0, Math.min(count - 1, Math.round(
          (vertical ? event.nativeEvent.contentOffset.y : event.nativeEvent.contentOffset.x) / interval,
        )));
        if (index !== lastIndex.current && count > 0) {
          lastIndex.current = index;
          onIndexChange?.(index);
          emitHaptic("snap");
        }
      }}
    >
      {children}
    </ScrollView>
  );
}
export function LayoutFlow({ children, style }: SurfaceProps) {
  const { enabled, reducedMotion, preset } = useMotionPolicy();
  return (
    <Animated.View
      style={style}
      layout={
        enabled && !reducedMotion
          ? LinearTransition.springify().damping(preset.damping)
          : undefined
      }
      entering={enabled && !reducedMotion ? FadeIn : undefined}
      exiting={enabled && !reducedMotion ? FadeOut : undefined}
    >
      {children}
    </Animated.View>
  );
}
export function FavoriteButton({
  selected,
  onSelectedChange,
  pending,
  disabled,
  children,
  ...props
}: Omit<React.ComponentProps<typeof PressableSurface>, "onPress"> & {
  selected: boolean;
  onSelectedChange(selected: boolean): void;
  pending?: boolean;
}) {
  return (
    <PressableSurface
      {...props}
      disabled={disabled || pending}
      accessibilityLabel={props.accessibilityLabel || "Favorite"}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: selected,
        busy: pending,
        disabled: disabled || pending,
      }}
      onPress={() => onSelectedChange(!selected)}
    >
      <Anticipation trigger={selected}>
        {children || <Text>{selected ? "♥" : "♡"}</Text>}
      </Anticipation>
    </PressableSurface>
  );
}
export function SettlingProgress({
  value,
  max = 100,
  style,
}: {
  value: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const truth = Math.max(
    0,
    Math.min(1, Number.isFinite(value) && max > 0 ? value / max : 0),
  );
  const { value: shown, animateTo } = useSpringValue(truth);
  useEffect(() => animateTo(truth), [truth, animateTo]);
  const animated = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(truth, shown.value)) * 100}%`,
  }));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: truth * 100 }}
      style={[{ height: 6, overflow: "hidden" }, style]}
    >
      <Animated.View
        style={[{ height: "100%", backgroundColor: "#5965db" }, animated]}
      />
    </View>
  );
}
export function Anticipation({
  trigger,
  squash = 0.94,
  stretch = 1.04,
  anticipationMs = 70,
  children,
  style,
}: SurfaceProps & { trigger: unknown; squash?: number; stretch?: number; anticipationMs?: number }) {
  const { enabled, reducedMotion, preset } = useMotionPolicy();
  const scale = useSharedValue(1);
  useMotionCancellation(() => { cancelAnimation(scale); scale.value = 1; });
  useEffect(() => {
    cancelAnimation(scale);
    scale.value =
      enabled && !reducedMotion
        ? withSequence(
            withTiming(squash, { duration: Math.max(0, anticipationMs) }),
            withSpring(stretch, preset),
            withSpring(1, preset),
          )
        : 1;
    return () => cancelAnimation(scale);
  }, [trigger, enabled, reducedMotion, preset, squash, stretch, anticipationMs]);
  const visual = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }, { scaleY: 2 - scale.value }],
  }));
  return <Animated.View style={[style, visual]}>{children}</Animated.View>;
}
export function RewardSequence({
  eventId,
  confirmed,
  seed = 1,
  particleCount = 12,
  duration = 650,
  children,
  style,
}: SurfaceProps & { eventId: string; confirmed: boolean; seed?: number; particleCount?: number; duration?: number }) {
  const { enabled, reducedMotion, emitHaptic } = useMotionPolicy();
  const played = useRef(new Set<string>());
  const progress = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(progress);
    if (confirmed && !played.current.has(eventId)) {
      // Dedupe the latest 512 confirmed events; older IDs may be intentionally replayed.
      played.current.add(eventId);
      if (played.current.size > 512) played.current.delete(played.current.values().next().value!);
      emitHaptic("success", `reward:${eventId}`);
      progress.value = enabled && !reducedMotion ? 0 : 1;
      if (enabled && !reducedMotion)
        progress.value = withTiming(1, { duration: Math.max(0, duration) });
    } else progress.value = 1;
    return () => cancelAnimation(progress);
  }, [confirmed, eventId, enabled, reducedMotion, emitHaptic, duration]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", state => {
      if (state !== "active") { cancelAnimation(progress); progress.value = 1; }
    });
    return () => listener.remove();
  }, []);
  return (
    <View style={style}>
      {children}
      {Array.from({ length: Math.max(0, Math.min(100, Math.floor(particleCount))) }, (_, index) => (
        <Particle key={index} index={index + seed} progress={progress} />
      ))}
    </View>
  );
}
function Particle({
  index,
  progress,
}: {
  index: number;
  progress: SharedValue<number>;
}) {
  const angle = (index * Math.PI) / 6,
    radius = 40 + ((index * 37) % 50);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * radius * progress.value },
      {
        translateY:
          Math.sin(angle) * radius * progress.value +
          40 * progress.value * progress.value,
      },
      { rotate: `${progress.value * 180 + index * 31}deg` },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      style={[
        {
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 6,
          height: 6,
          borderRadius: index % 2 ? 3 : 0,
          backgroundColor: ["#8754ee", "#e6b240", "#36b59a"][index % 3],
        },
        style,
      ]}
    />
  );
}
const AnimatedInput = Animated.createAnimatedComponent(TextInput);
export function AnimatedNumber({
  value,
  precision = 0,
}: {
  value: number;
  precision?: number;
}) {
  const { value: number, animateTo } = useSpringValue(value);
  useEffect(() => animateTo(value), [value, animateTo]);
  const props = useAnimatedProps(() => ({
    text: number.value.toFixed(precision),
    defaultValue: number.value.toFixed(precision),
  }));
  return (
    <AnimatedInput
      editable={false}
      accessibilityLabel={value.toFixed(precision)}
      animatedProps={props}
    />
  );
}
export function AnimatedText({ children }: { children: string }) {
  const { enabled, reducedMotion } = useMotionPolicy();
  return (
    <Animated.Text
      key={children}
      entering={enabled && !reducedMotion ? FadeIn : undefined}
    >
      {children}
    </Animated.Text>
  );
}
export function StaggerGroup({
  children,
  style,
  interval = 40,
}: SurfaceProps & { interval?: number }) {
  const { enabled, reducedMotion } = useMotionPolicy();
  return (
    <View style={style}>
      {React.Children.map(children, (child, index) => (
        <Animated.View
          entering={
            enabled && !reducedMotion
              ? FadeIn.delay(index * interval)
              : undefined
          }
        >
          {child}
        </Animated.View>
      ))}
    </View>
  );
}
export function TiltSurface({ children, style }: SurfaceProps) {
  const { owner, id } = useGestureOwnership();
  const { enabled, reducedMotion, preset } = useMotionPolicy();
  const x = useSharedValue(0),
    y = useSharedValue(0);
  useMotionCancellation(() => { cancelAnimation(x); cancelAnimation(y); x.value = 0; y.value = 0; if (owner.value === id) owner.value = 0; });
  const pan = Gesture.Pan()
    .onTouchesDown((_event, manager) => { if (owner.value !== 0 && owner.value !== id) manager.fail(); })
    .onStart(() => { if (owner.value === 0) owner.value = id; })
    .onUpdate((event) => {
      if (owner.value === id && enabled && !reducedMotion) {
        x.value = Math.max(-8, Math.min(8, -event.translationY / 15));
        y.value = Math.max(-8, Math.min(8, event.translationX / 15));
      }
    })
    .onFinalize(() => {
      if (owner.value === id) owner.value = 0;
      x.value = enabled && !reducedMotion ? withSpring(0, preset) : 0;
      y.value = enabled && !reducedMotion ? withSpring(0, preset) : 0;
    });
  const animated = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${x.value}deg` },
      { rotateY: `${y.value}deg` },
    ],
  }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </GestureDetector>
  );
}
