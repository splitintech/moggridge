# Using the adapters

Install the current source candidate using the [packed installation instructions](../README.md#install-the-current-source-candidate), then install only your platform peers. The commands below using the registry beta tag apply after that candidate is published. The package root remains the existing web gesture API. New interactions are opt-in subpath imports.

## Web / PWA

```sh
npm install @splitin/react-mobile-interactions@beta react react-dom framer-motion@^12 @radix-ui/react-dialog @radix-ui/react-popover
# Only when using the route integration:
npm install react-router-dom
```

```tsx
import {MotionProvider, TransitionHost, MorphingSurface, PressableSurface} from '@splitin/react-mobile-interactions/web';

<MotionProvider preset="soft" reducedMotion="system">
  <TransitionHost>
    <MorphingSurface id="home:123" label="Home details" presentation="right"
      trigger={<span>Open home</span>}>
      {close => <PressableSurface onClick={close}>Close</PressableSurface>}
    </MorphingSurface>
  </TransitionHost>
</MotionProvider>
```

Presentations include fullscreen, right, logical start/end, and anchored. Keep the host mounted above routes. The React Router adapter belongs in a persistent layout inside the router. `open(to, request)` owns its push and return; `reveal(request)` handles direct entry without adding history; `cancel()` abandons and rolls back an owned transaction. Do not also push/pop from the surface's close handler.

Mechanical buttons move their inner visual layer three logical units. Put the button face and shadow on `visualStyle`/`visualClassName` to animate that face while preserving the outer hit area. Press, selected and pending business states remain controlled by the caller.

Web `ElasticSheet` snap points are downward offsets, with a dedicated drag handle so content keeps native scrolling. Keyboard expand/collapse buttons provide a drag alternative. `SnapCarousel` uses browser momentum and CSS snap physics; native uses scroll-view deceleration. These trajectories are platform-specific.

## React Native

Use the New Architecture. The tested fixture pins Expo58, React19.3, RN0.88, Reanimated4.7.1, Worklets0.13 and GestureHandler3.3. Follow the fixture lockfile rather than mixing engine generations.

```tsx
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {MotionProvider, PressableSurface} from '@splitin/react-mobile-interactions/native';

<GestureHandlerRootView style={{flex:1}}>
  <MotionProvider preset="precise" reducedMotion="system">
    <PressableSurface accessibilityLabel="Continue" onPress={continueFlow}>
      <Text>Continue</Text>
    </PressableSurface>
  </MotionProvider>
</GestureHandlerRootView>
```

Expo uses its supported Babel preset. Bare RN installs the Worklets Babel plugin last. Metro must consume the native source condition so worklets can be transformed by the consumer. The package includes the native source dependency closure. Neither adapter imports the other platform's runtime.

`/integrations/react-navigation` supplies navigation ownership; `/integrations/expo-haptics` is optional. The default library does not require an Expo runtime. Native safe areas and keyboard behavior require the providers shown in the native example.

## Presets and imperative effects

```ts
import {motionPresets, snapTarget, createMotionLifecycle} from '@splitin/react-mobile-interactions/core';
import {createApplePresets} from '@splitin/react-mobile-interactions/presets/apple';
import {bindElementMotion} from '@splitin/react-mobile-interactions/web';

const binding = bindElementMotion(markerVisual, {interactionElement: markerRoot});
binding.select(true);
// At marker disposal:
binding.destroy();
```

See `compatibility.md` for all extracted Apple exports. `/presets/generic`, `/presets/entrances` and `/presets/text` preserve their separate namespaces. Legacy `shouldAnimate` from Apple presets is a static compatibility boolean; the root's `shouldAnimate()` remains callable. New code should subscribe through `useMotionPolicy`.

## Labs and validation

Run `npm run dev:lab`, or use the Expo and bare fixtures under `examples/`. SplitIn exposes the synchronized gallery at `/dev/motion-lab` and the card preview at `/dev/card-motion` in development only. Use reduced-motion, disabled, pending, RTL and large-text controls before tuning physics. Exported configuration contains only settings, not application data.

Build/test commands and qualification evidence live in `docs/qualification.json` and `docs/evidence/`. A bundler or simulator pass does not establish physical-device performance. See `implementation-plan.md` for remaining device and rollout acceptance gates.
