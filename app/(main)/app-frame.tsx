"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Icon } from "@astryxdesign/core/Icon";
import type { IconType } from "@astryxdesign/core/Icon";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from "@astryxdesign/core/SideNav";
import {
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  HomeIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  SparklesIcon,
  TrophyIcon,
  UserCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import {
  AcademicCapIcon as AcademicCapIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  HomeIcon as HomeIconSolid,
  LightBulbIcon as LightBulbIconSolid,
  SparklesIcon as SparklesIconSolid,
  TrophyIcon as TrophyIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverIconSolid,
} from "@heroicons/react/24/solid";

type NavLink = {
  label: string;
  href: string;
  icon: IconType;
  selectedIcon: IconType;
};

type NavGroup = {
  title: string;
  isHeaderHidden?: boolean;
  links: NavLink[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    isHeaderHidden: true,
    links: [
      { label: "Home", href: "/", icon: HomeIcon, selectedIcon: HomeIconSolid },
    ],
  },
  {
    title: "Learn",
    links: [
      {
        label: "Academy",
        href: "/academy",
        icon: AcademicCapIcon,
        selectedIcon: AcademicCapIconSolid,
      },
      {
        label: "Achievements",
        href: "/achievements",
        icon: TrophyIcon,
        selectedIcon: TrophyIconSolid,
      },
      {
        label: "Mentorship",
        href: "/mentorship",
        icon: UserGroupIcon,
        selectedIcon: UserGroupIconSolid,
      },
    ],
  },
  {
    title: "Create",
    links: [
      {
        label: "Idea Studio",
        href: "/ideas",
        icon: LightBulbIcon,
        selectedIcon: LightBulbIconSolid,
      },
      {
        label: "Muse AI",
        href: "/muse",
        icon: SparklesIcon,
        selectedIcon: SparklesIconSolid,
      },
      {
        label: "Build Studio",
        href: "/build",
        icon: WrenchScrewdriverIcon,
        selectedIcon: WrenchScrewdriverIconSolid,
      },
    ],
  },
  {
    title: "Connect",
    links: [
      {
        label: "Community",
        href: "/community",
        icon: ChatBubbleLeftRightIcon,
        selectedIcon: ChatBubbleLeftRightIconSolid,
      },
    ],
  },
];

const ACCOUNT_LINKS: NavLink[] = [
  {
    label: "Settings",
    href: "/settings",
    icon: Cog6ToothIcon,
    selectedIcon: Cog6ToothIconSolid,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: UserCircleIcon,
    selectedIcon: UserCircleIconSolid,
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const renderLink = (link: NavLink) => (
    <SideNavItem
      key={link.href}
      label={link.label}
      href={link.href}
      icon={link.icon}
      selectedIcon={link.selectedIcon}
      isSelected={isActive(pathname, link.href)}
    />
  );

  return (
    <AppShell
      sideNav={
        <SideNav
          collapsible
          resizable={{
            defaultWidth: 260,
            minWidth: 220,
            maxWidth: 360,
            autoSaveId: "westride-side-nav",
          }}
          header={
            <SideNavHeading
              heading="WeStride"
              headingHref="/"
              icon={<NavIcon icon={<Icon icon={RocketLaunchIcon} size="sm" />} />}
            />
          }
          footer={
            <SideNavSection title="Account" isHeaderHidden>
              {ACCOUNT_LINKS.map(renderLink)}
            </SideNavSection>
          }
        >
          {NAV_GROUPS.map((group) => (
            <SideNavSection
              key={group.title}
              title={group.title}
              isHeaderHidden={group.isHeaderHidden}
            >
              {group.links.map(renderLink)}
            </SideNavSection>
          ))}
        </SideNav>
      }
    >
      {children}
    </AppShell>
  );
}
