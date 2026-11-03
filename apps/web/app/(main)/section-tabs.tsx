"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { DEVICES_PATH, PLEDGES_PATH } from "@/lib/account-paths";

type SectionTab = { label: string; href: string };

const OUR_STORY_TABS: SectionTab[] = [
  { label: "Our Story", href: "/our-story" },
  { label: "Tech Stack", href: "/our-story/tech-stack" },
  { label: "Design", href: "/our-story/design" },
];

const ACCOUNT_TABS: SectionTab[] = [
  { label: "Profile", href: "/profile" },
  { label: "WeStride Cloud", href: "/cloud" },
  { label: "Devices", href: DEVICES_PATH },
  { label: "Connections", href: "/settings" },
  { label: "API", href: "/settings/api" },
  { label: "MCP", href: "/settings/mcp" },
  { label: "Pledges", href: PLEDGES_PATH },
  { label: "Achievements", href: "/profile/achievements" },
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

/** The header shared by the member's own pages, reached from the profile button. */
export function AccountTabs() {
  return <SectionTabs tabs={ACCOUNT_TABS} />;
}
