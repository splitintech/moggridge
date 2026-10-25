import React, { createContext, useContext, useRef } from "react";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
const Context = createContext<SharedValue<number> | null>(null);
let nextOwner = 0;
/** One active transform gesture per scope. Nested scopes deliberately isolate ownership. */
export function GestureOwnershipScope({ children }: { children: React.ReactNode }) {
  const owner = useSharedValue(0);
  return <Context.Provider value={owner}>{children}</Context.Provider>;
}
export function useGestureOwnership() {
  const inherited = useContext(Context);
  const fallback = useSharedValue(0);
  const id = useRef(0);
  if (!id.current) id.current = ++nextOwner;
  return { owner: inherited || fallback, id: id.current };
}
