import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { ADMIN_PATHS } from "@/lib/paths";
import { PageFrame } from "../../page-frame";

export default function UserNotFound() {
  return (
    <PageFrame title="Member not found">
      <EmptyState
        title="No account with that id"
        description="Clerk has no user with this id. The account may have been deleted."
        actions={<Button label="All users" variant="secondary" href={ADMIN_PATHS.users} />}
      />
    </PageFrame>
  );
}
