"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { CheckCircleIcon, CloudIcon, ServerStackIcon } from "@heroicons/react/24/outline";
import { signUpPath } from "@/lib/auth-paths";
import {
  COMPUTE_MINIMUM_SECONDS,
  formatPerMillion,
  formatUsd,
  MAX_TOP_UP_MICROS,
  MIN_TOP_UP_MICROS,
  microsToDollars,
  type CloudModelPrice,
  type CloudRates,
} from "@/lib/cloud/pricing";
import { DocPage, DocSection } from "../doc-page";

const FREE_INCLUDES = [
  { label: "Every WeStride feature", detail: "Idea Factory, Build Studio, Agent Studio, the academy, MCP, and the API." },
  { label: "Muse on your Meta account", detail: "Connect Meta in Settings. Meta bills you at its list prices." },
  { label: "Sandboxes on your Vercel or Modal account", detail: "Connect either in Settings. Vercel bills your team, Modal your workspace, for sandbox time." },
  { label: "Volunteer devices", detail: "Supporters can run jobs for an idea on their own machines." },
];

const CLOUD_INCLUDES = [
  { label: "No Meta, Vercel, or Modal account needed", detail: "Add funds once; Muse and sandboxes run on WeStride's accounts." },
  { label: "Pay as you go", detail: "Charged per token and per second of compute, from your balance. Nothing monthly." },
  { label: "Switch any time", detail: "Choose which provider to use first. WeStride falls back to the other when one cannot run." },
  { label: "Codes and credits", detail: "Redeem codes from events and programs for funds on your account." },
];

/** The price without its unit; the table says "per million" once. */
function tokenPrice(perMillion: number) {
  return formatPerMillion(perMillion).replace(/ \/ 1M tokens$/, "");
}

function Includes({ items }: { items: { label: string; detail: string }[] }) {
  return (
    <List edge="flush" hasDividers>
      {items.map((item) => (
        <ListItem
          key={item.label}
          label={item.label}
          description={<Text type="supporting">{item.detail}</Text>}
        />
      ))}
    </List>
  );
}

export function PricingOverview({
  isSignedIn,
  cloudOffered,
  rates,
  models,
  imagePrice,
  transcriptionHourPrice,
}: {
  isSignedIn: boolean;
  cloudOffered: boolean;
  rates: CloudRates;
  models: CloudModelPrice[];
  imagePrice: number;
  transcriptionHourPrice: number;
}) {
  const vcpuHour = microsToDollars(rates.computeVcpuHourMicros);
  const cloudHref = isSignedIn ? "/cloud" : `${signUpPath}?redirect_url=${encodeURIComponent("/cloud")}`;
  const freeHref = isSignedIn ? "/settings" : signUpPath;

  const computeRows = [
    { id: "2", vcpus: 2, label: "Default sandbox · 2 vCPU, 4 GB", perHour: vcpuHour * 2, perMinute: (vcpuHour * 2) / 60 },
    { id: "4", vcpus: 4, label: "Larger sandbox · 4 vCPU, 8 GB", perHour: vcpuHour * 4, perMinute: (vcpuHour * 4) / 60 },
  ];

  return (
    <DocPage
      title="Pricing"
      lede="WeStride is open source and free to use. Pay only when you want WeStride to supply the AI and compute for you."
      hero={
        <Grid columns={{ minWidth: 300, max: 2 }} gap={4}>
          <Card padding={6} height="100%">
            <VStack gap={4}>
              <HStack gap={3} vAlign="center">
                <Icon icon={ServerStackIcon} size="lg" color="accent" />
                <VStack gap={0}>
                  <Heading level={2}>Bring your own</Heading>
                  <Text type="supporting">Your Meta AI account and your Vercel or Modal account</Text>
                </VStack>
              </HStack>
              <VStack gap={0}>
                <Text type="display-3" weight="semibold">
                  Free
                </Text>
                <Text type="supporting">Forever. You pay Meta and Vercel or Modal directly.</Text>
              </VStack>
              <Includes items={FREE_INCLUDES} />
              <HStack>
                <Button label={isSignedIn ? "Connect accounts" : "Get started"} variant="secondary" href={freeHref} />
              </HStack>
            </VStack>
          </Card>
          <Card padding={6} height="100%">
            <VStack gap={4}>
              <HStack gap={3} vAlign="center">
                <Icon icon={CloudIcon} size="lg" color="accent" />
                <VStack gap={0}>
                  <HStack gap={2} vAlign="center">
                    <Heading level={2}>WeStride Cloud</Heading>
                    {!cloudOffered ? <Badge variant="neutral" label="Coming soon" /> : null}
                  </HStack>
                  <Text type="supporting">WeStride&apos;s Meta AI and compute, on your balance</Text>
                </VStack>
              </HStack>
              <VStack gap={0}>
                <Text type="display-3" weight="semibold">
                  Pay as you go
                </Text>
                <Text type="supporting">
                  Top up from {formatUsd(microsToDollars(MIN_TOP_UP_MICROS), 0)}. No subscription.
                </Text>
              </VStack>
              <Includes items={CLOUD_INCLUDES} />
              <HStack>
                <Button label="Add funds" variant="primary" href={cloudHref} />
              </HStack>
            </VStack>
          </Card>
        </Grid>
      }
    >
      <DocSection id="ai-models" title="Meta AI models">
        <Text>
          WeStride Cloud prices are Meta&apos;s list prices plus {rates.aiMarkupPercent}%, which covers
          WeStride&apos;s accounts and payment costs. You choose the model for each piece of work, as you
          do with your own Meta account. Usage is charged to your balance when the work finishes.
        </Text>
        <Table
          data={models}
          idKey="id"
          columns={[
            {
              key: "label",
              header: "Model",
              width: proportional(3),
              renderCell: (row) => (
                <VStack gap={0.5}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Text weight="semibold">{row.label}</Text>
                    {row.isContributor ? <Badge variant="orange" label="Trains Meta's models" /> : null}
                  </HStack>
                  <Text type="supporting">{row.description}</Text>
                </VStack>
              ),
            },
            {
              key: "inputPerMillion",
              header: "Input",
              width: proportional(1.2),
              renderCell: (row) => <Text>{tokenPrice(row.inputPerMillion)}</Text>,
            },
            {
              key: "cachedInputPerMillion",
              header: "Cached input",
              width: proportional(1.2),
              renderCell: (row) => <Text>{tokenPrice(row.cachedInputPerMillion)}</Text>,
            },
            {
              key: "outputPerMillion",
              header: "Output",
              width: proportional(1.2),
              renderCell: (row) => <Text>{tokenPrice(row.outputPerMillion)}</Text>,
            },
          ]}
        />
        <Text type="supporting">Token prices are per million tokens.</Text>
        <List edge="flush" hasDividers>
          <ListItem
            label="Muse Image 1.0"
            description={<Text type="supporting">{formatUsd(imagePrice, 3)} per image.</Text>}
          />
          <ListItem
            label="Muse Voice Transcribe 1.0"
            description={
              <Text type="supporting">{formatUsd(transcriptionHourPrice, 2)} per hour of audio, billed by the second.</Text>
            }
          />
          <ListItem
            label="Web search"
            description={<Text type="supporting">Meta&apos;s per-query price plus the same markup, when Muse searches the web.</Text>}
          />
        </List>
      </DocSection>

      <DocSection id="compute" title="Cloud compute">
        <Text>
          Muse Code agents run in an isolated sandbox for each job. On WeStride Cloud the sandbox is
          billed at {formatUsd(vcpuHour, 2)} per vCPU-hour, counted by the second from start to finish
          with a {COMPUTE_MINIMUM_SECONDS}-second minimum. Each vCPU comes with 2 GB of memory. There
          is no charge for a sandbox that never started.
        </Text>
        <Table
          data={computeRows}
          idKey="id"
          columns={[
            { key: "label", header: "Sandbox", width: proportional(3) },
            {
              key: "perMinute",
              header: "Per minute",
              width: proportional(1),
              renderCell: (row) => <Text>{formatUsd(row.perMinute, 4)}</Text>,
            },
            {
              key: "perHour",
              header: "Per hour",
              width: proportional(1),
              renderCell: (row) => <Text>{formatUsd(row.perHour, 2)}</Text>,
            },
          ]}
        />
        <Text type="supporting">
          A typical agent job of ten minutes on the default sandbox costs about{" "}
          {formatUsd((vcpuHour * 2) / 6, 2)} of compute, plus the model tokens it uses.
        </Text>
      </DocSection>

      <DocSection id="funds" title="Funds, codes, and billing">
        <Grid columns={{ minWidth: 260, max: 3 }} gap={4}>
          <Card padding={5} height="100%">
            <VStack gap={2}>
              <Icon icon={CheckCircleIcon} size="md" color="accent" />
              <Heading level={3}>Add funds by card</Heading>
              <Text type="supporting">
                Top up between {formatUsd(microsToDollars(MIN_TOP_UP_MICROS), 0)} and{" "}
                {formatUsd(microsToDollars(MAX_TOP_UP_MICROS), 0)} at a time through Stripe. WeStride never
                sees your card.
              </Text>
            </VStack>
          </Card>
          <Card padding={5} height="100%">
            <VStack gap={2}>
              <Icon icon={CheckCircleIcon} size="md" color="accent" />
              <Heading level={3}>Funds never expire</Heading>
              <Text type="supporting">
                Your balance stays until you spend it. Every charge appears on your WeStride Cloud page
                with the model or sandbox it paid for.
              </Text>
            </VStack>
          </Card>
          <Card padding={5} height="100%">
            <VStack gap={2}>
              <Icon icon={CheckCircleIcon} size="md" color="accent" />
              <Heading level={3}>Redeem codes</Heading>
              <Text type="supporting">
                Hackathons, classes, and partners hand out codes that add funds to your account. Redeem
                them on your WeStride Cloud page.
              </Text>
            </VStack>
          </Card>
        </Grid>
      </DocSection>

      <DocSection id="faq" title="Questions">
        <List edge="flush" hasDividers>
          <ListItem
            label="Can I mix the two?"
            description={
              <Text type="supporting">
                Yes. Connect Meta but neither Vercel nor Modal, for instance, and Muse runs on your Meta
                account while sandboxes run on WeStride Cloud. You pick which provider to try first;
                WeStride uses the other when the first cannot run.
              </Text>
            }
          />
          <ListItem
            label="Who pays for a sponsored job?"
            description={
              <Text type="supporting">
                Supporters who pledge tokens to an idea pay for its jobs from their own account, through
                whichever provider they use.
              </Text>
            }
          />
          <ListItem
            label="Is my data used for training?"
            description={
              <Text type="supporting">
                Only on the Contributor model, which is marked above and is cheaper for that reason.
                The others follow Meta&apos;s standard API terms.
              </Text>
            }
          />
          <ListItem
            label="Is there a plan or subscription?"
            description={
              <Text type="supporting">
                No. WeStride is free; WeStride Cloud is a balance you draw down. Running your own copy of
                WeStride, which is{" "}
                <Link href="https://github.com/WeStrideOrg/westride" target="_blank">
                  open source
                </Link>
                , is free too.
              </Text>
            }
          />
        </List>
      </DocSection>
    </DocPage>
  );
}
