# Packed context correction found during localhost preview

The application motion workshop exposed a real distribution defect: independent bundles created separate React contexts for the web host, router integration and compatibility policy. Source-import browser tests could not detect it.

Enabled shared output chunks for ESM and CommonJS. The actual packed consumer checks now compose MotionProvider/TransitionHost from /web with useMotionRouter from /integrations/react-router and default createPolicyMotion from /web/compat. They verify both host lookup and disabled-policy final rendering under React18 and19, in both module formats. All cases pass, along with existing SSR/TypeScript/Vite/engine-isolation checks. The installed SplitIn integration suite passes114 tests.

The preceding qualification.json remains bound to the previous source digest. Its prior release pass must not be applied to this corrected build; full release qualification must be refreshed before publication. Native source behavior is unchanged, but packed native bundling must be rechecked for the new output layout.

The same preview revealed that SplitIn uses Framer Motion12.7.3, whose DragControls lacks cancel(). A compatibility adapter tracks the engine subscription lifecycle and cancels its subscribed renderer without firing onDragEnd, instead of upgrading the application engine. Two regression tests cover cancellation, unsubscribe cleanup and newer-engine passthrough. Package typecheck and84 tests pass. The actual application workshop renders HTTP200 without runtime exceptions in Chromium under React StrictMode.
