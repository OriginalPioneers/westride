"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tab, TabList } from "@astryxdesign/core/TabList";

type SectionTab = { label: string; href: string };

const OUR_STORY_TABS: SectionTab[] = [
  { label: "Our Story", href: "/our-story" },
  { label: "Tech Stack", href: "/our-story/tech-stack" },
  { label: "Design", href: "/our-story/design" },
];

const PROFILE_TABS: SectionTab[] = [
  { label: "Overview", href: "/profile" },
  { label: "Achievements", href: "/profile/achievements" },
];

const SETTINGS_TABS: SectionTab[] = [
  { label: "Connections", href: "/settings" },
  { label: "API", href: "/settings/api" },
  { label: "MCP", href: "/settings/mcp" },
];

/** Switches between the pages that share one side nav entry. */
function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const selected =
    tabs.find((tab) => tab.href === pathname)?.href ?? tabs[0].href;
  return (
    <TabList value={selected} onChange={(href) => router.push(href)}>
      {tabs.map((tab) => (
        <Tab key={tab.href} value={tab.href} label={tab.label} href={tab.href} />
      ))}
    </TabList>
  );
}

export function OurStoryTabs() {
  return <SectionTabs tabs={OUR_STORY_TABS} />;
}

export function ProfileTabs() {
  return <SectionTabs tabs={PROFILE_TABS} />;
}

export function SettingsTabs() {
  return <SectionTabs tabs={SETTINGS_TABS} />;
}
