# Native motion lab

Use Node 24, `npm ci`, then `npm start`. `npm run ios` and `npm run android` generate and compile native projects through Expo. The lab includes every pattern, motion-policy switches, a grid with edge autoscroll, persistent listing expansion, and a local deterministic MP4.

The native tuple was verified against the live npm registry and Expo's SDK 58 dependency manifest on 2026-10-24. The exact resolution is in package-lock.json. Expo modules use version 58 (including video and haptics), rather than older independently numbered majors.

Metro resolves this repository's native source and runs the Worklets transform. It uses this fixture's dependency tree to avoid the legacy root's React 18 runtime. This is a source consumer; packed-package verification is a separate gate.

MediaHost retains one VideoView and useVideoPlayer instance. Move the slot while playing and verify advancing playback time, mute/caption/rate continuity and one audio stream. Android uses textureView for clipping. No source switch occurs during expansion.

Maestro flow: `.maestro/catalog.yaml`. Device release builds, VoiceOver/TalkBack focus, playback continuity, 100-cycle cleanup, 60/120 Hz traces and physical performance remain unqualified until run on devices.
