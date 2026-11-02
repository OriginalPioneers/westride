// ---------------------------------------------------------------------------
// The Meta Model API text models an agent may run on, with their published
// prices (https://dev.meta.ai/docs/pricing-rate-limits). The website, the
// API, and the MCP server validate model choices against this one list.
// Needs no database; client components may import this file.
// ---------------------------------------------------------------------------

export type MuseModelId =
  | "muse-spark-1.3"
  | "muse-spark-1.3-contributor"
  | "muse-wonder-1.0";

export type MuseModelOption = {
  id: MuseModelId;
  label: string;
  description: string;
  /** USD per million tokens. */
  inputPerMillion: number;
  cachedInputPerMillion: number;
  outputPerMillion: number;
  /** Content may be used by Meta to train future models. */
  isContributor: boolean;
};

export const MUSE_MODELS: MuseModelOption[] = [
  {
    id: "muse-spark-1.3",
    label: "Muse Spark 1.3",
    description: "Fast and capable. Standard pricing; your content is not used for training.",
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.15,
    outputPerMillion: 4.25,
    isContributor: false,
  },
  {
    id: "muse-spark-1.3-contributor",
    label: "Muse Spark 1.3 (Contributor)",
    description:
      "About 90% cheaper. Meta may use your prompts and responses to train future models.",
    inputPerMillion: 0.1,
    cachedInputPerMillion: 0.002,
    outputPerMillion: 0.2,
    isContributor: true,
  },
  {
    id: "muse-wonder-1.0",
    label: "Muse Wonder 1.0",
    description: "Meta's most capable model. Several times the cost of Spark.",
    inputPerMillion: 4,
    cachedInputPerMillion: 0.2,
    outputPerMillion: 20,
    isContributor: false,
  },
];

export const MUSE_MODEL_IDS = MUSE_MODELS.map((model) => model.id) as [
  MuseModelId,
  ...MuseModelId[],
];

export const DEFAULT_MUSE_MODEL: MuseModelId = "muse-spark-1.3";

export function isMuseModelId(value: string): value is MuseModelId {
  return MUSE_MODELS.some((model) => model.id === value);
}

export function getMuseModel(id: string): MuseModelOption | undefined {
  return MUSE_MODELS.find((model) => model.id === id);
}
