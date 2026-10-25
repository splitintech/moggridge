import React, { useEffect } from "react";
import { Text } from "react-native";
import { act, render } from "@testing-library/react-native";
import {
  MediaHost,
  MediaSlot,
  MotionProvider,
  TransitionHost,
  useTransitionHost,
  useMediaHost,
} from "../../src/native";
jest.mock("react-native-reanimated", () =>
  require("../../examples/native/node_modules/react-native-reanimated/mock"),
);
it("retains one media surface across slot state changes", async () => {
  let mounts = 0,
    unmounts = 0;
  function Surface() {
    useEffect(() => {
      mounts++;
      return () => {
        unmounts++;
      };
    }, []);
    return <Text>One player surface</Text>;
  }
  function Example({ detail }: { detail: boolean }) {
    return (
      <MotionProvider reducedMotion="always">
        <MediaHost surface={<Surface />}>
          <MediaSlot id="inline" active={!detail} />
          <MediaSlot id="detail" active={detail} />
        </MediaHost>
      </MotionProvider>
    );
  }
  const ui = render(<Example detail={false} />);
  await act(async () => {});
  ui.rerender(<Example detail />);
  await act(async () => {});
  ui.rerender(<Example detail={false} />);
  await act(async () => {});
  expect(mounts).toBe(1);
  expect(unmounts).toBe(0);
  ui.unmount();
  expect(unmounts).toBe(1);
});
it("cancels stale source measurement when close reverses a pending open", async () => {
  let controller: ReturnType<typeof useTransitionHost> | undefined;
  let resolveMeasurement: (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void = () => {};
  function Probe() {
    const host = useTransitionHost();
    controller = host;
    useEffect(
      () =>
        host.register(
          "card",
          () =>
            new Promise((resolve) => {
              resolveMeasurement = resolve;
            }),
        ),
      [host.register],
    );
    return null;
  }
  const events = jest.fn();
  const ui = render(
    <MotionProvider reducedMotion="always">
      <TransitionHost onMotionEvent={events} surface={<Text>Detail</Text>}>
        <Probe />
      </TransitionHost>
    </MotionProvider>,
    {
      createNodeMock: () => ({
        measureInWindow: (
          callback: (x: number, y: number, w: number, h: number) => void,
        ) => callback(0, 0, 300, 600),
      }),
    },
  );
  let opened: Promise<boolean> = Promise.resolve(true);
  act(() => {
    opened = controller!.activate("card");
  });
  await act(async () => {
    await controller!.close();
    resolveMeasurement({ x: 0, y: 0, width: 100, height: 100 });
    expect(await opened).toBe(false);
  });
  expect(events).not.toHaveBeenCalled();
  ui.unmount();
});

it('hides background accessibility and pointer targets during expansion', async () => {
  let controller: ReturnType<typeof useTransitionHost> | undefined;
  function Probe() { controller = useTransitionHost(); return <Text>Background</Text>; }
  const ui = render(<MotionProvider reducedMotion="always"><TransitionHost surface={<Text>Detail</Text>}><Probe/></TransitionHost></MotionProvider>);
  await act(async () => { await controller!.activate('missing-direct-entry'); });
  const background = ui.getByTestId('motion-transition-background', {includeHiddenElements:true});
  expect(background.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(background.props.accessibilityElementsHidden).toBe(true);
  expect(background.props.pointerEvents).toBe('none');
  await act(async () => { await controller!.close(); });
  expect(ui.getByTestId('motion-transition-background').props.importantForAccessibility).toBe('auto');
});

it('hides missing and removed media slots without unmounting the player', async () => {
  const nativeMethods = require('../../examples/native/node_modules/@react-native/jest-preset/jest/MockNativeMethods').default;
  const measurement = jest.spyOn(nativeMethods, 'measureInWindow').mockImplementation((callback: (x:number,y:number,width:number,height:number)=>void) => callback(0,0,300,600));
  let controller: ReturnType<typeof useMediaHost> | undefined;
  let mounts = 0, unmounts = 0;
  function Surface() { useEffect(() => { mounts++; return () => { unmounts++; }; }, []); return <Text>Stable surface</Text>; }
  function Probe({registered}: {registered:boolean}) {
    const host = useMediaHost(); controller = host;
    useEffect(() => { if (registered) return host.register('slot', async () => ({x:0,y:0,width:100,height:100})); }, [host.register, registered]);
    return null;
  }
  const availability = jest.fn();
  const example = (registered:boolean) => <MotionProvider reducedMotion="always"><MediaHost onSlotAvailabilityChange={availability} surface={<Surface/>}><Probe registered={registered}/></MediaHost></MotionProvider>;
  const ui = render(example(true));
  await act(async () => { expect(await controller!.activate('slot')).toBe(true); });
  expect(ui.getByTestId('motion-persistent-surface').props.pointerEvents).toBe('auto');
  ui.rerender(example(false));
  expect(ui.getByTestId('motion-persistent-surface',{includeHiddenElements:true}).props.pointerEvents).toBe('none');
  await act(async () => { expect(await controller!.activate('missing')).toBe(false); });
  expect(mounts).toBe(1);expect(unmounts).toBe(0);expect(availability).toHaveBeenLastCalledWith(false);
  ui.unmount();measurement.mockRestore();
});
