import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  getMentorProfileForUser,
  listSkills,
} from "@westride/db/mentorship";
import { MentorProfileForm } from "./mentor-profile-form";

export const metadata: Metadata = {
  title: "Become a Mentor",
};

export default async function BecomeMentorPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/mentorship/become" });
  }

  const [profile, skills] = await Promise.all([
    getMentorProfileForUser(userId),
    listSkills(),
  ]);
  // Only a new profile needs the account name as a starting point.
  const user = profile ? null : await currentUser();

  const initial = profile
    ? {
        displayName: profile.displayName,
        bio: profile.bio,
        githubUrl: profile.githubUrl ?? "",
        linkedinUrl: profile.linkedinUrl ?? "",
        facebookUrl: profile.facebookUrl ?? "",
        isGlobal: profile.isGlobal,
        skills: profile.skills.map((skill) => skill.name),
        locations: profile.locations.map((location) => ({
          countryCode: location.countryCode,
          region: location.region ?? "",
          city: location.city ?? "",
        })),
        languageCodes: profile.languageCodes,
        headshotUrl: profile.headshotUrl,
      }
    : {
        displayName: user?.fullName ?? "",
        bio: "",
        githubUrl: "",
        linkedinUrl: "",
        facebookUrl: "",
        isGlobal: false,
        skills: [],
        locations: [],
        languageCodes: [],
        headshotUrl: null,
      };

  return (
    <Layout
      contentWidth={720}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Heading level={1}>
              {profile ? "Your mentor profile" : "Become a Mentor"}
            </Heading>
            <Text type="supporting">
              Mentorship on WeStride is always free. Mentees find you by skill,
              location, and language.
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <MentorProfileForm
            initial={initial}
            skillNames={skills.map((skill) => skill.name)}
            isExisting={profile !== null}
          />
        </LayoutContent>
      }
    />
  );
}
