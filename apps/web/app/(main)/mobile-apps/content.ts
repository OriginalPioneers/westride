import { PROJECT_REPOSITORY } from "../legal-document";
import {
  ANDROID_BETA_PATH,
  IOS_BETA_PATH,
  MOBILE_APPS_PATH,
  PLAY_TESTING_URL,
  TESTFLIGHT_URL,
} from "../../store-links";

export const FEEDBACK_URL = `${PROJECT_REPOSITORY}/issues`;

export const SCREENSHOT_WIDTH = 738;
export const SCREENSHOT_HEIGHT = 1600;

export type Shot = {
  src: string;
  title: string;
  caption: string;
  alt: string;
};

/** Phone captures of the tester build, in the order a new member meets them. */
export const SCREENSHOTS: Shot[] = [
  {
    src: "/mobile-app/screenshots/sign-in.jpeg",
    title: "Sign in",
    caption: "The same account you use on the website.",
    alt: "WeStride sign-in screen on a phone, with email and password fields and a link to create an account.",
  },
  {
    src: "/mobile-app/screenshots/idea-workshop.jpeg",
    title: "Idea Workshop",
    caption: "Ideas you started, and ideas you follow.",
    alt: "Idea Workshop on a phone, with a list of ideas and a button to start a new one.",
  },
  {
    src: "/mobile-app/screenshots/build-studio.jpeg",
    title: "Build Studio",
    caption: "Projects, open tickets, and the repository.",
    alt: "Build Studio on a phone, with a list of projects and a button to start a new build.",
  },
  {
    src: "/mobile-app/screenshots/ai-agent-fleet.jpeg",
    title: "AI Agent Fleet",
    caption: "Standing Muse agents, with a backlog you can see.",
    alt: "AI Agent Fleet on a phone, showing an empty state and a button to create an agent.",
  },
  {
    src: "/mobile-app/screenshots/academy.jpeg",
    title: "Academy",
    caption: "Tracks from AI fundamentals to launching a product.",
    alt: "Academy on a phone, listing beginner tracks on AI foundations, how models learn, and generative AI.",
  },
];

export type GuideItem = {
  title: string;
  detail: string;
};

export const TRY_ITEMS: GuideItem[] = [
  {
    title: "Sign in",
    detail:
      "Use the email and password from the website, or create an account. Ideas, builds, and agents are the same ones you see on westride.org.",
  },
  {
    title: "Open an idea",
    detail:
      "Look through Idea Workshop. Open one you already have, or start a new one from the phone.",
  },
  {
    title: "Open a build",
    detail:
      "In Build Studio, open a project and read its tickets. Check that the name, status, and repository match the website.",
  },
  {
    title: "Check an agent",
    detail:
      "Open AI Agent Fleet. If you have an agent, confirm its brief is there. If you do not, try creating one.",
  },
  {
    title: "Start a lesson",
    detail:
      "Open an Academy track and a lesson. Note anything that is hard to read or hard to tap.",
  },
];

export type PlatformId = "ios" | "android";

export type PlatformGuide = {
  id: PlatformId;
  name: string;
  path: string;
  logo: string;
  channel: string;
  joinLabel: string;
  joinHref: string;
  summary: string;
  installTitle: string;
  installLede: string;
  steps: GuideItem[];
};

export const IOS_GUIDE: PlatformGuide = {
  id: "ios",
  name: "iOS",
  path: IOS_BETA_PATH,
  logo: "/logos/apple.svg",
  channel: "TestFlight",
  joinLabel: "Join on TestFlight",
  joinHref: TESTFLIGHT_URL,
  summary:
    "Install the tester build with TestFlight. The public App Store listing is not live yet.",
  installTitle: "Install on iPhone or iPad",
  installLede:
    "TestFlight is Apple's app for builds that are not on the public App Store yet. Use the Apple ID signed in on the phone or tablet where you want WeStride.",
  steps: [
    {
      title: "Install TestFlight",
      detail:
        "On your iPhone or iPad, install TestFlight from the App Store if it is not already there. It is free.",
    },
    {
      title: "Open the WeStride invite",
      detail:
        "Tap Join on TestFlight. Accept the invite when TestFlight asks.",
    },
    {
      title: "Install WeStride",
      detail:
        "In TestFlight, install WeStride. Later tester builds show up in TestFlight as updates.",
    },
    {
      title: "Sign in",
      detail:
        "Open WeStride and sign in with the same account you use on the website.",
    },
  ],
};

export const ANDROID_GUIDE: PlatformGuide = {
  id: "android",
  name: "Android",
  path: ANDROID_BETA_PATH,
  logo: "/logos/android.svg",
  channel: "Google Play open testing",
  joinLabel: "Join the Play test",
  joinHref: PLAY_TESTING_URL,
  summary:
    "Join the open test, then install from Google Play. The public store listing is not live yet.",
  installTitle: "Install on Android",
  installLede:
    "The testing page asks you to become a tester, then opens the Play Store listing for that test. Use the Google account that is signed in on your phone.",
  steps: [
    {
      title: "Open the testing page",
      detail:
        "On your Android phone, tap Join the Play test. Stay signed in to the Google account you use on that phone.",
    },
    {
      title: "Become a tester",
      detail:
        "Join the test when Google Play asks. Anyone with the link can join.",
    },
    {
      title: "Install WeStride",
      detail:
        "Install from the Play Store page that follows. If Install does not appear right away, wait a few minutes and open the listing again.",
    },
    {
      title: "Sign in",
      detail:
        "Open WeStride and sign in with the same account you use on the website.",
    },
  ],
};

export const PLATFORM_GUIDES = [IOS_GUIDE, ANDROID_GUIDE] as const;

export const MOBILE_TABS = [
  { label: "Overview", href: MOBILE_APPS_PATH },
  { label: "iOS", href: IOS_BETA_PATH },
  { label: "Android", href: ANDROID_BETA_PATH },
] as const;

export function otherPlatform(id: PlatformId): PlatformGuide {
  return id === "ios" ? ANDROID_GUIDE : IOS_GUIDE;
}
