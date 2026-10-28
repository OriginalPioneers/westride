"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Code } from "@astryxdesign/core/Code";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  ArrowTopRightOnSquareIcon,
  KeyIcon,
  LockClosedIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { keyLabel, type MuseCredential } from "@/lib/idea-factory/credentials";
import {
  pollMetaConnect,
  startMetaConnect,
  verifyMuseKey,
  type ConnectStart,
} from "./actions";

const META_DASHBOARD_URL = "https://dev.meta.ai/";

type DeviceState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "waiting"; start: ConnectStart; intervalSeconds: number }
  | { phase: "error"; message: string };

export function ConnectPanel({
  canConnectMetaAccount,
  onConnected,
}: {
  canConnectMetaAccount: boolean;
  onConnected: (credential: MuseCredential) => void;
}) {
  const [device, setDevice] = useState<DeviceState>({ phase: "idle" });
  const [apiKey, setApiKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isVerifying, startVerifying] = useTransition();
  const onConnectedRef = useRef(onConnected);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  // Poll Meta until the member approves in the other tab, or the code dies.
  useEffect(() => {
    if (device.phase !== "waiting") {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + device.start.expiresInSeconds * 1000;
    let interval = Math.max(1, device.intervalSeconds);

    const tick = async () => {
      if (cancelled) {
        return;
      }
      if (Date.now() >= deadline) {
        setDevice({ phase: "error", message: "The sign-in code expired. Start again." });
        return;
      }
      const result = await pollMetaConnect(device.start.deviceCode);
      if (cancelled) {
        return;
      }
      switch (result.status) {
        case "authorized":
          onConnectedRef.current(result.credential);
          return;
        case "slow_down":
          interval = Math.max(interval + 5, result.intervalSeconds);
          break;
        case "pending":
          break;
        case "denied":
          setDevice({ phase: "error", message: "Meta sign-in was declined." });
          return;
        case "expired":
          setDevice({ phase: "error", message: "The sign-in code expired. Start again." });
          return;
        case "error":
          setDevice({ phase: "error", message: result.message });
          return;
      }
      timer = setTimeout(() => void tick(), interval * 1000);
    };

    timer = setTimeout(() => void tick(), interval * 1000);
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [device]);

  async function beginDeviceFlow() {
    setDevice({ phase: "starting" });
    const result = await startMetaConnect();
    if (result.status !== "ok") {
      setDevice({ phase: "error", message: result.message });
      return;
    }
    setDevice({
      phase: "waiting",
      start: result.start,
      intervalSeconds: result.start.intervalSeconds,
    });
    window.open(result.start.verificationUri, "_blank", "noopener,noreferrer");
  }

  function saveKey() {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setKeyError("Paste your Meta Model API key.");
      return;
    }
    setKeyError(null);
    startVerifying(async () => {
      const result = await verifyMuseKey(trimmed);
      if (result.status !== "ok") {
        setKeyError(result.message);
        return;
      }
      onConnected({
        kind: "api-key",
        apiKey: trimmed,
        identityToken: null,
        expiresAt: null,
        label: keyLabel(trimmed),
        connectedAt: Date.now(),
      });
    });
  }

  return (
    <VStack gap={6} maxWidth={880}>
      <VStack gap={2}>
        <Heading level={2}>Bring your own Muse</Heading>
        <Text>
          The advisory team runs on Meta&apos;s Muse models through your own
          Meta Model API account, so you pay Meta directly and can see every
          request and what it cost. WeStride never stores your key: it stays in
          this browser and travels with each request.
        </Text>
      </VStack>

      <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
        {canConnectMetaAccount ? (
          <Card padding={6} height="100%">
            <VStack gap={4}>
              <Icon icon={UserCircleIcon} size="lg" color="accent" />
              <VStack gap={1}>
                <Heading level={3}>Connect your Meta account</Heading>
                <Text type="supporting">
                  Sign in on Meta&apos;s site and approve this device. Meta issues
                  a key that renews itself daily. Recommended.
                </Text>
              </VStack>

              {device.phase === "waiting" ? (
                <VStack gap={3}>
                  <Text>
                    Enter this code on Meta&apos;s page, then approve the sign-in.
                  </Text>
                  <Text type="display-3" weight="semibold">
                    {device.start.userCode}
                  </Text>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Button
                      label="Open Meta sign-in"
                      href={device.start.verificationUri}
                      target="_blank"
                      icon={<Icon icon={ArrowTopRightOnSquareIcon} />}
                      variant="secondary"
                    />
                    <Spinner size="sm" label="Waiting for approval…" />
                  </HStack>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onClick={() => setDevice({ phase: "idle" })}
                  />
                </VStack>
              ) : (
                <VStack gap={3}>
                  {device.phase === "error" ? (
                    <Banner status="error" title={device.message} />
                  ) : null}
                  <Button
                    label="Connect Meta account"
                    variant="primary"
                    isLoading={device.phase === "starting"}
                    onClick={() => void beginDeviceFlow()}
                  />
                </VStack>
              )}
            </VStack>
          </Card>
        ) : null}

        <Card padding={6} height="100%">
          <VStack gap={4}>
            <Icon icon={KeyIcon} size="lg" color="accent" />
            <VStack gap={1}>
              <Heading level={3}>
                {canConnectMetaAccount ? "Or paste an API key" : "Paste an API key"}
              </Heading>
              <Text type="supporting">
                Create a key in the Meta Model API dashboard (API keys → Create
                API key). It starts with <Code size="inherit">LLM_</Code>.
              </Text>
            </VStack>
            <TextInput
              label="Meta Model API key"
              value={apiKey}
              onChange={(value) => {
                setApiKey(value);
                setKeyError(null);
              }}
              onEnter={saveKey}
              placeholder="LLM_…"
              type="password"
              startIcon={LockClosedIcon}
              status={keyError ? { type: "error", message: keyError } : undefined}
            />
            <HStack gap={3} vAlign="center" wrap="wrap">
              <Button
                label="Use this key"
                variant={canConnectMetaAccount ? "secondary" : "primary"}
                isLoading={isVerifying}
                onClick={saveKey}
              />
              <Link href={META_DASHBOARD_URL} target="_blank" isStandalone>
                Open the Meta dashboard
              </Link>
            </HStack>
          </VStack>
        </Card>
      </Grid>

      <Text type="supporting">
        Pay-as-you-go pricing applies to your Meta account. Rate limits and
        billing are managed by Meta; a monthly spend alert can be set in the
        Meta dashboard under Billing.
      </Text>
    </VStack>
  );
}
