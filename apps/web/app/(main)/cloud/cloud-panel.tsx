"use client";

import { useState, useTransition } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { CloudLedgerKind, CloudProviderPreference } from "@westride/db";
import type { CloudAvailability } from "@/lib/cloud/config";
import {
  formatUsd,
  MAX_TOP_UP_MICROS,
  MIN_BALANCE_FOR_AI_MICROS,
  MIN_BALANCE_FOR_COMPUTE_MICROS,
  MIN_TOP_UP_MICROS,
  microsToDollars,
  TOP_UP_PRESETS_USD,
} from "@/lib/cloud/pricing";
import { chooseProvider, redeemCloudCode, startTopUp } from "./actions";

export type LedgerRow = {
  id: string;
  kind: CloudLedgerKind;
  amountMicros: number;
  description: string | null;
  model: string | null;
  createdAt: string;
};

type Totals = { creditedMicros: number; aiSpentMicros: number; computeSpentMicros: number };

const PRESETS = new Set<number>(TOP_UP_PRESETS_USD);

const KIND_LABELS: Record<CloudLedgerKind, string> = {
  TOP_UP: "Funds added",
  CODE: "Code redeemed",
  AI_USAGE: "Meta AI",
  COMPUTE_USAGE: "Compute",
  ADJUSTMENT: "Adjustment",
};

function money(micros: number, digits = 2) {
  return formatUsd(microsToDollars(micros), digits);
}

/** Small charges need more than cents to be legible. */
function signedMoney(micros: number) {
  const abs = Math.abs(micros);
  const digits = abs > 0 && abs < 10_000 ? 4 : 2;
  return `${micros < 0 ? "−" : "+"}${money(abs, digits)}`;
}

export function CloudPanel({
  balanceMicros,
  preference,
  availability,
  totals,
  rows,
}: {
  balanceMicros: number;
  preference: CloudProviderPreference;
  availability: CloudAvailability;
  totals: Totals;
  rows: LedgerRow[];
}) {
  const cloudOffered = availability.ai || availability.compute;
  return (
    <VStack gap={8}>
      {!cloudOffered ? (
        <Banner
          status="info"
          title="WeStride Cloud is not switched on for this server"
          description="You can still add funds and redeem codes; they are used once it is."
        />
      ) : null}

      <BalanceSummary balanceMicros={balanceMicros} totals={totals} availability={availability} />

      <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
        <TopUpCard enabled={availability.payments} />
        <RedeemCard />
      </Grid>

      <ProviderChoice preference={preference} availability={availability} />

      <VStack gap={3}>
        <Heading level={2}>Activity</Heading>
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing yet"
            description="Funds you add, codes you redeem, and the Muse calls and sandboxes WeStride Cloud runs for you show here."
          />
        ) : (
          <Table
            data={rows}
            idKey="id"
            columns={[
              {
                key: "createdAt",
                header: "When",
                width: proportional(1),
                renderCell: (row) => <Timestamp value={row.createdAt} format="auto" />,
              },
              {
                key: "kind",
                header: "What",
                width: proportional(3),
                renderCell: (row) => (
                  <VStack gap={0}>
                    <Text>{row.description ?? KIND_LABELS[row.kind]}</Text>
                    {row.description ? (
                      <Text type="supporting">
                        {KIND_LABELS[row.kind]}
                        {row.model ? ` · ${row.model}` : ""}
                      </Text>
                    ) : null}
                  </VStack>
                ),
              },
              {
                key: "amountMicros",
                header: "Amount",
                width: proportional(1),
                align: "end",
                renderCell: (row) => (
                  <Text color={row.amountMicros < 0 ? "primary" : "accent"} weight="medium">
                    {signedMoney(row.amountMicros)}
                  </Text>
                ),
              },
            ]}
          />
        )}
      </VStack>
    </VStack>
  );
}

function BalanceSummary({
  balanceMicros,
  totals,
  availability,
}: {
  balanceMicros: number;
  totals: Totals;
  availability: CloudAvailability;
}) {
  const lowForAi = availability.ai && balanceMicros < MIN_BALANCE_FOR_AI_MICROS;
  const lowForCompute = availability.compute && balanceMicros < MIN_BALANCE_FOR_COMPUTE_MICROS;
  return (
    <Card padding={6}>
      <Grid columns={{ minWidth: 180, max: 4 }} gap={6}>
        <VStack gap={1}>
          <Text type="supporting">Balance</Text>
          <Text type="display-2" weight="semibold">
            {money(balanceMicros)}
          </Text>
          {lowForAi ? (
            <Badge variant="warning" label="Too low to run Muse" />
          ) : lowForCompute ? (
            <Badge variant="warning" label="Too low to start a sandbox" />
          ) : null}
        </VStack>
        <VStack gap={1}>
          <Text type="supporting">Added so far</Text>
          <Text type="large" weight="medium">
            {money(totals.creditedMicros)}
          </Text>
        </VStack>
        <VStack gap={1}>
          <Text type="supporting">Spent on Meta AI</Text>
          <Text type="large" weight="medium">
            {money(totals.aiSpentMicros)}
          </Text>
        </VStack>
        <VStack gap={1}>
          <Text type="supporting">Spent on compute</Text>
          <Text type="large" weight="medium">
            {money(totals.computeSpentMicros)}
          </Text>
        </VStack>
      </Grid>
    </Card>
  );
}

function TopUpCard({ enabled }: { enabled: boolean }) {
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const min = microsToDollars(MIN_TOP_UP_MICROS);
  const max = microsToDollars(MAX_TOP_UP_MICROS);

  function pay(amount: number) {
    setError(null);
    setPendingAmount(amount);
    startTransition(async () => {
      const result = await startTopUp(amount);
      // A successful call redirects to Stripe and never returns here.
      if (result && result.status === "error") {
        setError(result.message);
        setPendingAmount(null);
      }
    });
  }

  function payCustom() {
    const amount = Number(custom.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount in dollars.");
      return;
    }
    if (amount < min || amount > max) {
      setError(`Add between ${formatUsd(min, 0)} and ${formatUsd(max, 0)} at a time.`);
      return;
    }
    pay(Math.round(amount * 100) / 100);
  }

  return (
    <Card padding={6} height="100%">
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={3}>Add funds</Heading>
          <Text type="supporting">
            Paid by card through Stripe. Funds never expire and are only spent on work you start.
          </Text>
        </VStack>
        {!enabled ? (
          <Text type="supporting">Card payments are not set up on this WeStride server yet.</Text>
        ) : (
          <>
            <HStack gap={2} wrap="wrap">
              {TOP_UP_PRESETS_USD.map((amount) => (
                <Button
                  key={amount}
                  label={formatUsd(amount, 0)}
                  variant="secondary"
                  isLoading={isPending && pendingAmount === amount}
                  isDisabled={isPending && pendingAmount !== amount}
                  onClick={() => pay(amount)}
                />
              ))}
            </HStack>
            <HStack gap={2} vAlign="end" wrap="wrap">
              <StackItem size="fill">
                <TextInput
                  label="Another amount"
                  value={custom}
                  onChange={(value) => {
                    setCustom(value);
                    setError(null);
                  }}
                  onEnter={payCustom}
                  placeholder={`${formatUsd(min, 0)} to ${formatUsd(max, 0)}`}
                  isDisabled={isPending}
                />
              </StackItem>
              <Button
                label="Continue to Stripe"
                variant="primary"
                isLoading={isPending && pendingAmount !== null && !PRESETS.has(pendingAmount)}
                isDisabled={isPending || custom.trim() === ""}
                onClick={payCustom}
              />
            </HStack>
          </>
        )}
        {error ? <Banner status="error" title={error} /> : null}
      </VStack>
    </Card>
  );
}

function RedeemCard() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function redeem() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter the code you were given.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await redeemCloudCode(trimmed);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setCode("");
      setSuccess(`${money(result.amountMicros)} added to your balance.`);
    });
  }

  return (
    <Card padding={6} height="100%">
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={3}>Redeem a code</Heading>
          <Text type="supporting">
            Codes from WeStride events, programs, and partners add funds to your balance.
          </Text>
        </VStack>
        <TextInput
          label="Code"
          value={code}
          onChange={(value) => {
            setCode(value.toUpperCase());
            setError(null);
          }}
          onEnter={redeem}
          placeholder="WESTRIDE-XXXX-XXXX"
          isDisabled={isPending}
          status={error ? { type: "error", message: error } : undefined}
        />
        <HStack>
          <Button
            label="Redeem"
            variant="primary"
            isLoading={isPending}
            isDisabled={code.trim() === ""}
            onClick={redeem}
          />
        </HStack>
        {success ? <Banner status="success" title={success} isDismissable /> : null}
      </VStack>
    </Card>
  );
}

function ProviderChoice({
  preference,
  availability,
}: {
  preference: CloudProviderPreference;
  availability: CloudAvailability;
}) {
  const [value, setValue] = useState<CloudProviderPreference>(preference);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function change(next: string) {
    const choice = next === "WESTRIDE_CLOUD" ? "WESTRIDE_CLOUD" : "OWN";
    const previous = value;
    setValue(choice);
    setError(null);
    startTransition(async () => {
      const result = await chooseProvider(choice);
      if (result.status === "error") {
        setValue(previous);
        setError(result.message);
      }
    });
  }

  return (
    <Card padding={6}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={3}>Which provider to use first</Heading>
          <Text type="supporting">
            Muse and sandboxes use this provider when both are available. If it cannot run the work
            (no account connected, or no balance), WeStride falls back to the other.
          </Text>
        </VStack>
        <SegmentedControl
          label="Preferred provider"
          value={value}
          onChange={change}
          isDisabled={isPending || !(availability.ai || availability.compute)}
          disabledMessage={
            availability.ai || availability.compute ? undefined : "WeStride Cloud is not offered here."
          }
        >
          <SegmentedControlItem value="OWN" label="My own accounts" />
          <SegmentedControlItem value="WESTRIDE_CLOUD" label="WeStride Cloud" />
        </SegmentedControl>
        <Text type="supporting">
          {value === "OWN"
            ? "Your connected Meta and Vercel or Modal accounts are used, and you pay them directly. WeStride is free this way."
            : "Meta models and sandboxes run on WeStride's accounts and are charged to your balance at the rates on the pricing page."}{" "}
          <Link href="/pricing">See pricing</Link>
          {" · "}
          <Link href="/settings">Manage connections</Link>
        </Text>
        {error ? <Banner status="error" title={error} /> : null}
      </VStack>
    </Card>
  );
}
