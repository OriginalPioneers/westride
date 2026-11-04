import type { Metadata } from "next";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { getClaimRequest } from "@westride/db/claims";
import { getIdeaGithubRepo } from "@westride/db/github";
import { reviewTokenMatches } from "@/lib/claims/review-token";
import { ideaPath } from "@/lib/ideas/filters";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { projectPath } from "@/lib/build/labels";
import { ReviewButtons } from "./review-buttons";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ token?: string | string[] }>;

export const metadata: Metadata = {
  title: "Claim request",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABEL = {
  PENDING: { label: "Waiting for review", variant: "info" as const },
  APPROVED: { label: "Approved", variant: "success" as const },
  DENIED: { label: "Denied", variant: "neutral" as const },
};

function InvalidLink() {
  return (
    <Layout
      contentWidth={640}
      header={
        <LayoutHeader hasDivider>
          <Heading level={1}>Claim request</Heading>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <Banner
            status="error"
            title="This review link is not valid"
            description="It may have been copied incompletely, or the request no longer exists. Open the link from the email again."
          />
        </LayoutContent>
      }
    />
  );
}

/**
 * Where the team lands from the claim-request email. The token in the link
 * is the only authorization, so the page never approves on load: the
 * decision is a button press.
 */
export default async function ClaimReviewPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const token = Array.isArray(query.token) ? query.token[0] : query.token;
  if (!UUID.test(id) || !token) {
    return <InvalidLink />;
  }
  const request = await getClaimRequest(id);
  if (!request || !reviewTokenMatches(token, request.reviewTokenHash)) {
    return <InvalidLink />;
  }

  const [profiles, repo] = await Promise.all([
    resolveMemberProfiles([request.clerkUserId]),
    getIdeaGithubRepo(request.ideaId),
  ]);
  const requester = profiles.get(request.clerkUserId);
  const requesterName = requester?.name ?? "A WeStride member";
  const ideaName = request.idea?.name ?? "an idea that no longer exists";
  const status = STATUS_LABEL[request.status];

  return (
    <Layout
      contentWidth={640}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Badge variant={status.variant} label={status.label} />
              <Text type="supporting">
                Requested {request.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
              </Text>
            </HStack>
            <Heading level={1}>Claim request for {ideaName}</Heading>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            <VStack gap={3}>
              <Heading level={2}>Who is asking</Heading>
              <HStack gap={3} vAlign="center">
                <Avatar
                  src={requester?.imageUrl ?? undefined}
                  name={requesterName}
                  size="md"
                  tooltip={false}
                />
                <StackItem size="fill">
                  <VStack gap={0}>
                    <Text>{requesterName}</Text>
                    <Text type="supporting">Clerk user {request.clerkUserId}</Text>
                  </VStack>
                </StackItem>
              </HStack>
            </VStack>

            <VStack gap={3}>
              <Heading level={2}>What they want</Heading>
              <VStack gap={1}>
                {request.idea ? (
                  <Text>
                    Idea: <Link href={ideaPath(request.idea.slug)}>{request.idea.name}</Link>
                  </Text>
                ) : (
                  <Text type="supporting">The idea has been deleted.</Text>
                )}
                {request.project ? (
                  <Text>
                    Project:{" "}
                    <Link href={projectPath(request.project.id)}>{request.project.name}</Link>
                  </Text>
                ) : null}
                {repo ? (
                  <Text>
                    Repository:{" "}
                    <Link href={repo.htmlUrl} isExternalLink>
                      {repo.owner}/{repo.name}
                    </Link>
                  </Text>
                ) : null}
              </VStack>
            </VStack>

            <VStack gap={3}>
              <Heading level={2}>Their message</Heading>
              {request.message ? (
                <Text>{request.message}</Text>
              ) : (
                <Text type="supporting">They did not add a message.</Text>
              )}
            </VStack>

            <Divider />

            {request.status === "PENDING" ? (
              <ReviewButtons
                requestId={request.id}
                token={token}
                requesterName={requesterName}
                ideaName={ideaName}
              />
            ) : (
              <Banner
                status={request.status === "APPROVED" ? "success" : "info"}
                title={
                  request.status === "APPROVED"
                    ? `${requesterName} now owns ${ideaName}`
                    : "This request was denied"
                }
                description={
                  request.decidedAt
                    ? `Decided ${request.decidedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`
                    : undefined
                }
              />
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
