# Native extension contract

The package does not ship a Swift or Kotlin bridge. PWA consumers execute browser code, including installed iPhone PWAs. A future native extension implements the `/extensions` contract and is loaded only by a native consumer.

1. Query `capabilities()` before selecting an OS effect. Unsupported effects use the adapter spring fallback.
2. Call `start({target, policy})`. Retain its run ID. Each start produces one start event and exactly one complete/cancel event.
3. Sample native position and velocity in logical units and units/second. `retarget` begins a new run from the current state, cancelling the prior run exactly once.
4. `cancel` stops the effect; `dispose` cancels and releases listeners/resources. Both tolerate repeated calls.
5. Reduced motion or disabled policy lands immediately at the target. Subscribe to accessibility changes; do not cache the OS preference at module load.
6. Native code owns frames. JS receives semantic lifecycle and completion events, never one message per frame.
7. Keep app backgrounding and view disposal wired to cancellation. Reject stale completion IDs.

A Fabric native component can expose the rendering surface; a TurboModule can expose capabilities and semantic commands. Swift/Core Animation and Kotlin/Android animation implementations must preserve the same ownership and lifecycle behavior. No web adapter should import either bridge.

`createEffectTestDouble` is an executable contract double with explicit `sample` and `complete` methods. Test start → retarget → stale complete → complete, reduced motion, repeated cancellation, and disposal against it before introducing native code. It provides no visual OS effect and is not a device test.
