"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ComputerDesktopIcon } from "@heroicons/react/24/outline";
import { INSTALL_PS1_PATH, INSTALL_SH_PATH } from "@westride/runner-protocol";
import { createPairingCodeAction } from "../support-actions";

type Code = { code: string; expiresAt: string };

export function LinkDeviceButton({ initialCode }: { initialCode: Code | null }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        label="Link a computer"
        variant="primary"
        icon={<Icon icon={ComputerDesktopIcon} />}
        onClick={() => setIsOpen(true)}
      />
      {isOpen ? <LinkDeviceDialog isOpen={isOpen} onOpenChange={setIsOpen} initialCode={initialCode} /> : null}
    </>
  );
}

function LinkDeviceDialog({
  isOpen,
  onOpenChange,
  initialCode,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialCode: Code | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState<Code | null>(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://westride.org");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const expired = code ? new Date(code.expiresAt).getTime() < Date.now() : true;

  useEffect(() => {
    if (!isOpen || (code && !expired)) {
      return;
    }
    startTransition(async () => {
      const result = await createPairingCodeAction();
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setCode({ code: result.code.code, expiresAt: result.code.expiresAt.toISOString() });
    });
    // Only when the dialog opens without a live code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const pairing = code && !expired ? code.code : "XXXX-XXXX";
  const shell = `curl -fsSL ${origin}${INSTALL_SH_PATH} | sh -s -- --code ${pairing}`;
  const powershell = `& ([scriptblock]::Create((irm ${origin}${INSTALL_PS1_PATH}))) -Code ${pairing}`;

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="info" width={720}>
      <Layout
        header={<DialogHeader title="Link a computer" hasDivider onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={5}>
              {error ? <Banner status="error" title={error} /> : null}
              <Text>
                The WeStride runner is a small Docker container that picks up agent jobs for ideas you have pledged
                compute to. It needs <Link href="https://docs.docker.com/get-docker/" isExternalLink>Docker</Link>{" "}
                installed and running. For jobs with no API key at all, also run{" "}
                <Link href="https://ollama.com" isExternalLink>Ollama</Link> with a model pulled.
              </Text>
              <VStack gap={2}>
                <Heading level={2} accessibilityLevel={3}>
                  1. Your pairing code
                </Heading>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <Text type="display-3" weight="bold">
                    {isPending && !code ? "……" : pairing}
                  </Text>
                  <StackItem size="fill">
                    <Text type="supporting">
                      {code && !expired
                        ? `Works once, for 15 minutes (until ${new Date(code.expiresAt).toLocaleTimeString()}).`
                        : "Getting a code…"}
                    </Text>
                  </StackItem>
                  <Button
                    label="New code"
                    variant="ghost"
                    size="sm"
                    isLoading={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await createPairingCodeAction();
                        if (result.status === "error") {
                          setError(result.message);
                          return;
                        }
                        setError(null);
                        setCode({ code: result.code.code, expiresAt: result.code.expiresAt.toISOString() });
                      })
                    }
                  />
                </HStack>
              </VStack>
              <VStack gap={2}>
                <Heading level={2} accessibilityLevel={3}>
                  2. Run the installer on that computer
                </Heading>
                <Text type="supporting">macOS or Linux (Terminal):</Text>
                <CodeBlock code={shell} language="bash" width="100%" isWrapped />
                <Text type="supporting">Windows (PowerShell):</Text>
                <CodeBlock code={powershell} language="powershell" width="100%" isWrapped />
                <Text type="supporting">
                  The script checks for Docker, asks for a name for the computer, pairs it, and starts the runner so
                  it comes back after a restart. To stop it: <Text type="code">docker rm -f westride-runner</Text>.
                </Text>
              </VStack>
              <VStack gap={2}>
                <Heading level={2} accessibilityLevel={3}>
                  What the runner can and cannot do
                </Heading>
                <Text type="supporting">
                  It only clones public repositories of ideas you pledged to, runs Muse Code in a container with no
                  access to your files, and sends the changed files back to WeStride. It never receives GitHub access
                  and WeStride never sees your API keys: a Meta key you add to the runner stays on your computer.
                </Text>
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <StackItem size="fill" />
              <Button
                label="Done"
                variant="primary"
                onClick={() => {
                  onOpenChange(false);
                  router.refresh();
                }}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
