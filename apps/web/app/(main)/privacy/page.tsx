import type { Metadata } from "next";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import {
  LegalDocument,
  LegalParagraph,
  LegalSection,
  PROJECT_REPOSITORY,
} from "../legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy">
      <LegalSection title="Who we are">
        <LegalParagraph>
          WeStride is an open-source project, and the platform is free. We
          do not charge you, we do not run ads, and we do not make money by
          selling personal information. This policy says what the service
          keeps and who helps us run it. Our{" "}
          <Link href="/terms">Terms of Service</Link> covers how the platform
          may be used.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="What we keep">
        <LegalParagraph>
          You can browse without an account. If you create one, sign-in is
          handled by Clerk. Clerk stores the details you use to sign in, such
          as your email address and name, and keeps you signed in with a
          cookie.
        </LegalParagraph>
        <LegalParagraph>
          The learning catalog, such as tracks and lessons, is stored in our
          database at Neon. If you later add something of your own, such as a
          mentor profile, an idea, or a community post, we store what you
          submit so that feature can work.
        </LegalParagraph>
        <LegalParagraph>
          Your browser remembers the width of the side navigation on this
          device. That preference stays in the browser. It is not sent to us
          as an account record.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Why we keep it">
        <List edge="flush" hasDividers>
          <ListItem
            label="To run the account"
            description={
              <Text type="supporting">
                So you can sign in and we can tell your account from someone
                else&apos;s.
              </Text>
            }
          />
          <ListItem
            label="To operate the platform"
            description={
              <Text type="supporting">
                So lessons and anything you choose to save can be shown back
                to you.
              </Text>
            }
          />
          <ListItem
            label="To keep the site working"
            description={
              <Text type="supporting">
                Hosting and sign-in providers record ordinary technical
                details, such as a request, so the site can respond and stay
                secure.
              </Text>
            }
          />
        </List>
      </LegalSection>

      <LegalSection title="Who else handles it">
        <LegalParagraph>
          We use a few companies to run the site. Clerk handles sign-in.
          Neon holds the database. Vercel hosts the application. They process
          information only so WeStride can function. We do not sell personal
          information, and we do not share it for advertising.
        </LegalParagraph>
        <LegalParagraph>
          The application source code is public at the repository below.
          Personal information and anything you submit are not published with
          that code.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <LegalParagraph>
          Account information stays while the account exists. You can ask us
          to delete the account through the project repository. Catalog
          content that is part of the lessons stays as part of the platform.
          Browser preferences stay until you clear them on your device.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Children">
        <LegalParagraph>
          WeStride is not directed at children under 13, and we do not
          knowingly collect personal information from them. If you believe a
          child under 13 has created an account, contact us and we will delete
          it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Changes and questions">
        <LegalParagraph>
          If this policy changes, the date at the top of this page changes
          with it.
        </LegalParagraph>
        <LegalParagraph>
          Questions about privacy can go to the public project repository at{" "}
          <Link href={PROJECT_REPOSITORY} isExternalLink>
            github.com/OriginalPioneers/westride
          </Link>
          .
        </LegalParagraph>
      </LegalSection>
    </LegalDocument>
  );
}
