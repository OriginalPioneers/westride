import { Badge } from "@astryxdesign/core/Badge";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Text } from "@astryxdesign/core/Text";
import {
  ticketProgressPercent,
  totalTickets,
  type ProjectWithDetails,
} from "@westride/db/build";
import { isClaimableProject } from "@westride/db/claim-rules";
import { projectPath } from "@/lib/build/labels";
import { markdownExcerpt } from "@/lib/ideas/excerpt";
import { FeaturedBadge, UnclaimedBadge } from "../ideas/idea-badges";
import { LibraryCard } from "../library-card";
import { ProjectStatusBadge } from "./project-badges";

export function ProjectCard({ project }: { project: ProjectWithDetails }) {
  const total = totalTickets(project.ticketCounts);
  const percent = ticketProgressPercent(project.ticketCounts);
  const repos = project.repos.map((repo) => `${repo.owner}/${repo.name}`);

  return (
    <LibraryCard
      name={project.name}
      href={projectPath(project.id)}
      imageUrl={project.imageUrl}
      description={markdownExcerpt(project.description)}
      meta={repos.join(", ")}
      footer={
        <>
          {project.isFeatured ? <FeaturedBadge /> : null}
          <ProjectStatusBadge status={project.status} />
          {isClaimableProject(project) ? <UnclaimedBadge /> : null}
          {!project.isPublic ? <Badge variant="neutral" label="Private" /> : null}
        </>
      }
    >
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
    </LibraryCard>
  );
}
