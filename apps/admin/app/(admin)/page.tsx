import type { Metadata } from "next";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { getAdminOverview, listRecentContent } from "@westride/db/admin";
import { countUsers } from "@/lib/clerk-users";
import { formatCount, formatMicros } from "@/lib/format";
import { ADMIN_PATHS } from "@/lib/paths";
import { PageFrame } from "./page-frame";
import { RecentContentTable } from "./recent-content-table";

export const metadata: Metadata = { title: "Overview" };

export const dynamic = "force-dynamic";

function Tile({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <Card padding={5} height="100%">
      <VStack gap={1}>
        <HStack gap={2} vAlign="center">
          <StackItem size="fill">
            <Text type="supporting">{label}</Text>
          </StackItem>
          <Link href={href} size="sm">
            View
          </Link>
        </HStack>
        <Text type="display-3" weight="semibold">
          {value}
        </Text>
        <Text type="supporting">{detail}</Text>
      </VStack>
    </Card>
  );
}

export default async function OverviewPage() {
  const [overview, recent, userCount] = await Promise.all([
    getAdminOverview(),
    listRecentContent(12),
    countUsers().catch(() => null),
  ]);

  return (
    <PageFrame title="Overview" description="Where WeStride stands right now, across members, studios, and WeStride Cloud.">
      <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
        <Tile
          label="Users"
          value={userCount === null ? "—" : formatCount(userCount)}
          detail={userCount === null ? "Clerk did not answer" : "accounts in Clerk"}
          href={ADMIN_PATHS.users}
        />
        <Tile
          label="Ideas"
          value={formatCount(overview.ideas.total)}
          detail={`${formatCount(overview.ideas.public)} public · ${formatCount(overview.ideas.featured)} featured`}
          href={ADMIN_PATHS.ideas}
        />
        <Tile
          label="Builds"
          value={formatCount(overview.projects.total)}
          detail={`${formatCount(overview.projects.public)} public · ${formatCount(overview.projects.featured)} featured`}
          href={ADMIN_PATHS.projects}
        />
        <Tile
          label="Agents"
          value={formatCount(overview.agents.total)}
          detail={`${formatCount(overview.agents.active)} active · ${formatCount(overview.agents.featured)} featured`}
          href={ADMIN_PATHS.agents}
        />
        <Tile
          label="Supporter pledges"
          value={formatCount(overview.pledges.total)}
          detail={`${formatCount(overview.pledges.active)} active`}
          href={ADMIN_PATHS.pledges}
        />
        <Tile
          label="Devices"
          value={formatCount(overview.devices.total)}
          detail={`${formatCount(overview.devices.active)} linked · ${formatCount(overview.devices.online)} online now`}
          href={ADMIN_PATHS.devices}
        />
        <Tile
          label="Redemption codes"
          value={formatCount(overview.codes.total)}
          detail={`${formatCount(overview.codes.active)} active · ${formatCount(overview.codes.redemptions)} redemptions`}
          href={ADMIN_PATHS.codes}
        />
        <Tile
          label="Cloud balances"
          value={formatMicros(overview.cloud.balanceMicros)}
          detail={`${formatCount(overview.cloud.accounts)} members · ${formatMicros(overview.cloud.creditedMicros)} added · ${formatMicros(overview.cloud.spentMicros)} spent`}
          href={ADMIN_PATHS.users}
        />
      </Grid>

      <VStack gap={3}>
        <Heading level={2}>Newest in the studios</Heading>
        <RecentContentTable
          rows={recent.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
          }))}
        />
      </VStack>
    </PageFrame>
  );
}
