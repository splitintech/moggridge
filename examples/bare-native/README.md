# Bare React Native fixture

Use Node 24 and `npm ci`. `npm run bundle` exercises Metro without Expo. The source entrypoint is resolved by Metro configuration; a tarball can be selected with `MOTION_PACKAGE_PATH=/absolute/unpacked/package` for packed-consumer qualification.

Official React Native 0.88.0 Xcode and Gradle projects are included, generated with community CLI 20.2.0. Install CocoaPods with the included Gemfile before iOS builds. `npm run android:release` and `npm run ios:release` perform release builds when SDKs/signing are available. Source bundling does not establish native release-build or physical performance qualification.

The generated Android template signs the internal release APK with its public debug fixture key. This APK is for qualification, not store publication. The manual CI workflow compiles Android release and iOS Release simulator targets; neither is physical-device or signing qualification. Configure real app signing separately for distribution.
