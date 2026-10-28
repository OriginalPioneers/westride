import { Code } from "@astryxdesign/core/Code";
import { proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";
import type { SchemaField } from "./openapi";

export function SchemaTable({ fields }: { fields: SchemaField[] }) {
  return (
    <Table
      data={fields}
      idKey="name"
      density="compact"
      verticalAlign="top"
      columns={[
        {
          key: "name",
          header: "Field",
          width: proportional(2, { minWidth: 160 }),
          renderCell: (field) => <Code>{field.name}</Code>,
        },
        {
          key: "type",
          header: "Type",
          width: proportional(2, { minWidth: 120 }),
          renderCell: (field) => (
            <VStack gap={0.5}>
              <Text type="code" size="sm">
                {field.type}
              </Text>
              {field.isRequired ? null : (
                <Text type="supporting" size="sm">
                  optional
                </Text>
              )}
            </VStack>
          ),
        },
        {
          key: "description",
          header: "Description",
          width: proportional(3, { minWidth: 160 }),
          renderCell: (field) =>
            field.description ? (
              <Text size="sm">{field.description}</Text>
            ) : (
              <Text type="supporting" size="sm">
                —
              </Text>
            ),
        },
      ]}
    />
  );
}
