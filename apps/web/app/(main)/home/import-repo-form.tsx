"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
import { signInPath } from "@/lib/auth-paths";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import { ideaPath } from "@/lib/ideas/filters";
import { importGithubProject } from "../ideas/claim-actions";

/** The home page reads this back into `ImportResume` after sign-in or GitHub. */
const IMPORT_PARAM = "import";

/** The link someone was importing before they left to sign in or connect GitHub. */
export type ImportResume = {
  url: string;
  /** The `github` outcome the GitHub callback reports, if they went there. */
  githubOutcome: string | null;
};

type Notice =
  | { status: "error"; title: string }
  | { status: "info" | "success"; title: string; description?: string }
  | { status: "sign-in"; url: string; repoVisibility: "public" | "hidden" | null }
  | {
      status: "github";
      url: string;
      reason: "needs-connection" | "needs-access";
      message: string;
    };

function resumePath(url: string): string {
  return `/?${IMPORT_PARAM}=${encodeURIComponent(url)}`;
}

function signInHref(url: string): string {
  return `${signInPath}?redirect_url=${encodeURIComponent(resumePath(url))}`;
}

function githubHref(url: string, reason: "needs-connection" | "needs-access"): string {
  const intent = reason === "needs-access" ? "intent=install&" : "";
  return `/integrations/github/connect?${intent}returnTo=${encodeURIComponent(resumePath(url))}`;
}

function resumeNotice(githubOutcome: string | null): Notice | null {
  switch (githubOutcome) {
    case null:
      return null;
    case "connected":
      return { status: "success", title: "GitHub is connected. Import the repository when you are ready." };
    case "requested":
      return {
        status: "info",
        title: "An organization owner has to approve WeStride first.",
        description: "GitHub asked them for you. Import the repository once they approve it.",
      };
    case "denied":
      return { status: "error", title: "GitHub was not connected. Connect it to import a private repository." };
    default:
      return { status: "error", title: "GitHub could not be connected. Try again." };
  }
}

/**
 * One field: paste a GitHub repository and WeStride creates an idea and a
 * project for it. A public repository is imported for anyone to claim, and
 * its maintainers become founder on the spot. A private one takes a WeStride
 * account with GitHub connected, and stays private to the importer's team.
 */
export function ImportRepoForm({ resume }: { resume: ImportResume | null }) {
  const router = useRouter();
  const [url, setUrl] = useState(resume?.url ?? "");
  const [notice, setNotice] = useState<Notice | null>(() =>
    resumeNotice(resume?.githubOutcome ?? null),
  );
  const [isImporting, startImporting] = useTransition();

  function submit() {
    const trimmed = url.trim();
    if (!trimmed) {
      setNotice({
        status: "error",
        title: "Paste a GitHub repository link first.",
      });
      return;
    }
    if (!parseGithubRepoRef(trimmed)) {
      setNotice({
        status: "error",
        title:
          "Use a GitHub repository link, like https://github.com/owner/repo.",
      });
      return;
    }
    setNotice(null);
    startImporting(async () => {
      const result = await importGithubProject(trimmed);
      switch (result.status) {
        case "created":
          setNotice({
            status: "info",
            title: result.isPrivate
              ? "Imported as a private idea and project. Only your team can see them."
              : result.claimed
                ? "Imported. You are its founder: GitHub confirmed you maintain it."
                : "Imported. Taking you to the idea, where its maintainers can claim it.",
          });
          router.push(ideaPath(result.ideaId));
          return;
        case "exists":
          setNotice({
            status: "info",
            title: "That repository is already on WeStride. Taking you there.",
          });
          router.push(ideaPath(result.ideaId));
          return;
        case "needs-sign-in":
          setNotice({ status: "sign-in", url: trimmed, repoVisibility: result.repoVisibility });
          return;
        case "needs-github":
          setNotice({
            status: "github",
            url: trimmed,
            reason: result.reason,
            message: result.message,
          });
          return;
        case "error":
          setNotice({ status: "error", title: result.message });
          return;
      }
    });
  }

  return (
    <VStack gap={3} width="100%">
      <HStack gap={2} vAlign="end" wrap="wrap">
        <StackItem size="fill">
          <TextInput
            label="GitHub repository link"
            isLabelHidden
            size="lg"
            value={url}
            onChange={(value) => {
              setUrl(value);
              if (notice?.status !== "info") {
                setNotice(null);
              }
            }}
            onEnter={submit}
            placeholder="https://github.com/owner/repo"
            startIcon={CodeBracketIcon}
            autoComplete="off"
            hasClear
            isDisabled={isImporting}
          />
        </StackItem>
        <Button
          label="Import project"
          variant="primary"
          size="lg"
          isLoading={isImporting}
          onClick={submit}
        />
      </HStack>
      {notice ? <ImportNotice notice={notice} /> : <></>}
    </VStack>
  );
}

function ImportNotice({ notice }: { notice: Notice }) {
  switch (notice.status) {
    case "sign-in":
      return notice.repoVisibility === "hidden" ? (
        <Banner
          status="info"
          title="This repository is private, or it does not exist"
          description={
            <Text type="inherit">
              Importing a private repository takes a WeStride account with your
              GitHub connected, so GitHub can confirm you have access.{" "}
              <Link href={signInHref(notice.url)}>Sign in or create a free account</Link>,
              then connect GitHub when WeStride asks.
            </Text>
          }
        />
      ) : (
        <Banner
          status="info"
          title="Sign in to import"
          description={
            <Text type="inherit">
              Importing takes a WeStride account, so the idea has a record of
              who brought it in.{" "}
              <Link href={signInHref(notice.url)}>Sign in or create a free account</Link>,
              and you will come back here to finish.
            </Text>
          }
        />
      );
    case "github":
      return (
        <VStack gap={2}>
          <Banner status="info" title={notice.message} />
          <HStack gap={2} wrap="wrap">
            <Button
              label={
                notice.reason === "needs-access"
                  ? "Install WeStride on GitHub"
                  : "Connect GitHub"
              }
              variant="primary"
              icon={<Icon icon={CodeBracketIcon} color="inherit" />}
              href={githubHref(notice.url, notice.reason)}
            />
          </HStack>
        </VStack>
      );
    case "error":
      return <Banner status="error" title={notice.title} />;
    default:
      return (
        <Banner
          status={notice.status}
          title={notice.title}
          description={notice.description}
        />
      );
  }
}
