"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Code } from "@astryxdesign/core/Code";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { KeyIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { ModalConnectionSummary } from "@/lib/modal/connection";
import {
  chooseModalEnvironment,
  connectModalToken,
  disconnectModal,
  loadModalEnvironments,
} from "../modal-actions";

const MODAL_TOKENS_URL = "https://modal.com/settings/tokens";
const MODAL_SANDBOX_DOCS_URL = "https://modal.com/docs/guide/sandboxes";
const MODAL_PRICING_URL = "https://modal.com/pricing";

export function ModalSettings({ connection }: { connection: ModalConnectionSummary | null }) {
  const router = useRouter();
  const [isChangingEnvironment, setIsChangingEnvironment] = useState(false);
  // Environments come back with the token check, so the picker need not ask again.
  const [knownEnvironments, setKnownEnvironments] = useState<string[] | null>(null);

  if (!connection) {
    return (
      <ModalConnectForm
        onConnected={(environments) => {
          setKnownEnvironments(environments);
          router.refresh();
        }}
      />
    );
  }

  if (isChangingEnvironment) {
    return (
      <VStack gap={4}>
        <ConnectedAccount connection={connection} />
        <EnvironmentPicker
          current={connection.environment}
          preloaded={knownEnvironments}
          onSaved={() => {
            setIsChangingEnvironment(false);
            router.refresh();
          }}
          onCancel={() => setIsChangingEnvironment(false)}
        />
      </VStack>
    );
  }

  return (
    <VStack gap={4}>
      <ConnectedAccount connection={connection} />
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={0}>
            <Text>
              {connection.environment} / {connection.appName}
            </Text>
            <Text type="supporting">
              Sandboxes are created in this environment, under an app WeStride creates on first
              use. Modal bills the workspace.
            </Text>
          </VStack>
        </StackItem>
        <Button label="Change environment" variant="secondary" onClick={() => setIsChangingEnvironment(true)} />
      </HStack>
    </VStack>
  );
}

function ConnectedAccount({ connection }: { connection: ModalConnectionSummary }) {
  return (
    <HStack gap={3} vAlign="center" wrap="wrap">
      <StackItem size="fill">
        <VStack gap={0}>
          <Text>
            Token <Code size="inherit">{connection.tokenLabel}</Code>
          </Text>
          <Text type="supporting">
            An API token you pasted. Connected <Timestamp value={connection.connectedAt} format="date" />.
          </Text>
        </VStack>
      </StackItem>
      <Button label="Disconnect" clickAction={() => disconnectModal()} />
    </HStack>
  );
}

// ---------------------------------------------------------------------------
// Step 1: paste a token
// ---------------------------------------------------------------------------

function ModalConnectForm({ onConnected }: { onConnected: (environments: string[]) => void }) {
  const [tokenId, setTokenId] = useState("");
  const [tokenSecret, setTokenSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, startVerifying] = useTransition();

  function connect() {
    const id = tokenId.trim();
    const secret = tokenSecret.trim();
    if (!id || !secret) {
      setError("Paste both the token ID and the token secret.");
      return;
    }
    setError(null);
    startVerifying(async () => {
      const result = await connectModalToken({ tokenId: id, tokenSecret: secret });
      if (result.status !== "connected") {
        setError(result.message);
        return;
      }
      setTokenId("");
      setTokenSecret("");
      onConnected(result.environments);
    });
  }

  return (
    <VStack gap={4}>
      <Card padding={6}>
        <VStack gap={4}>
          <Icon icon={KeyIcon} size="lg" color="accent" />
          <VStack gap={1}>
            <Heading level={3}>Paste an API token</Heading>
            <Text type="supporting">
              Create a token in your Modal workspace (Settings → API Tokens → New token). Modal
              shows the secret once; copy both halves here. The token is bound to the workspace
              that will pay for sandboxes.
            </Text>
          </VStack>
          <TextInput
            label="Token ID"
            value={tokenId}
            onChange={(value) => {
              setTokenId(value);
              setError(null);
            }}
            placeholder="ak-…"
            startIcon={LockClosedIcon}
            autoComplete="off"
          />
          <TextInput
            label="Token secret"
            value={tokenSecret}
            onChange={(value) => {
              setTokenSecret(value);
              setError(null);
            }}
            onEnter={connect}
            placeholder="as-…"
            type="password"
            startIcon={LockClosedIcon}
            status={error ? { type: "error", message: error } : undefined}
          />
          <HStack gap={3} vAlign="center" wrap="wrap">
            <Button label="Use this token" variant="primary" isLoading={isVerifying} onClick={connect} />
            <Link href={MODAL_TOKENS_URL} target="_blank" isStandalone>
              Open Modal tokens
            </Link>
          </HStack>
        </VStack>
      </Card>

      <Text type="supporting">
        Sandbox time is billed to your Modal workspace at{" "}
        <Link href={MODAL_PRICING_URL} target="_blank">
          Modal&apos;s rates
        </Link>
        ; Modal&apos;s free tier covers a good amount of it. Sandboxes run as{" "}
        <Link href={MODAL_SANDBOX_DOCS_URL} target="_blank">
          Modal Sandboxes
        </Link>{" "}
        in the environment you choose after connecting.
      </Text>
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// Step 2: choose the environment
// ---------------------------------------------------------------------------

type EnvironmentState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; environments: string[] };

function EnvironmentPicker({
  current,
  preloaded,
  onSaved,
  onCancel,
}: {
  current: string;
  /** Environments already fetched when the token was checked, if this session did that. */
  preloaded: string[] | null;
  onSaved: (connection: ModalConnectionSummary) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<EnvironmentState>(
    preloaded ? { phase: "ready", environments: preloaded } : { phase: "loading" },
  );
  const [environment, setEnvironment] = useState(current);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  async function load() {
    const result = await loadModalEnvironments();
    if (result.status !== "ok") {
      setState({ phase: "error", message: result.message });
      return;
    }
    setState({ phase: "ready", environments: result.environments });
  }

  useEffect(() => {
    if (!preloaded) {
      void load();
    }
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save() {
    setSaveError(null);
    if (!environment) {
      setSaveError("Choose an environment.");
      return;
    }
    startSaving(async () => {
      const result = await chooseModalEnvironment(environment);
      if (result.status !== "ok") {
        setSaveError(result.message);
        return;
      }
      onSaved(result.connection);
    });
  }

  if (state.phase === "loading") {
    return <Spinner size="sm" label="Reading your Modal environments…" />;
  }
  if (state.phase === "error") {
    return (
      <VStack gap={3}>
        <Banner status="error" title="Modal could not be read" description={state.message} />
        <HStack gap={2}>
          <Button
            label="Try again"
            variant="secondary"
            onClick={() => {
              setState({ phase: "loading" });
              void load();
            }}
          />
          <Button label="Cancel" variant="ghost" onClick={onCancel} />
        </HStack>
      </VStack>
    );
  }

  return (
    <Card padding={6}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={3}>Change where sandboxes run</Heading>
          <Text type="supporting">
            Environments keep a workspace&apos;s apps apart. Sandboxes are created under a
            WeStride app in the one you choose; billing is per workspace either way.
          </Text>
        </VStack>
        {state.environments.length === 0 ? (
          <Banner
            status="warning"
            title="No environments found"
            description="This token cannot see any environment in its workspace. Check the token's permissions on Modal."
          />
        ) : null}
        <Selector
          label="Environment"
          placeholder="Choose an environment"
          options={state.environments.map((name) => ({ value: name, label: name }))}
          value={environment || undefined}
          onChange={(value) => setEnvironment(value)}
          isDisabled={state.environments.length === 0}
        />
        {saveError ? <Banner status="error" title={saveError} /> : null}
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Button
            label="Save"
            variant="primary"
            isLoading={isSaving}
            isDisabled={!environment || environment === current}
            onClick={save}
          />
          <Button label="Cancel" variant="ghost" isDisabled={isSaving} onClick={onCancel} />
        </HStack>
      </VStack>
    </Card>
  );
}
