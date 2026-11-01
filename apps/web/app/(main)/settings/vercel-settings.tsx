"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Code } from "@astryxdesign/core/Code";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import {
  ArrowTopRightOnSquareIcon,
  KeyIcon,
  LockClosedIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import type { VercelProject, VercelTeam } from "@/lib/vercel/api";
import type { VercelConnectionSummary } from "@/lib/vercel/connection";
import {
  chooseVercelScope,
  connectVercelToken,
  disconnectVercel,
  loadVercelScopeOptions,
  pollVercelConnect,
  startVercelConnect,
  type VercelConnectStart,
} from "../vercel-actions";

const VERCEL_TOKENS_URL = "https://vercel.com/account/settings/tokens";
const VERCEL_SANDBOX_DOCS_URL = "https://vercel.com/docs/vercel-sandbox";
const DEFAULT_PROJECT_NAME = "westride-muse-code";
const NEW_PROJECT = "__new__";

export function VercelSettings({
  connection,
  canSignIn,
}: {
  connection: VercelConnectionSummary | null;
  canSignIn: boolean;
}) {
  const router = useRouter();
  const [isChangingScope, setIsChangingScope] = useState(false);

  if (!connection) {
    return <VercelConnectOptions canSignIn={canSignIn} onConnected={() => router.refresh()} />;
  }

  if (!connection.scope || isChangingScope) {
    return (
      <VStack gap={4}>
        <ConnectedAccount connection={connection} />
        <ScopePicker
          current={connection.scope}
          onSaved={() => {
            setIsChangingScope(false);
            router.refresh();
          }}
          onCancel={connection.scope ? () => setIsChangingScope(false) : undefined}
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
              {connection.scope.teamName} / {connection.scope.projectName}
            </Text>
            <Text type="supporting">
              Sandboxes are created in this project and billed to this team.
            </Text>
          </VStack>
        </StackItem>
        <Button label="Change team or project" variant="secondary" onClick={() => setIsChangingScope(true)} />
      </HStack>
    </VStack>
  );
}

function ConnectedAccount({ connection }: { connection: VercelConnectionSummary }) {
  return (
    <HStack gap={3} vAlign="center" wrap="wrap">
      <StackItem size="fill">
        <VStack gap={0}>
          <Text>{connection.username}</Text>
          <Text type="supporting">
            {connection.kind === "VERCEL_ACCOUNT"
              ? "Signed in with Vercel. WeStride renews the sign-in as needed."
              : "An access token you pasted."}{" "}
            Connected <Timestamp value={connection.connectedAt} format="date" />.
          </Text>
        </VStack>
      </StackItem>
      <Button label="Disconnect" clickAction={() => disconnectVercel()} />
    </HStack>
  );
}

// ---------------------------------------------------------------------------
// Step 1: get a token
// ---------------------------------------------------------------------------

type DeviceState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "waiting"; start: VercelConnectStart; intervalSeconds: number }
  | { phase: "error"; message: string };

/** The two ways to connect Vercel: sign in on Vercel's site, or paste an access token. */
function VercelConnectOptions({
  canSignIn,
  onConnected,
}: {
  canSignIn: boolean;
  onConnected: (connection: VercelConnectionSummary) => void;
}) {
  const [device, setDevice] = useState<DeviceState>({ phase: "idle" });
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isVerifying, startVerifying] = useTransition();
  const onConnectedRef = useRef(onConnected);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  // Poll Vercel until the member approves in the other tab, or the code dies.
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
      const result = await pollVercelConnect(device.start.deviceCode);
      if (cancelled) {
        return;
      }
      switch (result.status) {
        case "connected":
          onConnectedRef.current(result.connection);
          return;
        case "slow_down":
          interval = Math.max(interval + 5, result.intervalSeconds);
          break;
        case "pending":
          break;
        case "denied":
          setDevice({ phase: "error", message: "Vercel sign-in was declined." });
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
    const result = await startVercelConnect();
    if (result.status !== "ok") {
      setDevice({ phase: "error", message: result.message });
      return;
    }
    setDevice({ phase: "waiting", start: result.start, intervalSeconds: result.start.intervalSeconds });
    window.open(result.start.verificationUri, "_blank", "noopener,noreferrer");
  }

  function saveToken() {
    const trimmed = token.trim();
    if (!trimmed) {
      setTokenError("Paste your Vercel access token.");
      return;
    }
    setTokenError(null);
    startVerifying(async () => {
      const result = await connectVercelToken(trimmed);
      if (result.status !== "connected") {
        setTokenError(result.message);
        return;
      }
      setToken("");
      onConnected(result.connection);
    });
  }

  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
        {canSignIn ? (
          <Card padding={6} height="100%">
            <VStack gap={4}>
              <Icon icon={UserCircleIcon} size="lg" color="accent" />
              <VStack gap={1}>
                <Heading level={3}>Sign in with Vercel</Heading>
                <Text type="supporting">
                  Approve WeStride on Vercel&apos;s site. Vercel issues a sign-in that WeStride
                  renews for you. Recommended.
                </Text>
              </VStack>

              {device.phase === "waiting" ? (
                <VStack gap={3}>
                  <Text>Check that Vercel shows this code, then approve the sign-in.</Text>
                  <Text type="display-3" weight="semibold">
                    {device.start.userCode}
                  </Text>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Button
                      label="Open Vercel sign-in"
                      href={device.start.verificationUri}
                      target="_blank"
                      icon={<Icon icon={ArrowTopRightOnSquareIcon} />}
                      variant="secondary"
                    />
                    <Spinner size="sm" label="Waiting for approval…" />
                  </HStack>
                  <Button label="Cancel" variant="ghost" onClick={() => setDevice({ phase: "idle" })} />
                </VStack>
              ) : (
                <VStack gap={3}>
                  {device.phase === "error" ? <Banner status="error" title={device.message} /> : null}
                  <Button
                    label="Sign in with Vercel"
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
              <Heading level={3}>{canSignIn ? "Or paste an access token" : "Paste an access token"}</Heading>
              <Text type="supporting">
                Create a token in your Vercel account settings (Tokens → Create). Give it access to
                the team that should pay for sandboxes.
              </Text>
            </VStack>
            <TextInput
              label="Vercel access token"
              value={token}
              onChange={(value) => {
                setToken(value);
                setTokenError(null);
              }}
              onEnter={saveToken}
              placeholder="Paste the token"
              type="password"
              startIcon={LockClosedIcon}
              status={tokenError ? { type: "error", message: tokenError } : undefined}
            />
            <HStack gap={3} vAlign="center" wrap="wrap">
              <Button
                label="Use this token"
                variant={canSignIn ? "secondary" : "primary"}
                isLoading={isVerifying}
                onClick={saveToken}
              />
              <Link href={VERCEL_TOKENS_URL} target="_blank" isStandalone>
                Open Vercel tokens
              </Link>
            </HStack>
          </VStack>
        </Card>
      </Grid>

      <Text type="supporting">
        Sandbox usage is billed to your Vercel team under its plan&apos;s{" "}
        <Link href={VERCEL_SANDBOX_DOCS_URL} target="_blank">
          Sandbox limits
        </Link>
        . After connecting, you choose which team and project the sandboxes run in.
      </Text>
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// Step 2: choose where sandboxes run
// ---------------------------------------------------------------------------

type ScopeState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; teams: VercelTeam[]; projects: VercelProject[]; isLoadingProjects: boolean };

function teamLabel(team: VercelTeam): string {
  return team.plan ? `${team.name} (${team.plan})` : team.name;
}

function ScopePicker({
  current,
  onSaved,
  onCancel,
}: {
  current: VercelConnectionSummary["scope"];
  onSaved: (connection: VercelConnectionSummary) => void;
  onCancel?: () => void;
}) {
  const [state, setState] = useState<ScopeState>({ phase: "loading" });
  const [teamId, setTeamId] = useState<string>(current?.teamId ?? "");
  const [projectId, setProjectId] = useState<string>(current?.projectId ?? "");
  const [newProjectName, setNewProjectName] = useState(DEFAULT_PROJECT_NAME);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  async function load(nextTeamId: string | null) {
    const result = await loadVercelScopeOptions(nextTeamId);
    if (result.status !== "ok") {
      setState({ phase: "error", message: result.message });
      return;
    }
    const { teams, projects } = result.options;
    const resolvedTeam = result.options.teamId ?? "";
    setTeamId(resolvedTeam);
    setState({ phase: "ready", teams, projects, isLoadingProjects: false });
    // Keep the current project if it is still there; otherwise prefer the
    // project WeStride would create, and fall back to creating it.
    setProjectId((previous) => {
      if (previous && projects.some((project) => project.id === previous)) {
        return previous;
      }
      return projects.find((project) => project.name === DEFAULT_PROJECT_NAME)?.id ?? NEW_PROJECT;
    });
  }

  useEffect(() => {
    void load(current?.teamId ?? null);
    // Only on mount: later loads are driven by the team selector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeTeam(nextTeamId: string) {
    if (!nextTeamId || nextTeamId === teamId) {
      return;
    }
    setTeamId(nextTeamId);
    setProjectId("");
    setState((previous) =>
      previous.phase === "ready" ? { ...previous, projects: [], isLoadingProjects: true } : previous,
    );
    void load(nextTeamId);
  }

  function save() {
    setSaveError(null);
    if (!teamId) {
      setSaveError("Choose a team.");
      return;
    }
    if (!projectId) {
      setSaveError("Choose a project.");
      return;
    }
    startSaving(async () => {
      const result = await chooseVercelScope(
        projectId === NEW_PROJECT
          ? { teamId, newProjectName: newProjectName.trim() }
          : { teamId, projectId },
      );
      if (result.status !== "ok") {
        setSaveError(result.message);
        return;
      }
      onSaved(result.connection);
    });
  }

  if (state.phase === "loading") {
    return <Spinner size="sm" label="Reading your Vercel teams…" />;
  }
  if (state.phase === "error") {
    return (
      <VStack gap={3}>
        <Banner status="error" title="Vercel could not be read" description={state.message} />
        <HStack gap={2}>
          <Button
            label="Try again"
            variant="secondary"
            onClick={() => {
              setState({ phase: "loading" });
              void load(teamId || null);
            }}
          />
        </HStack>
      </VStack>
    );
  }

  const projectOptions = [
    ...state.projects.map((project) => ({ value: project.id, label: project.name })),
    ...(state.projects.length > 0 ? [{ type: "divider" as const }] : []),
    {
      value: NEW_PROJECT,
      label: "Create a project for WeStride",
      description: "An empty project that only holds Muse Code sandboxes.",
    },
  ];

  return (
    <Card padding={6}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={3}>{current ? "Change where sandboxes run" : "Choose where sandboxes run"}</Heading>
          <Text type="supporting">
            Vercel bills sandbox time to the team. The project is only a home for them; it needs no
            code or deployments.
          </Text>
        </VStack>
        {state.teams.length === 0 ? (
          <Banner
            status="warning"
            title="No teams found"
            description="This token cannot see any Vercel team. Create one on Vercel, or paste a token with team access."
          />
        ) : null}
        <Selector
          label="Team"
          placeholder="Choose a team"
          options={state.teams.map((team) => ({ value: team.id, label: teamLabel(team), description: team.slug }))}
          value={teamId || undefined}
          onChange={changeTeam}
          isDisabled={state.teams.length === 0}
        />
        <Selector
          label="Project"
          placeholder={state.isLoadingProjects ? "Reading projects…" : "Choose a project"}
          options={projectOptions}
          value={projectId || undefined}
          onChange={(value) => setProjectId(value)}
          isDisabled={!teamId || state.isLoadingProjects}
          description={
            state.projects.length === 0 && teamId && !state.isLoadingProjects
              ? "This team has no projects yet, so WeStride will create one."
              : undefined
          }
        />
        {projectId === NEW_PROJECT ? (
          <TextInput
            label="New project name"
            description="Lowercase letters, digits, dots, underscores, and hyphens."
            value={newProjectName}
            onChange={setNewProjectName}
            placeholder={DEFAULT_PROJECT_NAME}
          />
        ) : null}
        {saveError ? <Banner status="error" title={saveError} /> : null}
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Button
            label={current ? "Save" : "Use this team and project"}
            variant="primary"
            isLoading={isSaving}
            isDisabled={!teamId || !projectId || state.isLoadingProjects}
            onClick={save}
          />
          {onCancel ? <Button label="Cancel" variant="ghost" isDisabled={isSaving} onClick={onCancel} /> : null}
        </HStack>
        <Text type="supporting">
          Not every plan allows sandboxes. If Vercel refuses the first run, check{" "}
          <Code size="inherit">Sandbox</Code> is enabled for the team in its Vercel dashboard.
        </Text>
      </VStack>
    </Card>
  );
}
