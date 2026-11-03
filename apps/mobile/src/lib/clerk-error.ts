type ClerkLikeError = {
  message?: string;
  errors?: Array<{ longMessage?: string; message?: string }>;
};

export function clerkMessage(error: unknown, fallback = "Something went wrong."): string {
  if (!error || typeof error !== "object") {
    return fallback;
  }
  const value = error as ClerkLikeError;
  const first = value.errors?.[0];
  return first?.longMessage ?? first?.message ?? value.message ?? fallback;
}
