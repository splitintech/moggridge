import React from "react";
import { AccessibilityInfo, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { act, fireEvent, render } from "@testing-library/react-native";
import {
  MotionProvider,
  PressableSurface,
  FavoriteButton,
  ReorderGroup,
  SettlingProgress,
  useMotionPolicy,
  useSpringValue,
} from "../../src/native";
jest.mock("react-native-reanimated", () =>
  require("../../examples/native/node_modules/react-native-reanimated/mock"),
);
describe("native contracts", () => {
  beforeEach(() =>
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(false),
  );
  afterEach(() => jest.restoreAllMocks());
  it("disabled controls do not fire actions", () => {
    const press = jest.fn();
    const ui = render(
      <MotionProvider>
        <PressableSurface
          disabled
          accessibilityLabel="Disabled"
          onPress={press}
        >
          <Text>Disabled</Text>
        </PressableSurface>
      </MotionProvider>,
    );
    fireEvent.press(ui.getByLabelText("Disabled"));
    expect(press).not.toHaveBeenCalled();
  });
  it("favorite requests selection and waits for host acceptance", () => {
    const change = jest.fn();
    const ui = render(
      <MotionProvider>
        <FavoriteButton selected={false} onSelectedChange={change} />
      </MotionProvider>,
    );
    fireEvent.press(ui.getByLabelText("Favorite"));
    expect(change).toHaveBeenCalledWith(true);
    expect(ui.getByLabelText("Favorite").props.accessibilityState.checked).toBe(
      false,
    );
  });
  it("offers accessible grid reorder without dragging", () => {
    const change = jest.fn();
    const ui = render(
      <GestureHandlerRootView>
        <MotionProvider>
          <ReorderGroup
            items={["a", "b", "c"]}
            keyOf={(x) => x}
            onReorder={change}
            columns={2}
            cellWidth={100}
            cellHeight={100}
            renderItem={(x) => <Text>{x}</Text>}
          />
        </MotionProvider>
      </GestureHandlerRootView>,
    );
    fireEvent(ui.getByLabelText("Item 1 of 3"), "accessibilityAction", {
      nativeEvent: { actionName: "increment" },
    });
    expect(change).toHaveBeenCalledWith(["b", "a", "c"]);
  });
  it("subscribes to live reduced motion and removes listener", async () => {
    let listener: (value: boolean) => void = () => {};
    const remove = jest.fn();
    jest
      .spyOn(AccessibilityInfo, "addEventListener")
      .mockImplementation((_name, callback) => {
        listener = callback as (value: boolean) => void;
        return { remove };
      });
    function Probe() {
      return (
        <Text>{useMotionPolicy().reducedMotion ? "reduced" : "full"}</Text>
      );
    }
    const ui = render(
      <MotionProvider>
        <Probe />
      </MotionProvider>,
    );
    await act(async () => {});
    act(() => listener(true));
    expect(ui.getByText("reduced")).toBeTruthy();
    ui.unmount();
    expect(remove).toHaveBeenCalled();
  });
  it("truthful progress bounds the accessible percentage", () => {
    const ui = render(
      <MotionProvider>
        <SettlingProgress value={140} />
      </MotionProvider>,
    );
    expect(ui.getByRole("progressbar").props.accessibilityValue.now).toBe(100);
  });
  it("reduced motion still emits exactly one terminal lifecycle event", () => {
    const events = jest.fn();
    function Probe() {
      const spring = useSpringValue(0, events);
      return (
        <PressableSurface
          accessibilityLabel="Run"
          onPress={() => spring.animateTo(1)}
        />
      );
    }
    const ui = render(
      <MotionProvider reducedMotion="always">
        <Probe />
      </MotionProvider>,
    );
    fireEvent.press(ui.getByLabelText("Run"));
    expect(events.mock.calls.map((call) => call[0].phase)).toEqual([
      "start",
      "complete",
    ]);
  });
});

it('isolates synchronous haptic driver failures and applies spring overrides', () => {
  function Probe() {
    const policy = useMotionPolicy();
    return <PressableSurface accessibilityLabel="Haptic" onPress={() => policy.emitHaptic('press')}><Text>{String(policy.preset.stiffness)}</Text></PressableSurface>;
  }
  const ui = render(<MotionProvider spring={{stiffness:321}} haptics={() => {throw new Error('unavailable');}}><Probe/></MotionProvider>);
  expect(ui.getByText('321')).toBeTruthy();
  expect(() => fireEvent.press(ui.getByLabelText('Haptic'))).not.toThrow();
});
