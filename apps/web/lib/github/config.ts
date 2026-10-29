import "server-only";

export type GithubAppConfig = {
  slug: string;
  clientId: string;
  clientSecret: string;
  /** PEM. GitHub issues PKCS#1; PKCS#8 also works. */
  privateKey: string;
  /**
   * The app's installation on WeStride's own GitHub organization. Used to
   * read public repositories without the anonymous rate limit, and as the
   * home for repositories WeStride creates for itself.
   */
  homeInstallationId: number | null;
  /** Optional author for commits WeStride writes. Defaults to the app's bot. */
  commitAuthor: { name: string; email: string } | null;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getGithubAppConfig(): GithubAppConfig | null {
  const slug = env("GITHUB_APP_SLUG");
  const clientId = env("GITHUB_APP_CLIENT_ID");
  const clientSecret = env("GITHUB_APP_CLIENT_SECRET");
  // Hosting dashboards often store a PEM on one line with literal "\n".
  const privateKey = env("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
  if (
    !slug ||
    !clientId ||
    !clientSecret ||
    !privateKey ||
    !env("GITHUB_TOKEN_ENCRYPTION_KEY")
  ) {
    return null;
  }

  const home = Number(env("GITHUB_APP_HOME_INSTALLATION_ID"));
  const authorName = env("GITHUB_COMMIT_AUTHOR_NAME");
  const authorEmail = env("GITHUB_COMMIT_AUTHOR_EMAIL");

  return {
    slug,
    clientId,
    clientSecret,
    privateKey,
    homeInstallationId: Number.isInteger(home) && home > 0 ? home : null,
    commitAuthor:
      authorName && authorEmail ? { name: authorName, email: authorEmail } : null,
  };
}

export function requireGithubAppConfig(): GithubAppConfig {
  const config = getGithubAppConfig();
  if (!config) {
    throw new Error("The WeStride GitHub App is not configured.");
  }
  return config;
}

export function isGithubAppConfigured(): boolean {
  return getGithubAppConfig() !== null;
}
