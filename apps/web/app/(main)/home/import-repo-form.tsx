"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
import { signInPath } from "@/lib/auth-paths";
import { parseGithubRepoRef } from "@/lib/github/repo-ref";
import { ideaPath } from "@/lib/ideas/filters";
import { importGithubProject } from "../ideas/claim-actions";

type Notice =
  | { status: "error"; title: string }
  | { status: "info"; title: string; description?: string }
  | { status: "sign-in" };

/**
 * One field: paste a public GitHub repository and WeStride creates an idea
 * and a project for it. Maintainers become founder on the spot; anyone else
 * leaves it unclaimed for its maintainers to pick up.
 */
export function ImportRepoForm({ isSignedIn }: { isSignedIn: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isImporting, startImporting] = useTransition();

  function submit() {
    const trimmed = url.trim();
    if (!trimmed) {
      setNotice({ status: "error", title: "Paste a GitHub repository link first." });
      return;
    }
    if (!parseGithubRepoRef(trimmed)) {
      setNotice({
        status: "error",
        title: "Use a GitHub repository link, like https://github.com/owner/repo.",
      });
      return;
    }
    if (!isSignedIn) {
      setNotice({ status: "sign-in" });
      return;
    }
    setNotice(null);
    startImporting(async () => {
      const result = await importGithubProject(trimmed);
      switch (result.status) {
        case "created":
          setNotice({
            status: "info",
            title: result.claimed
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
          setNotice({ status: "sign-in" });
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
              if (notice?.status === "error") {
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
      {notice?.status === "sign-in" ? (
        <Banner
          status="info"
          title="Sign in to import"
          description={
            <Text type="inherit">
              Importing takes a WeStride account, so the idea has a record of who
              brought it in.{" "}
              <Link href={signInPath}>Sign in or create a free account</Link>, then
              paste the link again.
            </Text>
          }
        />
      ) : notice ? (
        <Banner
          status={notice.status}
          title={notice.title}
          description={notice.status === "info" ? notice.description : undefined}
        />
      ) : (
        <Text type="supporting" size="sm">
          Public repositories only. WeStride reads the README to write the idea,
          links the repository to a Build Studio project, and leaves both
          unclaimed until a maintainer picks them up.
        </Text>
      )}
    </VStack>
  );
}
