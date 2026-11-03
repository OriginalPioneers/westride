import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { Device } from "@westride/db";
import { getPendingPairingCode, isDeviceOnline, listDevicesForSupporter } from "@westride/db/devices";
import { DEVICES_PATH, PLEDGES_PATH } from "@/lib/account-paths";
import { isVolunteerRunnerConfigured } from "@/lib/build/agent/config";
import { deviceDetail } from "@/lib/support/describe";
import { AccountTabs } from "../../section-tabs";
import { DeviceActions } from "../../supporting/device-actions";
import { LinkDeviceButton } from "../../supporting/link-device-dialog";

export const metadata: Metadata = {
  title: "Devices",
};

const ADD_LABEL = "Add a device";

function DeviceStatus({ device }: { device: Device }) {
  const online = isDeviceOnline(device);
  const [variant, label] = !online
    ? (["neutral", "Offline"] as const)
    : device.currentJobId
      ? (["accent", "Working"] as const)
      : (["success", "Online"] as const);
  return (
    <VStack gap={0} hAlign="end">
      <HStack gap={2} vAlign="center">
        <StatusDot variant={variant} label={label} isPulsing={variant === "accent"} />
        <Text size="sm">{label}</Text>
      </HStack>
      {!online && device.lastSeenAt ? (
        <Text type="supporting" size="sm">
          Last seen <Timestamp value={device.lastSeenAt.toISOString()} format="auto" />
        </Text>
      ) : null}
    </VStack>
  );
}

export default async function DevicesPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: DEVICES_PATH });
  }
  const runnerConfigured = isVolunteerRunnerConfigured();
  const [devices, pendingCode] = await Promise.all([
    listDevicesForSupporter(userId),
    getPendingPairingCode(userId),
  ]);
  const initialCode = pendingCode
    ? { code: pendingCode.code, expiresAt: pendingCode.expiresAt.toISOString() }
    : null;
  const onlineCount = devices.filter((device) => isDeviceOnline(device)).length;

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
                  <Heading level={1}>Devices</Heading>
                  <Text type="supporting">
                    Computers running the WeStride runner. Each one takes agent jobs only for
                    ideas you have{" "}
                    <Link href={PLEDGES_PATH} type="inherit">
                      pledged compute
                    </Link>{" "}
                    to, and only when that idea&apos;s team has opted in.
                  </Text>
                </VStack>
              </StackItem>
              {runnerConfigured && devices.length > 0 ? (
                <LinkDeviceButton initialCode={initialCode} label={ADD_LABEL} />
              ) : null}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {!runnerConfigured ? (
            <EmptyState
              title="Devices are not set up here yet"
              description="This WeStride server does not accept supporter computers yet."
            />
          ) : devices.length === 0 ? (
            <EmptyState
              title="No devices yet"
              description="Add a computer with one command. Jobs run in an isolated container that never sees your files, and you can unlink it at any time."
              actions={<LinkDeviceButton initialCode={initialCode} label={ADD_LABEL} />}
            />
          ) : (
            <VStack gap={3}>
              <Text type="supporting">
                {onlineCount} of {devices.length} online
              </Text>
              <List hasDividers edge="flush">
                {devices.map((device) => (
                  <ListItem
                    key={device.id}
                    label={device.name}
                    description={deviceDetail(device)}
                    endContent={
                      <HStack gap={4} vAlign="center" wrap="wrap">
                        <DeviceStatus device={device} />
                        <DeviceActions deviceId={device.id} name={device.name} />
                      </HStack>
                    }
                  />
                ))}
              </List>
            </VStack>
          )}
        </LayoutContent>
      }
    />
  );
}
