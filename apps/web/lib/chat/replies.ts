import type { AcademyTrack, TrackDifficulty } from "@westride/api-client";
import type { ChatPlatform } from "@westride/db";

/**
 * What WeStride says back in a chat, before each platform's formatting.
 * Text here is plain: renderers add bold, links, and layout.
 */
export type ChatReply = {
  title: string;
  intro?: string;
  items?: { title: string; detail: string; description?: string }[];
  footer?: string;
  link?: { label: string; url: string };
};

export type ChatCommand =
  | { name: "help" }
  | { name: "tracks" }
  | { name: "link"; code: string }
  | { name: "unknown"; text: string };

const TRACK_WORDS = new Set(["tracks", "track", "academy", "courses"]);
const HELP_WORDS = new Set(["help", "start", "hi", "hello", "menu", "?"]);

/** Reads "tracks", "/tracks", "westride tracks", or "link ABCD2345" from any platform. */
export function parseChatCommand(text: string): ChatCommand {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words[0]?.replace(/^\//, "").toLowerCase() === "westride") {
    words.shift();
  }
  const first = words[0]?.replace(/^\//, "").toLowerCase() ?? "";
  if (!first || HELP_WORDS.has(first)) {
    return { name: "help" };
  }
  if (TRACK_WORDS.has(first)) {
    return { name: "tracks" };
  }
  if (first === "link" && words[1]) {
    return { name: "link", code: words[1].toUpperCase() };
  }
  return { name: "unknown", text: words.join(" ").slice(0, 60) };
}

const PLATFORM_NAMES: Record<ChatPlatform, string> = {
  SLACK: "Slack",
  DISCORD: "Discord",
  WHATSAPP: "WhatsApp",
};

/** How a member types a command on each platform. */
export function commandHint(platform: ChatPlatform, command: string): string {
  return platform === "WHATSAPP" ? command : `/westride ${command}`;
}

const DIFFICULTY: Record<TrackDifficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest} min`;
  }
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) {
    return clean;
  }
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Enough to fit every platform's limits on items per message. */
const MAX_TRACKS = 20;

export function tracksReply(tracks: AcademyTrack[], academyUrl: string): ChatReply {
  if (tracks.length === 0) {
    return {
      title: "WeStride Academy",
      intro: "There are no tracks yet. Check back soon.",
      link: { label: "Open the academy", url: academyUrl },
    };
  }
  const shown = tracks.slice(0, MAX_TRACKS);
  const hidden = tracks.length - shown.length;
  return {
    title: "WeStride Academy tracks",
    intro: `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}, in the order we recommend taking them.`,
    items: shown.map((track, index) => ({
      title: `${index + 1}. ${track.name}`,
      detail: [
        DIFFICULTY[track.difficulty] ?? track.difficulty,
        formatDuration(track.estimatedDurationMinutes),
        `${track.lessonCount} ${track.lessonCount === 1 ? "lesson" : "lessons"}`,
      ].join(" · "),
      description: shorten(track.description, 160),
    })),
    footer: hidden > 0 ? `And ${hidden} more in the academy.` : undefined,
    link: { label: "Open the academy", url: academyUrl },
  };
}

export function helpReply(
  platform: ChatPlatform,
  options: { isLinked: boolean | null; settingsUrl: string; heardText?: string },
): ChatReply {
  const name = PLATFORM_NAMES[platform];
  const linkLine =
    options.isLinked === true
      ? `This ${name} account is linked to your WeStride account.`
      : options.isLinked === false
        ? `Link this ${name} account to WeStride from Settings so WeStride knows it is you.`
        : undefined;
  return {
    title: "WeStride",
    intro: options.heardText
      ? `I don't know "${options.heardText}" yet. Here is what I can do:`
      : "Here is what I can do:",
    items: [
      {
        title: commandHint(platform, "tracks"),
        detail: "List the WeStride Academy learning tracks.",
      },
      {
        title: commandHint(platform, "help"),
        detail: "Show this message.",
      },
    ],
    footer: linkLine,
    link:
      options.isLinked === true
        ? undefined
        : { label: "WeStride settings", url: options.settingsUrl },
  };
}

export function messageReply(title: string, intro: string, link?: ChatReply["link"]): ChatReply {
  return { title, intro, link };
}
