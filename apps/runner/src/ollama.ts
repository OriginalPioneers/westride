/** Asks Ollama on the host which models it can serve. Empty when it is not running. */
export async function listOllamaModels(ollamaUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
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
