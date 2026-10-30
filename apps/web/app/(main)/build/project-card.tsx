import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  ticketProgressPercent,
  totalTickets,
  type ProjectWithDetails,
} from "@westride/db/build";
import { projectPath } from "@/lib/build/labels";
import { markdownExcerpt } from "@/lib/ideas/excerpt";
import { ProjectStatusBadge } from "./project-badges";

export function ProjectCard({ project }: { project: ProjectWithDetails }) {
  const excerpt = markdownExcerpt(project.description);
  const total = totalTickets(project.ticketCounts);
  const percent = ticketProgressPercent(project.ticketCounts);
  const repos = project.repos.map((repo) => `${repo.owner}/${repo.name}`);

  return (
    <Card>
      <VStack gap={3}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <ProjectStatusBadge status={project.status} />
          {!project.isPublic ? <Text type="supporting">Private</Text> : null}
        </HStack>
        <VStack gap={1}>
          <Heading level={3} maxLines={2}>
            <Link href={projectPath(project.id)}>{project.name}</Link>
          </Heading>
          {repos.length > 0 ? (
            <Text type="supporting" maxLines={1}>
              {repos.join(", ")}
            </Text>
          ) : null}
        </VStack>
        {excerpt ? <Text maxLines={3}>{excerpt}</Text> : null}
        {total > 0 ? (
          <ProgressBar
            label={`${project.ticketCounts.DONE} of ${total} tickets done`}
            value={percent}
            hasValueLabel
            variant={percent === 100 ? "success" : "accent"}
          />
        ) : (
          <Text type="supporting">No tickets yet</Text>
        )}
      </VStack>
    </Card>
  );
}
