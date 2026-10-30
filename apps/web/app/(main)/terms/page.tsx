import type { Metadata } from "next";
import { Link } from "@astryxdesign/core/Link";
import {
  LegalDocument,
  LegalParagraph,
  LegalSection,
  PROJECT_REPOSITORY,
} from "../legal-document";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service">
      <LegalSection title="Who we are">
        <LegalParagraph>
          WeStride is an open-source project. The platform at WeStride.org
          helps people learn AI, find mentors, and work on ideas. Using
          WeStride is free. We do not charge for an account, for lessons, for
          mentorship, or for any other part of the service. We do not sell
          access, and we do not make money from the people who use it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Using WeStride">
        <LegalParagraph>
          You can look around without an account. An account is there so we
          can keep your place, including progress and the things you choose to
          save. You agree to these terms by using the site. Our{" "}
          <Link href="/privacy">Privacy Policy</Link> explains what information
          the service handles.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Your account">
        <LegalParagraph>
          You are responsible for the sign-in you use and for what happens
          with your account. Tell us, through the project repository linked
          below, if you think someone else is using it. We may close an
          account that is used to break these terms or to harm someone else.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="What you share">
        <LegalParagraph>
          You keep ownership of the ideas, projects, messages, and other
          material you add. You give WeStride permission to store that
          material and to show it where the feature you used is meant to show
          it, such as a mentor profile or a community post. We may remove
          material that breaks these terms.
        </LegalParagraph>
        <LegalParagraph>
          The source code of the WeStride application is published separately.
          Your account and the material you submit are not part of that public
          code.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="How to treat other people">
        <LegalParagraph>
          Use WeStride for learning and for building things. Do not break the
          law, harass anyone, post someone else&apos;s private information, try
          to break into the service, or interfere with other people&apos;s use
          of it. Mentorship on WeStride is free and is between the people
          involved. WeStride does not employ mentors and does not promise a
          particular outcome.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Learning and suggestions">
        <LegalParagraph>
          Lessons, mentor conversations, and any suggestions the product
          offers are educational. They are general information. They are not
          legal, financial, medical, or other professional advice, and they
          can be incomplete or wrong. You decide what to do with them.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="The service can change">
        <LegalParagraph>
          WeStride is offered as it is, at no charge. Features can change, and
          the site can be unavailable. Because the service is free and open
          source, we are not taking on liability for losses that come
          from using it, to the extent the law allows.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Changes and questions">
        <LegalParagraph>
          If these terms change, the date at the top of this page changes with
          them. Continued use of WeStride after that date means you accept the
          updated terms.
        </LegalParagraph>
        <LegalParagraph>
          Questions about these terms can go to the public project repository
          at{" "}
          <Link href={PROJECT_REPOSITORY} isExternalLink>
            github.com/OriginalPioneers/westride
          </Link>
          .
        </LegalParagraph>
      </LegalSection>
    </LegalDocument>
  );
}
