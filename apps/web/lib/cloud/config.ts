import "server-only";

import {
  DEFAULT_AI_MARKUP_PERCENT,
  DEFAULT_COMPUTE_VCPU_HOUR_MICROS,
  type CloudRates,
} from "./pricing";

/**
 * WeStride Cloud is optional. Each half switches on with its own secrets:
 * the shared Meta key turns on AI, the Modal token pair turns on compute,
 * and Stripe turns on paying for either. Codes work without Stripe.
 */

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/** The Meta Model API key every WeStride Cloud model call uses. */
export function getCloudMetaApiKey(): string | null {
  return env("WESTRIDE_CLOUD_META_API_KEY") || null;
}

export function isCloudAiConfigured(): boolean {
  return getCloudMetaApiKey() !== null;
}

export type ModalConfig = {
  tokenId: string;
  tokenSecret: string;
  /** Modal environment name. Modal's default is `main`. */
  environment: string | undefined;
  /** The Modal app sandboxes are created under. */
  appName: string;
};

export function getModalConfig(): ModalConfig | null {
  const tokenId = env("MODAL_TOKEN_ID");
  const tokenSecret = env("MODAL_TOKEN_SECRET");
  if (!tokenId || !tokenSecret) {
    return null;
  }
  return {
    tokenId,
    tokenSecret,
    environment: env("MODAL_ENVIRONMENT") || undefined,
    appName: env("WESTRIDE_CLOUD_MODAL_APP_NAME") || "westride-cloud",
  };
}

export function isCloudComputeConfigured(): boolean {
  return getModalConfig() !== null;
}

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string | null;
};

export function getStripeConfig(): StripeConfig | null {
  const secretKey = env("STRIPE_SECRET_KEY");
  if (!secretKey) {
    return null;
  }
  return { secretKey, webhookSecret: env("STRIPE_WEBHOOK_SECRET") || null };
}

export function isStripeConfigured(): boolean {
  return getStripeConfig() !== null;
}

/** Whether there is anything a member could use a balance for. */
export function isCloudConfigured(): boolean {
  return isCloudAiConfigured() || isCloudComputeConfigured();
}

export function getCloudRates(): CloudRates {
  const markup = Number(env("WESTRIDE_CLOUD_AI_MARKUP_PERCENT"));
  const vcpuHourCents = Number(env("WESTRIDE_CLOUD_COMPUTE_VCPU_HOUR_CENTS"));
  return {
    aiMarkupPercent:
      Number.isFinite(markup) && env("WESTRIDE_CLOUD_AI_MARKUP_PERCENT") !== ""
        ? Math.max(0, markup)
        : DEFAULT_AI_MARKUP_PERCENT,
    computeVcpuHourMicros:
      Number.isFinite(vcpuHourCents) && env("WESTRIDE_CLOUD_COMPUTE_VCPU_HOUR_CENTS") !== ""
        ? Math.max(0, Math.round(vcpuHourCents)) * 10_000
        : DEFAULT_COMPUTE_VCPU_HOUR_MICROS,
  };
}

/** What the browser may know about the server's WeStride Cloud setup. */
export type CloudAvailability = {
  ai: boolean;
  compute: boolean;
  payments: boolean;
};

export function getCloudAvailability(): CloudAvailability {
  return {
    ai: isCloudAiConfigured(),
    compute: isCloudComputeConfigured(),
    payments: isStripeConfigured(),
  };
}
