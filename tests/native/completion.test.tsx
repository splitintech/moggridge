import React, { useEffect } from "react";
import { AppState, ScrollView, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { act, fireEvent, render } from "@testing-library/react-native";
import { MotionProvider, MomentumSurface, SnapCarousel, TransitionHost, useTransitionHost, nativeCapabilities, RewardSequence } from "../../src/native";
jest.mock("react-native-reanimated", () => require("../../examples/native/node_modules/react-native-reanimated/mock"));

it("clamps carousel overscroll to real endpoints and deduplicates settled feedback", () => {
  const changed = jest.fn(), haptics = jest.fn();
  const ui = render(<MotionProvider haptics={haptics}><SnapCarousel itemSize={100} onIndexChange={changed}><Text>First</Text><Text>Last</Text></SnapCarousel></MotionProvider>);
  const scroll = ui.UNSAFE_getByType(ScrollView);
  fireEvent(scroll, "momentumScrollEnd", {nativeEvent:{contentOffset:{x:999,y:0}}});
  fireEvent(scroll, "momentumScrollEnd", {nativeEvent:{contentOffset:{x:999,y:0}}});
  expect(changed).toHaveBeenCalledTimes(1); expect(changed).toHaveBeenLastCalledWith(1);
  fireEvent(scroll, "momentumScrollEnd", {nativeEvent:{contentOffset:{x:-100,y:0}}});
  expect(changed).toHaveBeenLastCalledWith(0); expect(haptics).toHaveBeenCalledTimes(2);
});
it("offers bounded non-drag momentum actions", () => {
  const settled = jest.fn();
  const ui = render(<GestureHandlerRootView><MotionProvider reducedMotion="always"><MomentumSurface points={[0,80,160]} onSettle={settled}><Text>Move</Text></MomentumSurface></MotionProvider></GestureHandlerRootView>);
  const surface = ui.getByLabelText("Momentum position");
  for (let index=0;index<4;index++) fireEvent(surface,"accessibilityAction",{nativeEvent:{actionName:"increment"}});
  expect(settled).toHaveBeenLastCalledWith(160);
  for (let index=0;index<4;index++) fireEvent(surface,"accessibilityAction",{nativeEvent:{actionName:"decrement"}});
  expect(settled).toHaveBeenLastCalledWith(0);
});
it("measures registered destination before completing expansion and reports lifecycle diagnostics", async () => {
  const methods = require('../../examples/native/node_modules/@react-native/jest-preset/jest/MockNativeMethods').default;
  const mock = jest.spyOn(methods,'measureInWindow').mockImplementation((callback:Function)=>callback(0,0,300,600));
  const destination = jest.fn(async()=>({x:40,y:70,width:180,height:240}));
  let controller: ReturnType<typeof useTransitionHost>;
  function Probe(){ const host=useTransitionHost();controller=host; useEffect(()=>host.register("destination",destination),[host.register]);return null; }
  const diagnostic=jest.fn();
  const ui=render(<MotionProvider reducedMotion="always" diagnostics={diagnostic}><TransitionHost mode="anchored" targetSlot="destination" surface={<Text>Detail</Text>}><Probe/></TransitionHost></MotionProvider>);
  await act(async()=>{expect(await controller!.activate("direct-entry")).toBe(true);});
  expect(destination).toHaveBeenCalled();expect(diagnostic.mock.calls.map(call=>call[0].phase)).toEqual(["start","complete"]);
  ui.unmount();mock.mockRestore();
});
it("reports missing optional haptics without implying native shared-element support",()=>{
  expect(nativeCapabilities().haptics).toBe("unavailable");
  expect(nativeCapabilities({haptics:()=>{}}).haptics).toBe("supported");
  expect(nativeCapabilities().nativeSharedElement).toBe("unavailable");
});
it("removes reward background listeners and does not replay a confirmed event",()=>{
  const haptics=jest.fn(),remove=jest.fn();
  const original = AppState.addEventListener;
  AppState.addEventListener = jest.fn().mockReturnValue({remove});
  const example=(confirmed:boolean)=><MotionProvider haptics={haptics}><RewardSequence eventId="confirmed:1" confirmed={confirmed} seed={42}><Text>Reward</Text></RewardSequence></MotionProvider>;
  const ui=render(example(true));ui.rerender(example(false));ui.rerender(example(true));
  expect(haptics).toHaveBeenCalledTimes(1);ui.unmount();expect(remove).toHaveBeenCalled();AppState.addEventListener = original;
});
it("does not reopen after close cancels a pending destination measurement", async()=>{
  const methods=require('../../examples/native/node_modules/@react-native/jest-preset/jest/MockNativeMethods').default;
  const mock=jest.spyOn(methods,'measureInWindow').mockImplementation((callback:Function)=>callback(0,0,300,600));
  let controller:ReturnType<typeof useTransitionHost>;
  let resolveDestination:(rect:{x:number;y:number;width:number;height:number})=>void=()=>{};
  function Probe(){const host=useTransitionHost();controller=host;useEffect(()=>host.register('destination',()=>new Promise(resolve=>{resolveDestination=resolve;})),[host.register]);return null;}
  const events=jest.fn();
  const ui=render(<MotionProvider reducedMotion="always"><TransitionHost targetSlot="destination" onMotionEvent={events}><Probe/></TransitionHost></MotionProvider>);
  let opening:Promise<boolean>;
  await act(async()=>{opening=controller!.activate('entry');});
  await act(async()=>{await controller!.close();resolveDestination({x:0,y:0,width:180,height:240});expect(await opening!).toBe(false);});
  expect(events).not.toHaveBeenCalled();
  expect(ui.getByTestId('motion-transition-background').props.pointerEvents).toBe('auto');
  ui.unmount();mock.mockRestore();
});
