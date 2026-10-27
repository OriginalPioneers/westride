import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

export function ColorSwatch({
  name,
  token,
  detail,
  fill,
}: {
  name: string;
  token: string;
  detail: string;
  fill?: string;
}) {
  return (
    <VStack gap={2}>
      <Card
        height={96}
        padding={0}
        style={{ background: fill ?? `var(${token})` }}
      />
      <VStack gap={1}>
        <Text type="label">{name}</Text>
        <Text type="code">{detail}</Text>
        <Text type="supporting">{token}</Text>
      </VStack>
    </VStack>
  );
}
