import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { listDevicesForSupporter } from "@westride/db/devices";
import {
  listPledgesForSupporter,
  summarizeSupporter,
  type PledgeWithIdea,
} from "@westride/db/support";
import { DEVICES_PATH, PLEDGES_PATH } from "@/lib/account-paths";
import { ideaPath } from "@/lib/ideas/filters";
import {
  PLEDGE_STATUS_LABEL,
  PLEDGE_STATUS_VARIANT,
  pledgeDetail,
} from "@/lib/support/describe";
import { formatMicros, formatSeconds, supportingPath } from "@/lib/support/schema";
import { EntityImage } from "../../entity-image";
import { AccountTabs } from "../../section-tabs";
import { PledgeActions } from "../../supporting/pledge-actions";

export const metadata: Metadata = {
  title: "Pledges",
};

const FIND_IDEA_HREF = `${supportingPath()}#looking-for-support`;

function PledgeList({ pledges, showStatus }: { pledges: PledgeWithIdea[]; showStatus: boolean }) {
  return (
    <List hasDividers edge="flush">
      {pledges.map((pledge) => (
        <ListItem
          key={pledge.id}
          startContent={
            <EntityImage name={pledge.idea.name} imageUrl={pledge.idea.imageUrl} size={48} />
          }
          label={<Link href={ideaPath(pledge.idea.id)}>{pledge.idea.name}</Link>}
          description={`${pledge.kind === "TOKENS" ? "Tokens" : "Compute"} · ${pledgeDetail(pledge)}`}
          endContent={
            <HStack gap={4} vAlign="center" wrap="wrap">
              {showStatus ? (
                <HStack gap={2} vAlign="center">
                  <StatusDot
                    variant={PLEDGE_STATUS_VARIANT[pledge.status]}
                    label={PLEDGE_STATUS_LABEL[pledge.status]}
                  />
                  <Text size="sm">{PLEDGE_STATUS_LABEL[pledge.status]}</Text>
                </HStack>
              ) : null}
              <PledgeActions pledgeId={pledge.id} ideaId={pledge.ideaId} status={pledge.status} />
            </HStack>
          }
        />
      ))}
    </List>
  );
}

export default async function PledgesPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: PLEDGES_PATH });
  }
  const [pledges, totals, devices] = await Promise.all([
    listPledgesForSupporter(userId),
    summarizeSupporter(userId),
    listDevicesForSupporter(userId),
  ]);
  const current = pledges.filter((pledge) => pledge.status !== "REVOKED");
  const ended = pledges.filter((pledge) => pledge.status === "REVOKED");
  const computeWithoutDevice =
    devices.length === 0 &&
    current.some((pledge) => pledge.kind === "COMPUTE" && pledge.status === "ACTIVE");

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <AccountTabs />
            <HStack gap={4} vAlign="end" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={2}>
                  <Heading level={1}>Pledges</Heading>
                  <Text type="supporting">
                    Standing offers to the ideas you back: tokens from your Meta key, or compute
                    from your own computers. Pause or end any of them at any time.
                  </Text>
                </VStack>
              </StackItem>
              {pledges.length > 0 ? (
                <Button label="Find an idea" variant="secondary" href={FIND_IDEA_HREF} />
              ) : null}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {pledges.length === 0 ? (
            <EmptyState
              title="No pledges yet"
              description="Back an idea without joining its team. Pick one that is looking for support and choose what to give from its page."
              actions={<Button label="Find an idea" variant="primary" href={FIND_IDEA_HREF} />}
            />
          ) : (
            <VStack gap={8}>
              {computeWithoutDevice ? (
                <Banner
                  status="info"
                  title="Add a device to run your compute pledges"
                  description="Compute pledges run on computers you link to your account. Until you add one, they cannot take jobs."
                  endContent={<Button label="Go to Devices" size="sm" href={DEVICES_PATH} />}
                />
              ) : null}

              <MetadataList columns={4}>
                <MetadataListItem label="Ideas backed">{totals.ideas}</MetadataListItem>
                <MetadataListItem label="Tokens covered">
                  {formatMicros(totals.sponsoredMicros)}
                </MetadataListItem>
                <MetadataListItem label="Compute given">
                  {formatSeconds(totals.computeSeconds)}
                </MetadataListItem>
                <MetadataListItem label="Jobs made possible">{totals.jobs}</MetadataListItem>
              </MetadataList>

              <VStack gap={3}>
                <Heading level={2}>Current</Heading>
                {current.length === 0 ? (
                  <Text type="supporting">
                    None right now. Pledge again below, or find a new idea to back.
                  </Text>
                ) : (
                  <PledgeList pledges={current} showStatus />
                )}
              </VStack>

              {ended.length > 0 ? (
                <VStack gap={3}>
                  <VStack gap={1}>
                    <Heading level={2}>Ended</Heading>
                    <Text type="supporting">
                      Kept for the record. Pledge again to pick up where you left off.
                    </Text>
                  </VStack>
                  <PledgeList pledges={ended} showStatus={false} />
                </VStack>
              ) : null}
            </VStack>
          )}
        </LayoutContent>
      }
    />
  );
}
