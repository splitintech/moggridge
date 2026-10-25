import React from "react";
import { Modal, Text } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Reanimated from "react-native-reanimated";
import {
  AnchoredMenu,
  DismissibleSurface,
  ElasticSheet,
  MotionProvider,
} from "../../src/native";
jest.mock("react-native-reanimated", () =>
  require("../../examples/native/node_modules/react-native-reanimated/mock"),
);
afterEach(() => jest.restoreAllMocks());
it("retains a menu until completion and ignores a stale close after reversal", () => {
  const completions: Array<(finished: boolean) => void> = [];
  jest
    .spyOn(Reanimated, "withSpring")
    .mockImplementation((target, _config, callback) => {
      if (callback) completions.push(callback as (finished: boolean) => void);
      return target;
    });
  const change = jest.fn();
  const example = (open: boolean) => (
    <MotionProvider>
      <AnchoredMenu
        open={open}
        onOpenChange={change}
        anchor={{ x: 0, y: 0, width: 20, height: 20 }}
      >
        <Text>Menu</Text>
      </AnchoredMenu>
    </MotionProvider>
  );
  const ui = render(example(true));
  ui.rerender(example(false));
  expect(ui.UNSAFE_getByType(Modal).props.visible).toBe(true);
  const stale = completions.at(-1)!;
  ui.rerender(example(true));
  act(() => stale(true));
  expect(ui.UNSAFE_getByType(Modal).props.visible).toBe(true);
  ui.rerender(example(false));
  act(() => completions.at(-1)!(true));
  expect(ui.UNSAFE_getByType(Modal).props.visible).toBe(false);
});
it("a non-dismissible sheet refuses backdrop, back and accessibility dismissal", () => {
  const change = jest.fn();
  const ui = render(
    <GestureHandlerRootView>
      <MotionProvider reducedMotion="always">
        <ElasticSheet open onOpenChange={change} dismissible={false}>
          <Text>Sheet</Text>
        </ElasticSheet>
      </MotionProvider>
    </GestureHandlerRootView>,
  );
  fireEvent.press(
    ui.getByLabelText("Close sheet", { includeHiddenElements: true }),
  );
  fireEvent(ui.UNSAFE_getByType(Modal), "requestClose");
  fireEvent(ui.getByLabelText("Sheet position"), "accessibilityAction", {
    nativeEvent: { actionName: "dismiss" },
  });
  expect(change).not.toHaveBeenCalled();
  expect(
    ui
      .getByLabelText("Sheet position")
      .props.accessibilityActions.some(
        (action: { name: string }) => action.name === "dismiss",
      ),
  ).toBe(false);
});
it("commits dismissal at most once across repeated accessibility actions", () => {
  const dismiss = jest.fn();
  const ui = render(
    <GestureHandlerRootView>
      <MotionProvider>
        <DismissibleSurface onDismiss={dismiss}>
          <Text>Dismiss me</Text>
        </DismissibleSurface>
      </MotionProvider>
    </GestureHandlerRootView>,
  );
  const surface = ui.getByLabelText("Dismissible surface");
  fireEvent(surface, "accessibilityAction", {
    nativeEvent: { actionName: "dismiss" },
  });
  fireEvent(surface, "accessibilityAction", {
    nativeEvent: { actionName: "dismiss" },
  });
  expect(dismiss).toHaveBeenCalledTimes(1);
});
