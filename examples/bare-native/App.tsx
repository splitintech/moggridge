import React from "react";
import { Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  MotionProvider,
  PressableSurface,
  SettlingProgress,
} from "@splitin/react-mobile-interactions/native";
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, padding: 40 }}>
      <MotionProvider>
        <PressableSurface accessibilityLabel="Native fixture">
          <Text>No DOM runtime</Text>
        </PressableSurface>
        <SettlingProgress value={50} />
      </MotionProvider>
    </GestureHandlerRootView>
  );
}
