"use client";

import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import {
  ComputerDesktopIcon,
  CpuChipIcon,
  HeartIcon,
  LightBulbIcon,
  Squares2X2Icon,
  TicketIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import {
  ComputerDesktopIcon as ComputerDesktopIconSolid,
  CpuChipIcon as CpuChipIconSolid,
  HeartIcon as HeartIconSolid,
  LightBulbIcon as LightBulbIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  TicketIcon as TicketIconSolid,
  UsersIcon as UsersIconSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverIconSolid,
} from "@heroicons/react/24/solid";
import { ADMIN_PATHS } from "@/lib/paths";
import { ThemeToggle } from "../theme-toggle";

type NavEntry = {
  label: string;
  href: string;
  icon: typeof UsersIcon;
  selectedIcon: typeof UsersIcon;
};

const PEOPLE: NavEntry[] = [
  { label: "Users", href: ADMIN_PATHS.users, icon: UsersIcon, selectedIcon: UsersIconSolid },
  { label: "Supporter pledges", href: ADMIN_PATHS.pledges, icon: HeartIcon, selectedIcon: HeartIconSolid },
  { label: "Devices", href: ADMIN_PATHS.devices, icon: ComputerDesktopIcon, selectedIcon: ComputerDesktopIconSolid },
];

const CONTENT: NavEntry[] = [
  { label: "Ideas", href: ADMIN_PATHS.ideas, icon: LightBulbIcon, selectedIcon: LightBulbIconSolid },
  { label: "Builds", href: ADMIN_PATHS.projects, icon: WrenchScrewdriverIcon, selectedIcon: WrenchScrewdriverIconSolid },
  { label: "Agents", href: ADMIN_PATHS.agents, icon: CpuChipIcon, selectedIcon: CpuChipIconSolid },
];

const CLOUD: NavEntry[] = [
  { label: "Redemption codes", href: ADMIN_PATHS.codes, icon: TicketIcon, selectedIcon: TicketIconSolid },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavItems({ entries, pathname }: { entries: NavEntry[]; pathname: string }) {
  return entries.map((entry) => (
    <SideNavItem
      key={entry.href}
      label={entry.label}
      href={entry.href}
      icon={entry.icon}
      selectedIcon={entry.selectedIcon}
      isSelected={isActive(pathname, entry.href)}
    />
  ));
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell
      variant="section"
      height="fill"
      contentPadding={0}
      sideNav={
        <SideNav
          aria-label="Admin"
          header={<SideNavHeading heading="WeStride" subheading="Admin" headingHref={ADMIN_PATHS.dashboard} />}
          collapsible
          footerIcons={
            <>
              <ThemeToggle />
              <UserButton />
            </>
          }
        >
          <SideNavItem
            label="Overview"
            href={ADMIN_PATHS.dashboard}
            icon={Squares2X2Icon}
            selectedIcon={Squares2X2IconSolid}
            isSelected={isActive(pathname, ADMIN_PATHS.dashboard)}
          />
          <SideNavSection title="Members">
            <NavItems entries={PEOPLE} pathname={pathname} />
          </SideNavSection>
          <SideNavSection title="Studios">
            <NavItems entries={CONTENT} pathname={pathname} />
          </SideNavSection>
          <SideNavSection title="WeStride Cloud">
            <NavItems entries={CLOUD} pathname={pathname} />
          </SideNavSection>
        </SideNav>
      }
    >
      {children}
    </AppShell>
  );
}
