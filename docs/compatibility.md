# Compatibility and extraction

The existing root and legacy gesture modules retain their signatures, thresholds and units. The `/core` entrypoint is engine-independent and has no DOM or React types. New velocities are logical units/second. Convert old pixels/millisecond with `legacyVelocityToUnitsPerSecond`.

The restored 0.2 root API includes `MobileEdgeBackHandler.target` for contained panels, target-relative edge coordinates, live configuration updates, and `hapticPattern={false}`. Root `useSwipeIntent` accepts primary mouse pointers, captures the active pointer, ignores other pointer IDs and secondary buttons, and suppresses duplicate touch events when pointer events are emitted. Its callback remains `(direction, result)` with legacy `distanceX`/`distanceY` and pixels-per-millisecond velocities. The newer `/web/swipe-intent` callback/result contract is separate; do not interchange these APIs merely because their hook names match.

`createMotionLifecycle(onEvent?)` returns `start(target = lastTarget)` and `retarget(target)` (run IDs), `sample(id, position, velocity)`, `complete(id)`, `cancel(reason?)`, `dispose()`, and a read-only copied `snapshot` containing position, velocity, target, and runId. Retarget emits old cancellation before new start; stale samples/completions do nothing. Each started run terminates once. Engines drive frames and call completion. Dispose cancels and rejects future starts. Event notifications are queued to preserve ordering under reentrant listeners.

`createApplePresets({enabled, reducedMotion})` is a pure factory: call it from the adapter's reactive motion-policy subscription. Disabled/reduced variants keep final semantic targets, collapse keyframes and remove delays/repeats. Durations in Apple/generic Framer Motion presets remain seconds; core durations are milliseconds. No module reads window or browser preferences at import time.

Apple's `shouldAnimate` is an explicitly legacy static boolean (true), available only from `/presets/apple`. The root callable `shouldAnimate()` is untouched. Consumers requiring live policy must use the factory. All 84 original Apple exports are mapped below; no tuning was renamed or conflated. This default static behavior is intentionally deterministic for SSR; it cannot reflect live preferences.

Generic variants from `src/utils/animations.ts`, entrances from `src/utils/animations/index.ts`, and text/number tuning are kept in separate files to preserve differing same-name values. No Remotion assets or branded effects were extracted.

| Original export | New subpath export |
| --- | --- |
| `shouldAnimate` | `@splitin/react-mobile-interactions/presets/apple#shouldAnimate` |
| `APPLE_SPRINGS` | `@splitin/react-mobile-interactions/presets/apple#APPLE_SPRINGS` |
| `APPLE_DURATIONS` | `@splitin/react-mobile-interactions/presets/apple#APPLE_DURATIONS` |
| `APPLE_EASING` | `@splitin/react-mobile-interactions/presets/apple#APPLE_EASING` |
| `appleDialogVariants` | `@splitin/react-mobile-interactions/presets/apple#appleDialogVariants` |
| `appleOverlayVariants` | `@splitin/react-mobile-interactions/presets/apple#appleOverlayVariants` |
| `appleSheetVariants` | `@splitin/react-mobile-interactions/presets/apple#appleSheetVariants` |
| `applePopoverVariants` | `@splitin/react-mobile-interactions/presets/apple#applePopoverVariants` |
| `appleTabContentVariants` | `@splitin/react-mobile-interactions/presets/apple#appleTabContentVariants` |
| `appleStaggerContainer` | `@splitin/react-mobile-interactions/presets/apple#appleStaggerContainer` |
| `appleStaggerItem` | `@splitin/react-mobile-interactions/presets/apple#appleStaggerItem` |
| `appleButtonTap` | `@splitin/react-mobile-interactions/presets/apple#appleButtonTap` |
| `appleCardHover` | `@splitin/react-mobile-interactions/presets/apple#appleCardHover` |
| `appleFadeInUp` | `@splitin/react-mobile-interactions/presets/apple#appleFadeInUp` |
| `appleScaleIn` | `@splitin/react-mobile-interactions/presets/apple#appleScaleIn` |
| `appleOverlayBlurVariants` | `@splitin/react-mobile-interactions/presets/apple#appleOverlayBlurVariants` |
| `appleContentReveal` | `@splitin/react-mobile-interactions/presets/apple#appleContentReveal` |
| `appleDrawerVariants` | `@splitin/react-mobile-interactions/presets/apple#appleDrawerVariants` |
| `applePopoverVariantsEnhanced` | `@splitin/react-mobile-interactions/presets/apple#applePopoverVariantsEnhanced` |
| `applePulse` | `@splitin/react-mobile-interactions/presets/apple#applePulse` |
| `appleShake` | `@splitin/react-mobile-interactions/presets/apple#appleShake` |
| `appleSlideIn` | `@splitin/react-mobile-interactions/presets/apple#appleSlideIn` |
| `appleCheckmark` | `@splitin/react-mobile-interactions/presets/apple#appleCheckmark` |
| `appleSpinner` | `@splitin/react-mobile-interactions/presets/apple#appleSpinner` |
| `appleStepTransition` | `@splitin/react-mobile-interactions/presets/apple#appleStepTransition` |
| `appleStepTransitionReverse` | `@splitin/react-mobile-interactions/presets/apple#appleStepTransitionReverse` |
| `appleDropdownVariants` | `@splitin/react-mobile-interactions/presets/apple#appleDropdownVariants` |
| `appleDropdownItemVariants` | `@splitin/react-mobile-interactions/presets/apple#appleDropdownItemVariants` |
| `appleDropdownContainer` | `@splitin/react-mobile-interactions/presets/apple#appleDropdownContainer` |
| `appleButtonHover` | `@splitin/react-mobile-interactions/presets/apple#appleButtonHover` |
| `appleProgressFill` | `@splitin/react-mobile-interactions/presets/apple#appleProgressFill` |
| `appleInputFocus` | `@splitin/react-mobile-interactions/presets/apple#appleInputFocus` |
| `appleSwitchThumb` | `@splitin/react-mobile-interactions/presets/apple#appleSwitchThumb` |
| `appleAccordionContent` | `@splitin/react-mobile-interactions/presets/apple#appleAccordionContent` |
| `appleAccordionChevron` | `@splitin/react-mobile-interactions/presets/apple#appleAccordionChevron` |
| `appleTabTriggerHover` | `@splitin/react-mobile-interactions/presets/apple#appleTabTriggerHover` |
| `appleTabIndicator` | `@splitin/react-mobile-interactions/presets/apple#appleTabIndicator` |
| `appleToastVariants` | `@splitin/react-mobile-interactions/presets/apple#appleToastVariants` |
| `appleTooltipVariants` | `@splitin/react-mobile-interactions/presets/apple#appleTooltipVariants` |
| `appleBadgeVariants` | `@splitin/react-mobile-interactions/presets/apple#appleBadgeVariants` |
| `appleBadgePulse` | `@splitin/react-mobile-interactions/presets/apple#appleBadgePulse` |
| `appleAvatarVariants` | `@splitin/react-mobile-interactions/presets/apple#appleAvatarVariants` |
| `appleCheckboxCheckmark` | `@splitin/react-mobile-interactions/presets/apple#appleCheckboxCheckmark` |
| `appleRadioSelection` | `@splitin/react-mobile-interactions/presets/apple#appleRadioSelection` |
| `appleSliderThumb` | `@splitin/react-mobile-interactions/presets/apple#appleSliderThumb` |
| `appleTextareaFocus` | `@splitin/react-mobile-interactions/presets/apple#appleTextareaFocus` |
| `appleHoverCardVariants` | `@splitin/react-mobile-interactions/presets/apple#appleHoverCardVariants` |
| `appleContextMenuVariants` | `@splitin/react-mobile-interactions/presets/apple#appleContextMenuVariants` |
| `appleMenubarVariants` | `@splitin/react-mobile-interactions/presets/apple#appleMenubarVariants` |
| `appleAlertVariants` | `@splitin/react-mobile-interactions/presets/apple#appleAlertVariants` |
| `appleSkeletonShimmer` | `@splitin/react-mobile-interactions/presets/apple#appleSkeletonShimmer` |
| `appleCollapsibleContent` | `@splitin/react-mobile-interactions/presets/apple#appleCollapsibleContent` |
| `appleToggleVariants` | `@splitin/react-mobile-interactions/presets/apple#appleToggleVariants` |
| `appleDrawerVariantsBottom` | `@splitin/react-mobile-interactions/presets/apple#appleDrawerVariantsBottom` |
| `appleBreadcrumbItem` | `@splitin/react-mobile-interactions/presets/apple#appleBreadcrumbItem` |
| `applePaginationHover` | `@splitin/react-mobile-interactions/presets/apple#applePaginationHover` |
| `appleCarouselSlide` | `@splitin/react-mobile-interactions/presets/apple#appleCarouselSlide` |
| `appleTableRowHover` | `@splitin/react-mobile-interactions/presets/apple#appleTableRowHover` |
| `appleCalendarDaySelection` | `@splitin/react-mobile-interactions/presets/apple#appleCalendarDaySelection` |
| `appleCommandItemHover` | `@splitin/react-mobile-interactions/presets/apple#appleCommandItemHover` |
| `appleSeparatorVariants` | `@splitin/react-mobile-interactions/presets/apple#appleSeparatorVariants` |
| `appleLabelFocus` | `@splitin/react-mobile-interactions/presets/apple#appleLabelFocus` |
| `appleOTPSlotVariants` | `@splitin/react-mobile-interactions/presets/apple#appleOTPSlotVariants` |
| `appleOTPSlotPulse` | `@splitin/react-mobile-interactions/presets/apple#appleOTPSlotPulse` |
| `appleOTPSuccessVariants` | `@splitin/react-mobile-interactions/presets/apple#appleOTPSuccessVariants` |
| `appleFormErrorVariants` | `@splitin/react-mobile-interactions/presets/apple#appleFormErrorVariants` |
| `appleFormFieldShake` | `@splitin/react-mobile-interactions/presets/apple#appleFormFieldShake` |
| `appleFormSuccessVariants` | `@splitin/react-mobile-interactions/presets/apple#appleFormSuccessVariants` |
| `appleScrollbarVariants` | `@splitin/react-mobile-interactions/presets/apple#appleScrollbarVariants` |
| `appleScrollbarThumbHover` | `@splitin/react-mobile-interactions/presets/apple#appleScrollbarThumbHover` |
| `appleResizableHandleHover` | `@splitin/react-mobile-interactions/presets/apple#appleResizableHandleHover` |
| `appleResizableHandleActive` | `@splitin/react-mobile-interactions/presets/apple#appleResizableHandleActive` |
| `appleChartTooltipVariants` | `@splitin/react-mobile-interactions/presets/apple#appleChartTooltipVariants` |
| `appleChartLegendHover` | `@splitin/react-mobile-interactions/presets/apple#appleChartLegendHover` |
| `appleFileDropdownVariants` | `@splitin/react-mobile-interactions/presets/apple#appleFileDropdownVariants` |
| `appleFileItemContainer` | `@splitin/react-mobile-interactions/presets/apple#appleFileItemContainer` |
| `appleFileItemVariants` | `@splitin/react-mobile-interactions/presets/apple#appleFileItemVariants` |
| `appleBadgeCountVariants` | `@splitin/react-mobile-interactions/presets/apple#appleBadgeCountVariants` |
| `appleVoiceRecordingPulse` | `@splitin/react-mobile-interactions/presets/apple#appleVoiceRecordingPulse` |
| `appleVoiceMicRotation` | `@splitin/react-mobile-interactions/presets/apple#appleVoiceMicRotation` |
| `appleSonnerToastVariants` | `@splitin/react-mobile-interactions/presets/apple#appleSonnerToastVariants` |
| `appleMobileTabsContainer` | `@splitin/react-mobile-interactions/presets/apple#appleMobileTabsContainer` |
| `appleMobileTabsItemVariants` | `@splitin/react-mobile-interactions/presets/apple#appleMobileTabsItemVariants` |
| `appleAspectRatioVariants` | `@splitin/react-mobile-interactions/presets/apple#appleAspectRatioVariants` |

## Native extension contract

`/extensions` defines capability discovery, start, retarget, cancel, dispose, policy and exact-run completion. The executable TypeScript double implements a scalar effect with manual completion; it is not a shipped native bridge. Swift/Kotlin integrations must retain run IDs, ignore stale callbacks, settle immediately under disabled/reduced policy, and release resources on dispose. Unsupported capabilities should select the JS adapter fallback. Capability declarations and the 13-pattern catalog do not establish physical-device qualification.
