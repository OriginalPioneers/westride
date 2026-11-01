import { Avatar } from "@astryxdesign/core/Avatar";

/**
 * The square image of an idea, project, or agent. Without one, Avatar shows
 * the name's initials so cards and headers keep their shape.
 */
export function EntityImage({
  name,
  imageUrl,
  size,
}: {
  name: string;
  imageUrl: string | null;
  size: 48 | 72;
}) {
  return (
    <Avatar src={imageUrl ?? undefined} name={name} size={size} shape="rounded" tooltip={false} />
  );
}
