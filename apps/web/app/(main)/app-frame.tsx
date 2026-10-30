"use client";

import { Show, useClerk } from "@clerk/nextjs";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import type { IconType } from "@astryxdesign/core/Icon";
import { Layout } from "@astryxdesign/core/Layout";
import { Section } from "@astryxdesign/core/Section";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import {
  SideNav,
  SideNavCollapseButton,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
  useSideNavCollapse,
  useSideNavRenderMode,
} from "@astryxdesign/core/SideNav";
import {
  AcademicCapIcon,
  ArrowRightEndOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  CpuChipIcon,
  HomeIcon,
  LightBulbIcon,
  PaintBrushIcon,
  Square3Stack3DIcon,
  TrophyIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserPlusIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { afterAuthPath, signInPath, signUpPath } from "@/lib/auth-paths";
import { MuseDock } from "./muse-dock";
import { SiteFooter } from "../site-footer";
import {
  AcademicCapIcon as AcademicCapIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  CodeBracketIcon as CodeBracketIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  CommandLineIcon as CommandLineIconSolid,
  CpuChipIcon as CpuChipIconSolid,
  HomeIcon as HomeIconSolid,
  LightBulbIcon as LightBulbIconSolid,
  PaintBrushIcon as PaintBrushIconSolid,
  Square3Stack3DIcon as Square3Stack3DIconSolid,
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
    title: "Create",
    links: [
      {
        label: "Idea Studio",
        href: "/ideas",
        icon: LightBulbIcon,
        selectedIcon: LightBulbIconSolid,
      },
      {
        label: "Build Studio",
        href: "/build",
        icon: WrenchScrewdriverIcon,
        selectedIcon: WrenchScrewdriverIconSolid,
      },
      {
        label: "Agent Studio",
        href: "/agents",
        icon: CpuChipIcon,
        selectedIcon: CpuChipIconSolid,
      },
    ],
  },
  {
    title: "Connect",
    links: [
      {
        label: "Mentorship",
        href: "/mentorship",
        icon: UserGroupIcon,
        selectedIcon: UserGroupIconSolid,
      },
      {
        label: "Community",
        href: "/community",
        icon: ChatBubbleLeftRightIcon,
        selectedIcon: ChatBubbleLeftRightIconSolid,
      },
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
    ],
  },
  {
    title: "Earn",
    links: [
      {
        label: "Achievements",
        href: "/achievements",
        icon: TrophyIcon,
        selectedIcon: TrophyIconSolid,
      },
    ],
  },
  {
    title: "About",
    links: [
      {
        label: "Our Story",
        href: "/our-story",
        icon: BookOpenIcon,
        selectedIcon: BookOpenIconSolid,
      },
      {
        label: "Tech Stack",
        href: "/tech-stack",
        icon: Square3Stack3DIcon,
        selectedIcon: Square3Stack3DIconSolid,
      },
      {
        label: "Design",
        href: "/design",
        icon: PaintBrushIcon,
        selectedIcon: PaintBrushIconSolid,
      },
      {
        label: "API",
        href: "/api",
        icon: CodeBracketIcon,
        selectedIcon: CodeBracketIconSolid,
      },
      {
        label: "MCP",
        href: "/mcp",
        icon: CommandLineIcon,
        selectedIcon: CommandLineIconSolid,
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

// SideNav's sticky header and footer pad themselves by spacing-2 (the footer
// top pad is spacing-1). These margins pull a band out to the rail edges so
// its fill and divider read as the boundary of that region.
const headerBandStyle = {
  alignSelf: "stretch",
  marginInline: "calc(-1 * var(--spacing-2))",
  marginBlock: "calc(-1 * var(--spacing-2))",
};

function footerBandStyle(isCollapsed: boolean) {
  return {
    alignSelf: "stretch",
    marginInline: "calc(-1 * var(--spacing-2))",
    marginBlockStart: isCollapsed ? 0 : "calc(-1 * var(--spacing-1))",
    // Covers the sticky footer's bottom pad and the empty icon row SideNav
    // still reserves after the built-in collapse button is moved out.
    marginBlockEnd: "calc(-1 * var(--spacing-4))",
  };
}

function BrandMark() {
  return (
    <Image
      src="/westride-stamp.png"
      alt=""
      width={1156}
      height={778}
      preload
      // The optimizer fetches this file without a browser user agent,
      // and the proxy refuses that request.
      unoptimized
      style={{
        // Wide enough to read beside the wordmark, narrow enough
        // to sit inside the collapsed rail (spacing-12).
        width: "var(--spacing-10)",
        height: "auto",
      }}
    />
  );
}

function NavBrand() {
  const mode = useSideNavRenderMode();
  const { isCollapsed } = useSideNavCollapse();
  const heading = (
    <SideNavHeading heading="WeStride" headingHref="/" icon={<BrandMark />} />
  );

  // Mobile top bar and drawer already frame the wordmark. The band and
  // collapse control belong to the desktop rail.
  if (mode !== "default") {
    return heading;
  }

  return (
    <Section
      variant="section"
      padding={0}
      paddingInline={isCollapsed ? 0 : 2}
      paddingBlock={isCollapsed ? 1 : 2}
      dividers={["bottom"]}
      style={headerBandStyle}
    >
      {isCollapsed ? (
        <VStack align="center" gap={1}>
          <SideNavCollapseButton size="sm" />
          {heading}
        </VStack>
      ) : (
        <HStack align="center" gap={1}>
          <StackItem size="fill">{heading}</StackItem>
          <SideNavCollapseButton size="sm" />
        </HStack>
      )}
    </Section>
  );
}

function NavAccount({ children }: { children: React.ReactNode }) {
  const mode = useSideNavRenderMode();
  const { isCollapsed } = useSideNavCollapse();
  const links = (
    <SideNavSection title="Account" isHeaderHidden>
      {children}
    </SideNavSection>
  );

  if (mode !== "default") {
    return links;
  }

  return (
    <Section
      variant="section"
      padding={0}
      paddingInline={isCollapsed ? 0 : 2}
      paddingBlock={1}
      dividers={["top"]}
      style={footerBandStyle(isCollapsed)}
    >
      <VStack align={isCollapsed ? "center" : "stretch"}>{links}</VStack>
    </Section>
  );
}

export function AppFrame({
  children,
  viewerId = null,
}: {
  children: React.ReactNode;
  viewerId?: string | null;
}) {
  const pathname = usePathname();
  const { signOut } = useClerk();

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
      variant="section"
      sideNav={
        <SideNav
          collapsible={{ hasButton: false }}
          resizable={{
            defaultWidth: 260,
            minWidth: 220,
            maxWidth: 360,
            autoSaveId: "westride-side-nav",
          }}
          header={<NavBrand />}
          footer={
            <NavAccount>
              <Show when="signed-out">
                <SideNavItem
                  label="Register"
                  href={signUpPath}
                  icon={UserPlusIcon}
                  isSelected={isActive(pathname, signUpPath)}
                />
                <SideNavItem
                  label="Sign In"
                  href={signInPath}
                  icon={ArrowRightEndOnRectangleIcon}
                  isSelected={isActive(pathname, signInPath)}
                />
              </Show>
              <Show when="signed-in">
                {ACCOUNT_LINKS.map(renderLink)}
                <SideNavItem
                  label="Sign Out"
                  icon={ArrowRightStartOnRectangleIcon}
                  onClick={() => {
                    void signOut({ redirectUrl: afterAuthPath });
                  }}
                />
              </Show>
            </NavAccount>
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
      <Layout
        height="fill"
        padding={0}
        footer={
          <VStack gap={0} style={{ position: "relative" }}>
            <MuseDock key={viewerId ?? "guest"} viewerId={viewerId} />
            <SiteFooter />
          </VStack>
        }
      >
        {children}
      </Layout>
    </AppShell>
  );
}
