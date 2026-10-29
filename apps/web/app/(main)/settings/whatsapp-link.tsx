"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { Icon } from "@astryxdesign/core/Icon";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { startWhatsAppLink, type WhatsAppLinkStart } from "./actions";

const POLL_MS = 4_000;

/**
 * WhatsApp has no sign-in to send members through, so they message WeStride
 * a one-time code from their phone. This page refreshes until it arrives.
 */
export function WhatsAppLink({
  pending,
  displayNumber,
}: {
  pending: WhatsAppLinkStart | null;
  displayNumber: string;
}) {
  const router = useRouter();
  const [link, setLink] = useState<WhatsAppLinkStart | null>(pending);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!link) {
      return;
    }
    const expiresAt = Date.parse(link.expiresAt);
    const timer = setInterval(() => {
      if (Date.now() >= expiresAt) {
        clearInterval(timer);
        setLink(null);
        setError("That code expired. Get a new one.");
        return;
      }
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [link, router]);

  async function start() {
    setError(null);
    const result = await startWhatsAppLink();
    if (result.status !== "ok") {
      setError(result.message);
      return;
    }
    setLink(result.link);
    window.open(result.link.url, "_blank", "noopener,noreferrer");
  }

  if (!link) {
    return (
      <VStack gap={3}>
        {error ? <Banner status="warning" title={error} /> : null}
        <HStack>
          <Button label="Connect WhatsApp" variant="primary" clickAction={start} />
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack gap={3}>
      <Text>
        Send this message to WeStride at {displayNumber} from the phone you want
        to link:
      </Text>
      <Text type="large" weight="semibold">
        <Code size="inherit">{`link ${link.code}`}</Code>
      </Text>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <Button
          label="Open WhatsApp"
          href={link.url}
          target="_blank"
          icon={<Icon icon={ArrowTopRightOnSquareIcon} />}
        />
        <Spinner size="sm" label="Waiting for your message…" />
      </HStack>
      <Text type="supporting">The code works for 15 minutes.</Text>
    </VStack>
  );
}
