/** What the runner needs to know about one Ollama model before handing it to Muse Code. */
export type OllamaModelInfo = {
  name: string;
  /** Ollama's declared capabilities, e.g. completion, tools, thinking, vision, embedding. */
  capabilities: string[];
  /** The model's trained context length in tokens, when Ollama reports one. */
  contextLength: number | null;
};

const TIMEOUT_MS = 3000;

/** Asks Ollama on the host which models it can serve. Empty when it is not running. */
async function listAllOllamaModels(ollamaUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return [];
    const data = (await response.json()) as { models?: { name?: string; model?: string }[] };
    const names = (data.models ?? [])
      .map((entry) => entry.name ?? entry.model ?? "")
      .filter((name): name is string => name.length > 0);
    return Array.from(new Set(names)).sort();
  } catch {
    return [];
  }
}

/** Ollama's description of one model: capabilities and context length. Null when it cannot be read. */
export async function describeOllamaModel(ollamaUrl: string, name: string): Promise<OllamaModelInfo | null> {
  try {
    const response = await fetch(`${ollamaUrl}/api/show`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: name }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { capabilities?: unknown; model_info?: Record<string, unknown> };
    const capabilities = Array.isArray(data.capabilities)
      ? data.capabilities.filter((value): value is string => typeof value === "string")
      : [];
    let contextLength: number | null = null;
    for (const [key, value] of Object.entries(data.model_info ?? {})) {
      if (key.endsWith(".context_length") && typeof value === "number" && value > 0) {
        contextLength = value;
        break;
      }
    }
    return { name, capabilities, contextLength };
  } catch {
    return null;
  }
}

/**
 * Models Muse Code can drive: it works through tool calls, so a model has to
 * declare the `tools` capability. Embedding-only and plain-completion models
 * are left out rather than offered and failed.
 */
export async function listOllamaModels(ollamaUrl: string): Promise<string[]> {
  const names = await listAllOllamaModels(ollamaUrl);
  const infos = await Promise.all(names.map((name) => describeOllamaModel(ollamaUrl, name)));
  return infos
    .filter((info): info is OllamaModelInfo => info !== null && info.capabilities.includes("tools"))
    .map((info) => info.name);
}
