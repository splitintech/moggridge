import React, { useEffect } from "react";
import { AppState, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  LinearTransition,
  cancelAnimation,
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useGestureOwnership } from "./ownership";
import { useMotionPolicy } from "./policy";
export interface ReorderGroupProps<T> {
  items: readonly T[];
  keyOf(item: T): string;
  onReorder(items: T[]): void;
  renderItem(item: T): React.ReactNode;
  columns?: number;
  cellWidth: number;
  cellHeight: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}
export function ReorderGroup<T>({
  items,
  keyOf,
  onReorder,
  renderItem,
  columns = 1,
  cellWidth,
  cellHeight,
  height = 400,
  style,
}: ReorderGroupProps<T>) {
  if (!Number.isInteger(columns) || columns < 1 || !Number.isFinite(cellWidth) || cellWidth <= 0 || !Number.isFinite(cellHeight) || cellHeight <= 0) throw new Error("ReorderGroup requires positive cell dimensions and an integer column count");
  const keys = items.map(keyOf);
  if (new Set(keys).size !== keys.length) throw new Error("ReorderGroup requires unique stable item IDs");
  const scroll = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0),
    edge = useSharedValue(0);
  const max = Math.max(
    0,
    Math.ceil(items.length / columns) * cellHeight - height,
  );
  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(items.length - 1, to)), 0, item);
    onReorder(next);
  };
  useFrameCallback((frame) => {
    if (edge.value !== 0) {
      offset.value = Math.max(
        0,
        Math.min(
          max,
          offset.value +
            (edge.value * (frame.timeSincePreviousFrame || 16)) / 1000,
        ),
      );
      scrollTo(scroll, 0, offset.value, false);
    }
  });
  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y;
  });
  return (
    <Animated.ScrollView
      ref={scroll}
      style={[{ height }, style]}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <View
        style={{
          width: columns * cellWidth,
          height: Math.ceil(items.length / columns) * cellHeight,
        }}
      >
        {items.map((item, index) => (
          <Cell
            key={keyOf(item)}
            index={index}
            columns={columns}
            width={cellWidth}
            height={cellHeight}
            viewport={height}
            total={items.length}
            move={move}
            offset={offset}
            edge={edge}
          >
            {renderItem(item)}
          </Cell>
        ))}
      </View>
    </Animated.ScrollView>
  );
}
function Cell({
  index,
  columns,
  width,
  height,
  viewport,
  total,
  move,
  offset,
  edge,
  children,
}: {
  index: number;
  columns: number;
  width: number;
  height: number;
  viewport: number;
  total: number;
  move(from: number, to: number): void;
  offset: SharedValue<number>;
  edge: SharedValue<number>;
  children: React.ReactNode;
}) {
  const { owner, id } = useGestureOwnership();
  const { enabled, reducedMotion, preset, emitHaptic } = useMotionPolicy();
  const x = useSharedValue(0),
    y = useSharedValue(0),
    active = useSharedValue(false),
    startOffset = useSharedValue(0);
  useEffect(() => {
    const reset = () => { edge.value = 0; active.value = false; cancelAnimation(x); cancelAnimation(y); x.value = 0; y.value = 0; if (owner.value === id) owner.value = 0; };
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") reset(); });
    return () => { subscription.remove(); reset(); };
  }, []);
  const start = () => emitHaptic("drag-start");
  const end = (target: number) => {
    move(index, target);
    emitHaptic("drag-end");
  };
  const gesture = Gesture.Pan()
    .onTouchesDown((_event, manager) => { if (owner.value !== 0 && owner.value !== id) manager.fail(); })
    .activateAfterLongPress(250)
    .onStart(() => {
      if (owner.value !== 0 && owner.value !== id) return;
      owner.value = id;
      active.value = true;
      startOffset.value = offset.value;
      runOnJS(start)();
    })
    .onUpdate((event) => {
      if (owner.value !== id) return;
      x.value = event.translationX;
      y.value = event.translationY;
      const position =
        Math.floor(index / columns) * height + event.y - offset.value;
      edge.value = position < 48 ? -300 : position > viewport - 48 ? 300 : 0;
    })
    .onEnd(() => {
      if (owner.value !== id) return;
      const col = Math.max(
        0,
        Math.min(columns - 1, (index % columns) + Math.round(x.value / width)),
      );
      const row = Math.max(
        0,
        Math.floor(index / columns) +
          Math.round((y.value + offset.value - startOffset.value) / height),
      );
      runOnJS(end)(Math.min(total - 1, row * columns + col));
    })
    .onFinalize(() => {
      if (owner.value === id) owner.value = 0;
      edge.value = 0;
      active.value = false;
      x.value = enabled && !reducedMotion ? withSpring(0, preset) : 0;
      y.value = enabled && !reducedMotion ? withSpring(0, preset) : 0;
    });
  const animated = useAnimatedStyle(() => ({
    zIndex: active.value ? 10 : 0,
    transform: [
      { translateX: x.value },
      {
        translateY:
          y.value + (active.value ? offset.value - startOffset.value : 0),
      },
      { scale: active.value && enabled && !reducedMotion ? 1.04 : 1 },
    ],
  }));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        layout={
          enabled && !reducedMotion
            ? LinearTransition.springify().damping(preset.damping)
            : undefined
        }
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Item ${index + 1} of ${total}`}
        accessibilityActions={[
          { name: "increment", label: "Move later" },
          { name: "decrement", label: "Move earlier" },
        ]}
        onAccessibilityAction={(event) =>
          move(
            index,
            Math.max(
              0,
              Math.min(
                total - 1,
                index + (event.nativeEvent.actionName === "increment" ? 1 : -1),
              ),
            ),
          )
        }
        style={[
          {
            position: "absolute",
            left: (index % columns) * width,
            top: Math.floor(index / columns) * height,
            width,
            height,
          },
          animated,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
