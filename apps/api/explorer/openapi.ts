export type SchemaObject = {
  $ref?: string;
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: unknown[];
  const?: unknown;
  example?: unknown;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  allOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  nullable?: boolean;
};

export type ParameterObject = {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  description?: string;
  required?: boolean;
  schema?: SchemaObject;
  example?: unknown;
};

export type MediaTypeObject = {
  schema?: SchemaObject;
  example?: unknown;
};

export type ResponseObject = {
  description: string;
  headers?: Record<string, { description?: string; schema?: SchemaObject }>;
  content?: Record<string, MediaTypeObject>;
};

export type OperationObject = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  responses: Record<string, ResponseObject>;
};

export type OpenApiDocument = {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string; description?: string }[];
  tags?: { name: string; description?: string }[];
  paths: Record<string, Record<string, OperationObject>>;
  components?: { schemas?: Record<string, SchemaObject> };
};

export type Operation = OperationObject & {
  id: string;
  method: string;
  path: string;
};

export type OperationGroup = {
  tag: string;
  description?: string;
  operations: Operation[];
};

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

export function listOperations(doc: OpenApiDocument): Operation[] {
  return Object.entries(doc.paths).flatMap(([path, item]) =>
    Object.entries(item)
      .filter(([method]) => HTTP_METHODS.includes(method))
      .map(([method, operation]) => ({
        ...operation,
        id: operation.operationId ?? `${method}-${path}`,
        method: method.toUpperCase(),
        path,
      })),
  );
}

export function groupOperations(doc: OpenApiDocument): OperationGroup[] {
  const operations = listOperations(doc);
  const declared = (doc.tags ?? []).map((tag) => tag.name);
  const used = operations.flatMap((operation) => operation.tags ?? ["Other"]);
  const order = [...new Set([...declared, ...used])];

  return order
    .map((tag) => ({
      tag,
      description: doc.tags?.find((t) => t.name === tag)?.description,
      operations: operations.filter((operation) =>
        (operation.tags ?? ["Other"]).includes(tag),
      ),
    }))
    .filter((group) => group.operations.length > 0);
}

export function resolveSchema(
  doc: OpenApiDocument,
  schema: SchemaObject | undefined,
): SchemaObject | undefined {
  if (!schema?.$ref) {
    return schema;
  }
  const name = schema.$ref.split("/").pop() ?? "";
  return resolveSchema(doc, doc.components?.schemas?.[name]);
}

export function refName(schema: SchemaObject | undefined): string | undefined {
  return schema?.$ref?.split("/").pop();
}

/** Flattens `allOf` and resolves refs so callers see one object shape. */
export function normalizeSchema(
  doc: OpenApiDocument,
  schema: SchemaObject | undefined,
): SchemaObject | undefined {
  const resolved = resolveSchema(doc, schema);
  if (!resolved?.allOf) {
    return resolved;
  }
  const parts = resolved.allOf.map((part) => normalizeSchema(doc, part) ?? {});
  return {
    ...resolved,
    allOf: undefined,
    type: "object",
    properties: Object.assign({}, ...parts.map((p) => p.properties ?? {})),
    required: parts.flatMap((p) => p.required ?? []),
  };
}

export function schemaTypeLabel(
  doc: OpenApiDocument,
  schema: SchemaObject | undefined,
): string {
  if (!schema) {
    return "any";
  }
  const name = refName(schema);
  const resolved = normalizeSchema(doc, schema);
  if (!resolved) {
    return name ?? "any";
  }
  if (resolved.enum) {
    return resolved.enum.map((value) => JSON.stringify(value)).join(" | ");
  }
  if (resolved.const !== undefined) {
    return JSON.stringify(resolved.const);
  }
  const type = Array.isArray(resolved.type)
    ? resolved.type.join(" | ")
    : resolved.type;
  if (type === "array") {
    return `${schemaTypeLabel(doc, resolved.items)}[]`;
  }
  if (name) {
    return name;
  }
  return type ?? "object";
}

export type SchemaField = {
  name: string;
  type: string;
  isRequired: boolean;
  description?: string;
};

/** Lists every property as a dotted path, e.g. `data[].lessons[].name`. */
export function flattenSchema(
  doc: OpenApiDocument,
  schema: SchemaObject | undefined,
  prefix = "",
  depth = 0,
): SchemaField[] {
  const resolved = normalizeSchema(doc, schema);
  if (!resolved || depth > 6) {
    return [];
  }
  if (resolved.type === "array") {
    return flattenSchema(doc, resolved.items, `${prefix}[]`, depth + 1);
  }
  if (!resolved.properties) {
    return [];
  }

  return Object.entries(resolved.properties).flatMap(([key, property]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    const field: SchemaField = {
      name,
      type: schemaTypeLabel(doc, property),
      isRequired: resolved.required?.includes(key) ?? false,
      description:
        property.description ?? resolveSchema(doc, property)?.description,
    };
    return [field, ...flattenSchema(doc, property, name, depth + 1)];
  });
}

export function exampleFromSchema(
  doc: OpenApiDocument,
  schema: SchemaObject | undefined,
  depth = 0,
): unknown {
  const resolved = normalizeSchema(doc, schema);
  if (!resolved || depth > 8) {
    return null;
  }
  if (resolved.example !== undefined) {
    return resolved.example;
  }
  if (resolved.const !== undefined) {
    return resolved.const;
  }
  if (resolved.enum) {
    return resolved.enum[0];
  }
  const type = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type;
  switch (type) {
    case "array":
      return [exampleFromSchema(doc, resolved.items, depth + 1)];
    case "string":
      return "string";
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return true;
    default:
      return Object.fromEntries(
        Object.entries(resolved.properties ?? {}).map(([key, property]) => [
          key,
          exampleFromSchema(doc, property, depth + 1),
        ]),
      );
  }
}

export function jsonSchemaOf(response: ResponseObject): SchemaObject | undefined {
  return response.content?.["application/json"]?.schema;
}

export function buildRequestPath(
  operation: Operation,
  values: Record<string, string>,
): string {
  const path = operation.path.replace(/\{([^}]+)\}/g, (_, name: string) =>
    encodeURIComponent(values[name] ?? ""),
  );
  const query = new URLSearchParams();
  for (const parameter of operation.parameters ?? []) {
    const value = values[parameter.name];
    if (parameter.in === "query" && value) {
      query.set(parameter.name, value);
    }
  }
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

export function defaultParameterValues(
  operation: Operation,
): Record<string, string> {
  return Object.fromEntries(
    (operation.parameters ?? []).map((parameter) => {
      const example = parameter.example ?? parameter.schema?.example;
      return [parameter.name, example === undefined ? "" : String(example)];
    }),
  );
}
