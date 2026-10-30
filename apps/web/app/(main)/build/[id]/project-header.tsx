import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { ReactNode } from "react";
import { ProjectStatusBadge } from "../project-badges";
import type { ProjectPageContext } from "./load-project";
import { ProjectNav, type ProjectSection } from "./project-nav";

/** The top of every project page: crumbs, name, status, and the section tabs. */
export function ProjectHeader({
  context,
  section,
  actions,
}: {
  context: ProjectPageContext;
  section: ProjectSection;
  actions?: ReactNode;
}) {
  const { project } = context;
  return (
    <VStack gap={4}>
      <Link href="/build" isStandalone>
        All projects
      </Link>
      <HStack gap={4} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={2}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <ProjectStatusBadge status={project.status} />
              {!project.isPublic ? (
                <Text type="supporting">Private · visible to the team only</Text>
              ) : null}
            </HStack>
            <Heading level={1}>{project.name}</Heading>
          </VStack>
        </StackItem>
        {actions ? (
          <HStack gap={2} vAlign="center" wrap="wrap">
            {actions}
          </HStack>
        ) : null}
      </HStack>
      <ProjectNav
        projectId={project.id}
        selected={section}
        openTicketCount={context.openTicketCount}
        canEdit={context.isMember}
      />
    </VStack>
  );
}
