export const APP_STORE_URL =
  "https://apps.apple.com/us/app/westride-org/id6828072405";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.westride.org";

/** Public TestFlight link. Anyone with it can install the iOS tester build. */
export const TESTFLIGHT_URL =
  "https://testflight.apple.com/join/westride";

/** Google Play open testing. Anyone with it can join the Android tester track. */
export const PLAY_TESTING_URL =
  "https://play.google.com/apps/testing/com.westride.org";

/** Showcase and join instructions. The public store listings are not live yet. */
export const MOBILE_APPS_PATH = "/mobile-apps";
export const IOS_BETA_PATH = "/mobile-apps/ios";
export const ANDROID_BETA_PATH = "/mobile-apps/android";

export const STORE_LINKS = [
  { label: "TestFlight", href: TESTFLIGHT_URL },
  { label: "Google Play", href: PLAY_TESTING_URL },
] as const;
