import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Section } from "@astryxdesign/core/Section";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import type { MentorRequest } from "@westride/db";
import { getMentorProfile, listMentorRequestsForOwner } from "@westride/db/mentorship";
import { signInPath } from "@/lib/auth-paths";
import { resolveMemberProfiles } from "@/lib/ideas/members";
import { languageName } from "@/lib/mentorship/languages";
import { formatLocation } from "@/lib/mentorship/locations";
import { skillFilterPath } from "../mentor-card";
import { MentorRequestForm } from "./mentor-request-form";
import { ReviewRequestButton } from "./review-request-button";

type Params = Promise<{ id: string }>;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requestDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

async function loadMentor(id: string) {
  return UUID.test(id) ? getMentorProfile(id) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const mentor = await loadMentor((await params).id);
  return { title: mentor?.displayName ?? "Mentor" };
}

function requestDescription(
  request: MentorRequest,
  accountName: string | null,
): string {
  const facts = [
    accountName &&
    accountName.localeCompare(request.fullName, undefined, {
      sensitivity: "accent",
    }) !== 0
      ? `WeStride account: ${accountName}`
      : null,
    request.email,
    request.company,
    request.jobTitle,
    request.phone,
    request.inquiryReason,
    request.timing,
  ].filter((part): part is string => Boolean(part));

  return facts.length > 0
    ? `${request.details} — ${facts.join(" · ")}`
    : request.details;
}

function RequestList({
  requests,
  profiles,
  canReview,
}: {
  requests: MentorRequest[];
  profiles: Awaited<ReturnType<typeof resolveMemberProfiles>>;
  canReview: boolean;
}) {
  return (
    <List>
      {requests.map((request) => {
        const account = profiles.get(request.requesterClerkUserId);
        const name = request.fullName;
        return (
          <ListItem
            key={request.id}
            align="start"
            startContent={
              <Avatar
                src={account?.imageUrl ?? undefined}
                name={name}
                size="md"
                tooltip={false}
              />
            }
            label={name}
            description={requestDescription(request, account?.name ?? null)}
            endContent={
              <VStack gap={2} hAlign="end">
                <Text type="supporting">
                  {requestDate.format(request.createdAt)}
                </Text>
                {canReview && request.status === "NEW" ? (
                  <ReviewRequestButton requestId={request.id} />
                ) : (
                  <Text type="supporting">Reviewed</Text>
                )}
              </VStack>
            }
          />
        );
      })}
    </List>
  );
}

export default async function MentorPage({ params }: { params: Params }) {
  const [{ id }, { userId }] = await Promise.all([params, auth()]);

  const mentor = await loadMentor(id);
  if (!mentor) {
    notFound();
  }

  const isOwnProfile = mentor.clerkUserId === userId;
  const [user, requests] = await Promise.all([
    !isOwnProfile && userId ? currentUser() : Promise.resolve(null),
    isOwnProfile && userId
      ? listMentorRequestsForOwner(userId)
      : Promise.resolve([]),
  ]);
  const profiles =
    requests.length > 0
      ? await resolveMemberProfiles(
          requests.map((request) => request.requesterClerkUserId),
        )
      : new Map();
  const incoming = requests.filter((request) => request.status === "NEW");
  const reviewed = requests.filter((request) => request.status === "REVIEWED");
  const paragraphs = mentor.bio.split(/\n+/).filter((line) => line.trim());
  const locationLines = [
    mentor.isGlobal ? "Mentors globally, wherever you are" : null,
    ...mentor.locations.map((location) => formatLocation(location)),
  ].filter((line): line is string => Boolean(line));
  const links = [
    { label: "GitHub", href: mentor.githubUrl },
    { label: "LinkedIn", href: mentor.linkedinUrl },
    { label: "Facebook", href: mentor.facebookUrl },
  ].filter((link): link is { label: string; href: string } =>
    Boolean(link.href),
  );
  const signInHref = `${signInPath}?redirect_url=${encodeURIComponent(`/mentorship/mentors/${mentor.id}`)}`;

  return (
    <Center minHeight="100%">
      <Section maxWidth={1100} width="100%" padding={10} variant="transparent">
        <VStack gap={10}>
          <Grid columns={{ minWidth: 320 }} align="center" gap={10}>
            <VStack gap={6}>
              <VStack gap={3}>
                <Link href="/mentorship/mentors" isStandalone>
                  All mentors
                </Link>
                <Text type="display-1" as="h1">
                  Work with {mentor.displayName}
                </Text>
                {paragraphs.map((paragraph, index) => (
                  <Text key={index} type="body" color="secondary" as="p" display="block">
                    {paragraph}
                  </Text>
                ))}
                {isOwnProfile ? (
                  <Button
                    label="Edit your profile"
                    variant="primary"
                    href="/mentorship/become"
                  />
                ) : null}
              </VStack>
              {mentor.skills.length > 0 ? (
                <VStack gap={2}>
                  <Text type="label">Skills</Text>
                  <HStack gap={2} wrap="wrap">
                    {mentor.skills.map((skill) => (
                      <Token
                        key={skill.id}
                        label={skill.name}
                        href={skillFilterPath(skill.slug)}
                      />
                    ))}
                  </HStack>
                </VStack>
              ) : null}
              {mentor.headshotUrl ? (
                <AspectRatio ratio={4 / 3} fit="cover">
                  <img src={mentor.headshotUrl} alt="" />
                </AspectRatio>
              ) : null}
            </VStack>

            <Card padding={8}>
              {isOwnProfile ? (
                <VStack gap={4}>
                  <HStack gap={2} vAlign="center">
                    <Text type="label">New requests</Text>
                    {incoming.length > 0 ? (
                      <Badge variant="blue" label={String(incoming.length)} />
                    ) : null}
                  </HStack>
                  {incoming.length === 0 ? (
                    reviewed.length === 0 ? (
                      <EmptyState
                        title="No requests yet"
                        description="When a member asks for your help, the request shows up here."
                      />
                    ) : (
                      <Text type="supporting">No new requests.</Text>
                    )
                  ) : (
                    <RequestList
                      requests={incoming}
                      profiles={profiles}
                      canReview
                    />
                  )}
                  {reviewed.length > 0 ? (
                    <VStack gap={3}>
                      <Text type="label">Reviewed</Text>
                      <RequestList
                        requests={reviewed}
                        profiles={profiles}
                        canReview={false}
                      />
                    </VStack>
                  ) : null}
                </VStack>
              ) : (
                <MentorRequestForm
                  mentorId={mentor.id}
                  mentorName={mentor.displayName}
                  isSignedIn={Boolean(userId)}
                  signInHref={signInHref}
                  defaults={{
                    fullName: user?.fullName ?? "",
                    email: user?.primaryEmailAddress?.emailAddress ?? "",
                  }}
                />
              )}
            </Card>
          </Grid>

          <VStack gap={6}>
            <Divider />
            <Grid columns={{ minWidth: 200 }} gap={6}>
              <VStack gap={1} hAlign="center">
                <Text type="supporting" color="secondary">
                  Where
                </Text>
                {locationLines.map((line) => (
                  <Text key={line} type="body" size="sm">
                    {line}
                  </Text>
                ))}
              </VStack>
              <VStack gap={1} hAlign="center">
                <Text type="supporting" color="secondary">
                  Languages
                </Text>
                <Text type="body" size="sm">
                  {mentor.languageCodes.map(languageName).join(", ")}
                </Text>
              </VStack>
              <VStack gap={1} hAlign="center">
                <Text type="supporting" color="secondary">
                  Connect
                </Text>
                {links.length > 0 ? (
                  links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      isExternalLink
                      type="body"
                      size="sm"
                    >
                      {link.label}
                    </Link>
                  ))
                ) : (
                  <Text type="body" size="sm">
                    No public links
                  </Text>
                )}
              </VStack>
            </Grid>
          </VStack>
        </VStack>
      </Section>
    </Center>
  );
}
