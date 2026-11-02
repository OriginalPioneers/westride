import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { getCloudAvailability } from "@/lib/cloud/config";
import { formatUsd, microsToDollars } from "@/lib/cloud/pricing";
import { getCloudStatus } from "@/lib/cloud/provider";

/** Balance and provider at a glance; the Cloud page has the controls. */
export async function CloudSection({ userId }: { userId: string }) {
  const availability = getCloudAvailability();
  const status = await getCloudStatus(userId);
  const offered = availability.ai || availability.compute;
  const preferenceLabel =
    status.preference === "WESTRIDE_CLOUD" ? "WeStride Cloud first" : "Your own accounts first";

  return (
    <VStack gap={3}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={0}>
            <HStack gap={2} vAlign="center">
              <Text>{formatUsd(microsToDollars(status.balanceMicros))} balance</Text>
              {offered ? (
                <Badge
                  variant={status.canRunAi ? "success" : "neutral"}
                  label={status.canRunAi ? "Ready" : "Add funds to use"}
                />
              ) : (
                <Badge variant="neutral" label="Not offered here" />
              )}
            </HStack>
            <Text type="supporting">{preferenceLabel}</Text>
          </VStack>
        </StackItem>
        <Button label="Manage WeStride Cloud" variant="secondary" href="/cloud" />
        <Button label="Pricing" variant="ghost" href="/pricing" />
      </HStack>
    </VStack>
  );
}
