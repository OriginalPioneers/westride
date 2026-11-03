import { MAX_INLINE_TEXT_CHARS } from "./uploads";

export type MuseTextPart = { type: "input_text"; text: string };
export type MuseImagePart = {
  type: "input_image";
  image_url: string;
  detail?: "auto" | "low" | "high";
};
export type MuseFilePart = { type: "input_file"; filename: string; file_data: string };
export type MuseContentPart = MuseTextPart | MuseImagePart | MuseFilePart;
export type MuseInputItem = {
  role: "user" | "assistant";
  content: string | MuseContentPart[];
};

export type MuseInlineFile = {
  title: string;
  contentType: string;
  bytes: Buffer;
  as: "image" | "pdf" | "text";
};

/** Keeps base64 out of the request log. */
export function redactMuseInput(
  input: string | MuseInputItem[],
): string | MuseInputItem[] {
  if (typeof input === "string") {
    return input;
  }
  return input.map((item) => {
    if (typeof item.content === "string") {
      return item;
    }
    return {
      ...item,
      content: item.content.map((part) => {
        if (part.type === "input_image" && part.image_url.startsWith("data:")) {
          return { ...part, image_url: `<${part.image_url.length} data-url chars>` };
        }
        if (part.type === "input_file") {
          return { ...part, file_data: `<${part.file_data.length} base64 chars>` };
        }
        return part;
      }),
    };
  });
}

/** Puts readable files on the last user turn so Muse can see them. */
export function withInlineFiles(
  items: MuseInputItem[],
  files: MuseInlineFile[],
): MuseInputItem[] {
  if (files.length === 0) {
    return items;
  }
  const index = items.findLastIndex((item) => item.role === "user");
  if (index === -1) {
    return items;
  }
  const current = items[index]!;
  const text =
    typeof current.content === "string"
      ? current.content
      : current.content
          .filter((part): part is MuseTextPart => part.type === "input_text")
          .map((part) => part.text)
          .join("\n\n");
  const parts: MuseContentPart[] = [{ type: "input_text", text }];
  for (const file of files) {
    if (file.as === "text") {
      const body = file.bytes.toString("utf8").slice(0, MAX_INLINE_TEXT_CHARS);
      parts.push({
        type: "input_text",
        text: `Contents of "${file.title}":\n\n${body}`,
      });
      continue;
    }
    if (file.as === "image") {
      parts.push({
        type: "input_image",
        image_url: `data:${file.contentType};base64,${file.bytes.toString("base64")}`,
        detail: "auto",
      });
      continue;
    }
    parts.push({
      type: "input_file",
      filename: file.title,
      file_data: file.bytes.toString("base64"),
    });
  }
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, content: parts } : item,
  );
}
