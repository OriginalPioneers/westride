"use client";

import type { ComponentProps, ReactNode } from "react";
import { DocPage, DocSection } from "../../doc-page";

export type IdeaDocumentSection = {
  id: string;
  title: string;
  actions?: ReactNode;
  content: ReactNode;
};

/**
 * The idea page laid out as a DocPage. Sections arrive as data: DocPage finds
 * its sections by component type, which elements created in a server
 * component do not reliably keep once they reach the client.
 */
export function IdeaDocument({
  sections,
  ...page
}: Omit<ComponentProps<typeof DocPage>, "children"> & {
  sections: IdeaDocumentSection[];
}) {
  return (
    <DocPage {...page}>
      {sections.map(({ id, title, actions, content }) => (
        <DocSection key={id} id={id} title={title} actions={actions}>
          {content}
        </DocSection>
      ))}
    </DocPage>
  );
}
