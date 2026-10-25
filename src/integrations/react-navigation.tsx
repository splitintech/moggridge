import { useCallback, useEffect, useRef } from "react";
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";
import { useTransitionHost } from "../native";
/** Mount the host above the navigator and set handleBack={false}; navigation owns history. */
export function useMotionNavigation(sourceId?: string) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const host = useTransitionHost();
  const generation = useRef(0),
    pending = useRef(false);
  useEffect(() => {
    const remove = navigation.addListener("beforeRemove", (event) => {
      queueMicrotask(() => {
        if (!event.defaultPrevented) {
          ++generation.current;
          pending.current = false;
          void host.close();
        }
      });
    });
    return () => {
      remove();
      ++generation.current;
      pending.current = false;
    };
  }, [navigation, host.close]);
  const navigate = useCallback(
    async (name: string, params?: object) => {
      if (pending.current) return false;
      pending.current = true;
      const token = ++generation.current;
      try {
        if (sourceId && !(await host.activate(sourceId))) return false;
        if (token !== generation.current) return false;
        navigation.navigate(name, params);
        return true;
      } catch (error) {
        void host.close();
        throw error;
      } finally {
        if (token === generation.current) pending.current = false;
      }
    },
    [navigation, host.activate, host.close, sourceId],
  );
  const cancel = useCallback(() => {
    ++generation.current;
    pending.current = false;
    void host.close();
  }, [host.close]);
  const back = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else cancel();
  }, [navigation, cancel]);
  return { navigate, back, cancel };
}
