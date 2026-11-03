"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { PlusIcon } from "@heroicons/react/24/outline";
import { formatCount, formatMicros } from "@/lib/format";
import { issueCodeAction, setCodeActiveAction } from "../actions";

/** YYYY-MM-DD, as DateInput hands it over. */
type ISODateString = NonNullable<Parameters<NonNullable<React.ComponentProps<typeof DateInput>["onChange"]>>[0]>;

export type CodeRow = {
  id: string;
  code: string;
  amountMicros: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  isActive: boolean;
  isExpired: boolean;
  isExhausted: boolean;
  note: string;
  createdAt: string;
};

const DIALOG_WIDTH = 460;

function CodeState({ row }: { row: CodeRow }) {
  if (!row.isActive) {
    return <Badge variant="neutral" label="Off" />;
  }
  if (row.isExpired) {
    return <Badge variant="warning" label="Expired" />;
  }
  if (row.isExhausted) {
    return <Badge variant="warning" label="Used up" />;
  }
  return <Badge variant="success" label="Active" />;
}

function ActiveSwitch({ row }: { row: CodeRow }) {
  const router = useRouter();
  const [value, setValue] = useState(row.isActive);
  const [error, setError] = useState<string | null>(null);
  return (
    <Switch
      label={`${row.code} is on`}
      isLabelHidden
      size="sm"
      value={value}
      changeAction={async (next) => {
        setError(null);
        setValue(next);
        const result = await setCodeActiveAction({ code: row.code, isActive: next });
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

export function CodesTable({ rows }: { rows: CodeRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No codes yet"
        description="Issue one for an event, a program, or a partner. Members redeem it on their WeStride Cloud page."
      />
    );
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
          key: "code",
          header: "Code",
          width: proportional(2, { minWidth: 170 }),
          renderCell: (row) => (
            <VStack gap={0}>
              <Text type="code">{row.code}</Text>
              {row.note ? (
                <Text type="supporting" maxLines={1}>
                  {row.note}
                </Text>
              ) : null}
            </VStack>
          ),
        },
        {
          key: "amountMicros",
          header: "Adds",
          width: pixel(80),
          align: "end",
          renderCell: (row) => <Text weight="medium">{formatMicros(row.amountMicros)}</Text>,
        },
        {
          key: "redemptionCount",
          header: "Redeemed",
          width: pixel(90),
          align: "end",
          renderCell: (row) => (
            <Text type="supporting">
              {formatCount(row.redemptionCount)}
              {row.maxRedemptions !== null ? ` of ${formatCount(row.maxRedemptions)}` : ""}
            </Text>
          ),
        },
        {
          key: "expiresAt",
          header: "Expires",
          width: pixel(110),
          renderCell: (row) =>
            row.expiresAt ? <Timestamp value={row.expiresAt} format="date" /> : <Text type="supporting">Never</Text>,
        },
        {
          key: "state",
          header: "State",
          width: pixel(90),
          renderCell: (row) => <CodeState row={row} />,
        },
        {
          key: "createdAt",
          header: "Issued",
          width: pixel(110),
          renderCell: (row) => <Timestamp value={row.createdAt} format="auto" />,
        },
        {
          key: "isActive",
          header: "On",
          width: pixel(60),
          align: "end",
          renderCell: (row) => <ActiveSwitch row={row} />,
        },
      ]}
    />
  );
}

function IssueCodeDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresOn, setExpiresOn] = useState<ISODateString | undefined>(undefined);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ code: string; amountMicros: number } | null>(null);

  function reset() {
    setCode("");
    setAmount("");
    setMaxRedemptions("");
    setExpiresOn(undefined);
    setNote("");
    setError(null);
    setIssued(null);
  }

  function close() {
    onOpenChange(false);
    reset();
  }

  function submit() {
    const amountDollars = Number(amount.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
      setError("Enter the amount in dollars each redemption adds.");
      return;
    }
    const limit = maxRedemptions.trim() === "" ? null : Number(maxRedemptions);
    if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
      setError("The redemption limit is a whole number, or blank for no limit.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await issueCodeAction({
        code,
        amountDollars,
        maxRedemptions: limit,
        // The last moment of the chosen day, in the admin's time zone.
        expiresAt: expiresOn ? new Date(`${expiresOn}T23:59:59`).toISOString() : null,
        note,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setIssued({ code: result.code.code, amountMicros: result.code.amountMicros });
      router.refresh();
    });
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => (open ? onOpenChange(true) : close())} purpose="form" width={DIALOG_WIDTH}>
      <Layout
        header={<DialogHeader title="Issue a redemption code" hasDivider onOpenChange={(open) => (open ? onOpenChange(true) : close())} />}
        content={
          <LayoutContent>
            {issued ? (
              <VStack gap={4}>
                <Banner
                  status="success"
                  title={`${issued.code} is ready`}
                  description={`Each member who redeems it gets ${formatMicros(issued.amountMicros)}. Copy it now; it is also in the list.`}
                />
                <Text type="code" size="xl">
                  {issued.code}
                </Text>
              </VStack>
            ) : (
              <FormLayout>
                <TextInput
                  label="Amount each redemption adds"
                  value={amount}
                  onChange={(value) => {
                    setAmount(value);
                    setError(null);
                  }}
                  placeholder="25.00"
                  description="In US dollars."
                  hasAutoFocus
                  isDisabled={isPending}
                />
                <TextInput
                  label="Code"
                  isOptional
                  value={code}
                  onChange={(value) => {
                    setCode(value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="Leave blank to generate one"
                  description="Letters, digits, and dashes. Members type it in, so keep it short."
                  isDisabled={isPending}
                />
                <TextInput
                  label="Redemption limit"
                  isOptional
                  value={maxRedemptions}
                  onChange={(value) => {
                    setMaxRedemptions(value.replace(/\D/g, ""));
                    setError(null);
                  }}
                  placeholder="No limit"
                  description="How many different members may redeem it."
                  isDisabled={isPending}
                />
                <DateInput
                  label="Expires on"
                  isOptional
                  value={expiresOn}
                  onChange={(value) => {
                    setExpiresOn(value);
                    setError(null);
                  }}
                  description="The code stops working at the end of that day."
                  isDisabled={isPending}
                />
                <TextInput
                  label="Note"
                  isOptional
                  value={note}
                  onChange={setNote}
                  placeholder="Hackathon judges, spring 2026"
                  description="Why it exists. Members never see this."
                  isDisabled={isPending}
                  onEnter={submit}
                />
                {error ? <Banner status="error" title={error} /> : null}
              </FormLayout>
            )}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              {issued ? (
                <>
                  <Button label="Issue another" variant="secondary" onClick={reset} />
                  <StackItem size="fill" />
                  <Button label="Done" variant="primary" onClick={close} />
                </>
              ) : (
                <>
                  <Button label="Cancel" variant="secondary" isDisabled={isPending} onClick={close} />
                  <StackItem size="fill" />
                  <Button label="Issue code" variant="primary" isLoading={isPending} onClick={submit} />
                </>
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

export function IssueCodeButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button label="Issue code" variant="primary" icon={<Icon icon={PlusIcon} />} onClick={() => setIsOpen(true)} />
      <IssueCodeDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
