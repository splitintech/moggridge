import * as Haptics from "expo-haptics";
import type { HapticDriver } from "../native/policy";
export const expoHaptics: HapticDriver = (intent) => {
  switch (intent) {
    case "selection":
    case "snap":
      return Haptics.selectionAsync();
    case "success":
      return Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    case "warning":
      return Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      );
    case "error":
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    case "drag-start":
    case "drag-end":
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    default:
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};
