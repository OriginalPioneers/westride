"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { CloudProviderPreference } from "@westride/db";
import type { AdminUserProfile } from "@/lib/clerk-users";
import { formatCount, formatMicros, formatSignedMicros } from "@/lib/format";
import { ADMIN_PATHS } from "@/lib/paths";
import { adjustBalanceAction, setAdminRoleAction } from "../../actions";
import { PageFrame } from "../../page-frame";

type Tone = { label: string; tone: "neutral" | "success" | "warning" | "info" };

/** One of the member's ideas, builds, agents, pledges, or devices, in a shape the section tables share. */
export type UserItemRow = {
  id: string;
  name: string;
  detail: string;
  status: Tone | null;
  isPublic: boolean;
  isFeatured: boolean;
  siteUrl: string | null;
  createdAt: string;
};

export type LedgerRow = {
  id: string;
  kind: string;
  amountMicros: number;
  description: string | null;
  model: string | null;
  createdAt: string;
};

export type UserDetailData = {
  profile: AdminUserProfile;
  /** The admin is looking at their own account. */
  isSelf: boolean;
  cloud: {
    hasAccount: boolean;
    balanceMicros: number;
    creditedMicros: number;
    aiSpentMicros: number;
    computeSpentMicros: number;
    providerPreference: CloudProviderPreference;
    ledger: LedgerRow[];
    redemptions: { code: string; amountMicros: number; createdAt: string }[];
  };
  ideas: UserItemRow[];
  projects: UserItemRow[];
  agents: UserItemRow[];
  pledges: UserItemRow[];
  devices: UserItemRow[];
  connections: { label: string; value: string | null }[];
};

const DIALOG_WIDTH = 440;

const PROVIDER_LABELS: Record<CloudProviderPreference, string> = {
  OWN: "Their own keys and accounts",
  WESTRIDE_CLOUD: "WeStride Cloud",
};

function ItemsTable({
  rows,
  nameHeader,
  emptyTitle,
  hasVisibility = true,
  hasFeatured = true,
  createdHeader = "Created",
}: {
  rows: UserItemRow[];
  nameHeader: string;
  emptyTitle: string;
  hasVisibility?: boolean;
  hasFeatured?: boolean;
  createdHeader?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} />;
  }
  return (
    <Table
      data={rows}
      idKey="id"
      density="compact"
      hasHover
      textOverflow="truncate"
      columns={[
        {
          key: "name",
          header: nameHeader,
          width: proportional(3, { minWidth: 200 }),
          renderCell: (row) => (
            <VStack gap={0}>
              {row.siteUrl ? (
                <Link href={row.siteUrl} isExternalLink newTabLabel="Opens on WeStride in a new tab">
                  {row.name}
                </Link>
              ) : (
                <Text weight="medium">{row.name}</Text>
              )}
              <Text type="supporting" maxLines={1}>
                {row.detail}
              </Text>
            </VStack>
          ),
        },
        {
          key: "status",
          header: "Status",
          width: pixel(110),
          renderCell: (row) => (row.status ? <Badge variant={row.status.tone} label={row.status.label} /> : null),
        },
        {
          key: "flags",
          header: hasVisibility ? "Visibility" : "",
          width: pixel(150),
          renderCell: (row) => (
            <Text type="supporting">
              {[hasVisibility ? (row.isPublic ? "Public" : "Private") : null, hasFeatured && row.isFeatured ? "Featured" : null]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ),
        },
        {
          key: "createdAt",
          header: createdHeader,
          width: pixel(140),
          renderCell: (row) => <Timestamp value={row.createdAt} format="auto" />,
        },
      ]}
    />
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <VStack gap={3}>
      <HStack gap={2} vAlign="center">
        <Heading level={2}>{title}</Heading>
        <Text type="supporting">{formatCount(count)}</Text>
      </HStack>
      {children}
    </VStack>
  );
}

function AdminRoleSwitch({ profile, isSelf }: { profile: AdminUserProfile; isSelf: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(profile.isAdmin);
  const [error, setError] = useState<string | null>(null);
  return (
    <Switch
      label="Admin of WeStride"
      description="Can open this portal, issue codes, feature content, and change roles."
      labelPosition="start"
      labelSpacing="spread"
      width="100%"
      value={value}
      isDisabled={isSelf}
      disabledMessage="Another admin has to change your own role."
      changeAction={async (next) => {
        setError(null);
        setValue(next);
        const result = await setAdminRoleAction({ clerkUserId: profile.clerkUserId, isAdmin: next });
        if (result.status === "error") {
          setValue(!next);
          setError(result.message);
          return;
        }
        router.refresh();
      }}
      status={error ? { type: "error", message: error } : undefined}
    />
  );
}

function AdjustBalanceDialog({
  profile,
  balanceMicros,
  isOpen,
  onOpenChange,
}: {
  profile: AdminUserProfile;
  balanceMicros: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    onOpenChange(false);
    setAmount("");
    setDescription("");
    setError(null);
  }

  function submit() {
    const amountDollars = Number(amount.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(amountDollars) || amountDollars === 0) {
      setError("Enter an amount in dollars. Negative charges the member.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await adjustBalanceAction({ clerkUserId: profile.clerkUserId, amountDollars, description });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      close();
      router.refresh();
    });
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => (open ? onOpenChange(true) : close())} purpose="form" width={DIALOG_WIDTH}>
      <Layout
        header={<DialogHeader title="Adjust WeStride Cloud balance" hasDivider onOpenChange={(open) => (open ? onOpenChange(true) : close())} />}
        content={
          <LayoutContent>
            <FormLayout>
              <Text type="supporting">
                {profile.name} has {formatMicros(balanceMicros)}. A positive amount credits them; a negative amount charges them. The
                entry shows in their ledger with your note.
              </Text>
              <TextInput
                label="Amount"
                value={amount}
                onChange={(value) => {
                  setAmount(value);
                  setError(null);
                }}
                placeholder="10.00 or -2.50"
                description="In US dollars."
                hasAutoFocus
                isDisabled={isPending}
              />
              <TextInput
                label="Reason"
                value={description}
                onChange={(value) => {
                  setDescription(value);
                  setError(null);
                }}
                placeholder="Refund for a failed sandbox"
                description="The member sees this."
                isDisabled={isPending}
                onEnter={submit}
              />
              {error ? <Banner status="error" title={error} /> : null}
            </FormLayout>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <Button label="Cancel" variant="secondary" isDisabled={isPending} onClick={close} />
              <StackItem size="fill" />
              <Button label="Apply" variant="primary" isLoading={isPending} onClick={submit} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

function CloudCard({ profile, cloud }: { profile: AdminUserProfile; cloud: UserDetailData["cloud"] }) {
  const [isAdjusting, setIsAdjusting] = useState(false);
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <StackItem size="fill">
            <Heading level={2}>WeStride Cloud</Heading>
          </StackItem>
          <Button label="Adjust balance" variant="secondary" size="sm" onClick={() => setIsAdjusting(true)} />
        </HStack>
        <Grid columns={{ minWidth: 160, max: 4 }} gap={4}>
          <VStack gap={0}>
            <Text type="supporting">Balance</Text>
            <Text type="display-3" weight="semibold">
              {formatMicros(cloud.balanceMicros)}
            </Text>
          </VStack>
          <VStack gap={0}>
            <Text type="supporting">Added so far</Text>
            <Text type="large" weight="medium">
              {formatMicros(cloud.creditedMicros)}
            </Text>
          </VStack>
          <VStack gap={0}>
            <Text type="supporting">Spent on Meta AI</Text>
            <Text type="large" weight="medium">
              {formatMicros(cloud.aiSpentMicros)}
            </Text>
          </VStack>
          <VStack gap={0}>
            <Text type="supporting">Spent on compute</Text>
            <Text type="large" weight="medium">
              {formatMicros(cloud.computeSpentMicros)}
            </Text>
          </VStack>
        </Grid>
        <Text type="supporting">
          {cloud.hasAccount ? `Runs work on: ${PROVIDER_LABELS[cloud.providerPreference]}.` : "Has not opened their Cloud page yet."}
          {cloud.redemptions.length > 0
            ? ` Redeemed ${cloud.redemptions.map((redemption) => `${redemption.code} (${formatMicros(redemption.amountMicros)})`).join(", ")}.`
            : ""}
        </Text>
      </VStack>
      <AdjustBalanceDialog profile={profile} balanceMicros={cloud.balanceMicros} isOpen={isAdjusting} onOpenChange={setIsAdjusting} />
    </Card>
  );
}

function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No ledger entries" />;
  }
  return (
    <Table
      data={rows}
      idKey="id"
      density="compact"
      textOverflow="truncate"
      columns={[
        {
          key: "createdAt",
          header: "When",
          width: pixel(150),
          renderCell: (row) => <Timestamp value={row.createdAt} format="auto" />,
        },
        {
          key: "kind",
          header: "What",
          width: proportional(3, { minWidth: 220 }),
          renderCell: (row) => (
            <VStack gap={0}>
              <Text maxLines={1}>{row.description ?? row.kind}</Text>
              {row.description ? (
                <Text type="supporting" maxLines={1}>
                  {row.kind}
                  {row.model ? ` · ${row.model}` : ""}
                </Text>
              ) : null}
            </VStack>
          ),
        },
        {
          key: "amountMicros",
          header: "Amount",
          width: pixel(120),
          align: "end",
          renderCell: (row) => (
            <Text color={row.amountMicros < 0 ? "primary" : "accent"} weight="medium">
              {formatSignedMicros(row.amountMicros)}
            </Text>
          ),
        },
      ]}
    />
  );
}

export function UserDetail({ data }: { data: UserDetailData }) {
  const { profile } = data;
  const connected = data.connections.filter((connection) => connection.value !== null);

  return (
    <PageFrame
      title={profile.name}
      description={[profile.email, profile.username ? `@${profile.username}` : null, profile.clerkUserId].filter(Boolean).join(" · ")}
      actions={<Button label="All users" variant="ghost" href={ADMIN_PATHS.users} />}
    >
      <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
        <Card padding={5} height="100%">
          <VStack gap={4}>
            <HStack gap={4} vAlign="center">
              <Avatar name={profile.name} src={profile.imageUrl ?? undefined} size="lg" tooltip={false} />
              <VStack gap={1}>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Heading level={2}>{profile.name}</Heading>
                  {profile.isAdmin ? <Badge variant="info" label="Admin" /> : null}
                  {profile.isBanned ? <Badge variant="error" label="Banned" /> : null}
                  {profile.isLocked ? <Badge variant="warning" label="Locked" /> : null}
                </HStack>
                <Text type="supporting">
                  Joined <Timestamp value={profile.createdAt} format="date" type="inherit" color="inherit" />
                  {profile.lastActiveAt ? (
                    <>
                      {" · last active "}
                      <Timestamp value={profile.lastActiveAt} format="relative" type="inherit" color="inherit" />
                    </>
                  ) : null}
                </Text>
                <Text type="supporting">
                  {connected.length > 0
                    ? `Connected: ${connected.map((connection) => `${connection.label} ${connection.value}`).join(" · ")}`
                    : "No accounts connected."}
                </Text>
              </VStack>
            </HStack>
            <AdminRoleSwitch profile={profile} isSelf={data.isSelf} />
          </VStack>
        </Card>
        <CloudCard profile={profile} cloud={data.cloud} />
      </Grid>

      <Section title="Ideas" count={data.ideas.length}>
        <ItemsTable rows={data.ideas} nameHeader="Idea" emptyTitle="No ideas" />
      </Section>
      <Section title="Builds" count={data.projects.length}>
        <ItemsTable rows={data.projects} nameHeader="Build" emptyTitle="No builds" />
      </Section>
      <Section title="Agents" count={data.agents.length}>
        <ItemsTable rows={data.agents} nameHeader="Agent" emptyTitle="No agents" />
      </Section>
      <Section title="Supporter pledges" count={data.pledges.length}>
        <ItemsTable rows={data.pledges} nameHeader="Idea backed" emptyTitle="No pledges" hasFeatured={false} createdHeader="Pledged" />
      </Section>
      <Section title="Devices" count={data.devices.length}>
        <ItemsTable rows={data.devices} nameHeader="Computer" emptyTitle="No devices" hasVisibility={false} hasFeatured={false} createdHeader="Linked" />
      </Section>
      <Section title="Cloud ledger" count={data.cloud.ledger.length}>
        <LedgerTable rows={data.cloud.ledger} />
      </Section>
    </PageFrame>
  );
}
