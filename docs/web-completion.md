# Web engineering completion wave

This records source and local unit evidence, not physical-device or stable-release qualification.

## Added contracts and behavior

- `MomentumPolicy` and `resolveMomentumTarget` expose bounded velocity/projection policy in core; relevant pure helpers retain `worklet` directives for native callers. `SnapCarousel` preserves browser scrolling by default. Supplying `momentumPolicy` opts into pointer-linked, axis-arbitrated scroll and Motion spring settling. Keyboard controls use the same target controller. `style` can bound a vertical viewport.
- `MotionProvider` owns a shared gesture arbiter, cancels on background/blur, and accepts lifecycle diagnostics. `useMotionController` exposes sampled position/velocity, target changes, cancellation, exactly-once completion, policy landing, and background cleanup. `webCapabilities()` declares implementation availability separately from qualification.
- Sheets accept `dismissOffset` and `projectionMs`, retarget live snap-point and reduced-motion changes, and cancel dragging on background. Their handle still owns sheet dragging while content retains native scrolling. Dismissal acquires ownership only after axis locking and checking nested scroll consumption and text selection.
- Reorder uses shared ownership, proportional two-axis edge autoscroll, background cancellation restoring original order, and a lifted overlay that settles into its actual destination before removal.
- `LayoutFlow` retains keyed `LayoutFlowItem` children through exit. Items support insertion opacity, resize layout animation and an inner position-layout layer. Existing direct `LayoutFlow` users preserve position-only defaults.
- `RewardSequence` accepts `durationMs`, ordered `stages` (`id`, `atMs`), and `onStage`. Stage callbacks share the particle timeline, dispatch once per confirmed event, complete on reduced-motion policy, and cancel on background. Hosts own confirmed count state; callbacks can coordinate custom badge/count visuals. Deduplication remains bounded.
- Transition geometry has separate MotionValues for x/y/width/height, preserving coordinate velocity through retarget and viewport resize. Lifecycle completion waits for geometry and semantic progress. Logical start/end resolve the source element's inherited writing direction. Background lands the current target.
- MediaHost retains player and parent identity, respects caller pointer ownership, intersects the slot with viewport and overflow ancestor client boxes, and clips/hides the persistent overlay as its slot scrolls. The nonmodal accessibility fixture supplies actual geometry because jsdom has no layout.

## Local evidence

Node 24 TypeScript check passed. Core and web suites passed 33/33 after the first completed wave; final checks and any later count are reported by the parent delivery record. Added tests exercise arbiter sharing/cleanup, media clipping/pointer control, reward stage ordering and live policy landing, controller terminal events, retained removal, and bounded momentum validation. Existing retarget, overlay focus, router rollback, disabled, favorite, reorder and media identity contracts remain in the suite.

The web Workshop now uses explicit shared carousel momentum, a sheet dismissal endpoint, keyed retained layout items, and reward stage diagnostics. No new dependency or package manifest edits were made by this workstream.

## Qualification boundaries

This wave did not execute physical mobile browsers/PWA, screen readers, 120Hz devices, a 100-cycle leak trace, or native hardware. Pointer-gesture and viewport geometry changes require real-browser reruns; unit tests do not establish frame pacing or cross-browser gesture qualification. Native browser video controls and nested overlay focus remain subject to the documented explicit Close-control contract.
