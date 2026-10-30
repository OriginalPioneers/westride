import { academyTracks } from "../academy-tracks";
import { aiAgentsAndAutomation } from "./ai-agents-and-automation";
import { aiFoundations } from "./ai-foundations";
import { aiInActionRealWorld } from "./ai-in-action-real-world";
import { buildWithLlama } from "./build-with-llama";
import { generativeAiExplained } from "./generative-ai-explained";
import { howAiModelsLearn } from "./how-ai-models-learn";
import { ideaToLaunchAiProduct } from "./idea-to-launch-ai-product";
import { meetMetaAiAndLlama } from "./meet-meta-ai-and-llama";
import { multimodalCreativeAi } from "./multimodal-creative-ai";
import { promptEngineeringMastery } from "./prompt-engineering-mastery";
import type { AcademyLessonSeed, AcademyTrackLessons } from "./types";

export type {
  AcademyLessonSeed,
  AcademyTrackLessons,
  LessonArtifactSeed,
} from "./types";

/** Lessons for every track, in track order. */
export const academyLessons: AcademyTrackLessons[] = [
  aiFoundations,
  howAiModelsLearn,
  generativeAiExplained,
  meetMetaAiAndLlama,
  promptEngineeringMastery,
  buildWithLlama,
  aiAgentsAndAutomation,
  multimodalCreativeAi,
  aiInActionRealWorld,
  ideaToLaunchAiProduct,
];

const ARTIFACT_MARKER = /^\[artifact:([a-z0-9-]+)\]$/gm;

/** Keys of every `[artifact:<key>]` marker in lesson content, in order. */
export function artifactKeysInContent(content: string): string[] {
  return [...content.matchAll(ARTIFACT_MARKER)].map((match) => match[1]);
}

/**
 * Throws when the lesson catalog disagrees with the track catalog or with
 * itself: a track without lessons, a lesson count or total duration that
 * differs from the track's, duplicate slugs, or an artifact marker without a
 * matching artifact (and vice versa).
 */
export function validateAcademyLessons(): void {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const track of academyTracks) {
    const entry = academyLessons.find((t) => t.trackSlug === track.slug);
    if (!entry) {
      problems.push(`Track "${track.slug}" has no lessons.`);
      continue;
    }
    if (entry.lessons.length !== track.lessonCount) {
      problems.push(
        `Track "${track.slug}" plans ${track.lessonCount} lessons but has ${entry.lessons.length}.`,
      );
    }
    const minutes = entry.lessons.reduce(
      (sum, lesson) => sum + lesson.estimatedDurationMinutes,
      0,
    );
    if (minutes !== track.estimatedDurationMinutes) {
      problems.push(
        `Track "${track.slug}" is ${track.estimatedDurationMinutes} minutes but its lessons add up to ${minutes}.`,
      );
    }
    const slugs = new Set<string>();
    for (const lesson of entry.lessons) {
      if (slugs.has(lesson.slug)) {
        problems.push(`Track "${track.slug}" has two lessons with slug "${lesson.slug}".`);
      }
      slugs.add(lesson.slug);
      problems.push(...validateLesson(track.slug, lesson));
    }
  }

  for (const entry of academyLessons) {
    if (seen.has(entry.trackSlug)) {
      problems.push(`Track "${entry.trackSlug}" is listed twice.`);
    }
    seen.add(entry.trackSlug);
    if (!academyTracks.some((track) => track.slug === entry.trackSlug)) {
      problems.push(`Lessons reference unknown track "${entry.trackSlug}".`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Academy lesson catalog is invalid:\n- ${problems.join("\n- ")}`);
  }
}

function validateLesson(trackSlug: string, lesson: AcademyLessonSeed): string[] {
  const where = `${trackSlug}/${lesson.slug}`;
  const problems: string[] = [];
  const keys = new Set(lesson.artifacts.map((artifact) => artifact.key));

  if (keys.size !== lesson.artifacts.length) {
    problems.push(`Lesson "${where}" has duplicate artifact keys.`);
  }
  const referenced = new Set(artifactKeysInContent(lesson.content));
  for (const key of referenced) {
    if (!keys.has(key)) {
      problems.push(`Lesson "${where}" places artifact "${key}" but does not define it.`);
    }
  }
  for (const key of keys) {
    if (!referenced.has(key)) {
      problems.push(`Lesson "${where}" defines artifact "${key}" but never places it.`);
    }
  }
  if (lesson.keyTakeaways.length === 0) {
    problems.push(`Lesson "${where}" has no key takeaways.`);
  }
  return problems;
}
