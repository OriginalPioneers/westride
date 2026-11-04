import "server-only";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { EvidenceClass, IdeaFactoryFinding, MuseFindingVerdict } from "@westride/db";
import type { EvaluationWithFindings } from "@westride/db/idea-factory";
import type { IdeaWithDetails } from "@westride/db/ideas";
import { IDEA_TYPE_LABELS } from "@/lib/ideas/filters";
import { EVIDENCE_CLASS_LABELS, getAgent } from "./agents";
import { getMuseModel } from "./pricing";
import {
  READINESS_BAND_LABELS,
  READINESS_BAND_SUMMARIES,
  readinessFor,
  takeawaysFor,
  type Readiness,
} from "./readiness";

/**
 * The evaluation as a clean US Letter (8.5" × 11") report. Rendered on the
 * server with react-pdf; colours and sizes here are print values, not UI
 * tokens, because the PDF has no access to the theme.
 */

const INK = "#1c1917";
const MUTED = "#57534e";
const FAINT = "#a8a29e";
const RULE = "#e7e5e4";
const PANEL = "#fafaf9";
const ACCENT = "#4f46e5";
const ACCENT_SOFT = "#eef2ff";

const VERDICT_COLORS: Record<MuseFindingVerdict, { ink: string; fill: string; label: string }> = {
  PROMISING: { ink: "#166534", fill: "#dcfce7", label: "Promising" },
  CAUTION: { ink: "#854d0e", fill: "#fef9c3", label: "Caution" },
  BLOCKER: { ink: "#991b1b", fill: "#fee2e2", label: "Blocker" },
};

const EVIDENCE_COLORS: Record<EvidenceClass, { ink: string; fill: string }> = {
  VERIFIED: { ink: "#166534", fill: "#dcfce7" },
  ESTIMATE: { ink: "#1e40af", fill: "#dbeafe" },
  ASSUMPTION: { ink: "#854d0e", fill: "#fef9c3" },
  HYPOTHESIS: { ink: "#6b21a8", fill: "#f3e8ff" },
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingBottom: 60,
    paddingHorizontal: 54,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.45,
    color: INK,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: ACCENT,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", marginTop: 4, lineHeight: 1.15 },
  subtitle: { fontSize: 11, color: MUTED, marginTop: 6 },
  meta: { fontSize: 8.5, color: FAINT, marginTop: 10 },
  hero: {
    marginTop: 22,
    flexDirection: "row",
    gap: 14,
  },
  scoreCard: {
    width: 170,
    padding: 14,
    backgroundColor: ACCENT_SOFT,
    borderRadius: 8,
  },
  scoreNumber: { fontSize: 40, fontFamily: "Helvetica-Bold", color: ACCENT, lineHeight: 1 },
  scoreBand: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 6 },
  scoreNote: { fontSize: 8.5, color: MUTED, marginTop: 6 },
  takeaways: {
    flex: 1,
    padding: 14,
    backgroundColor: PANEL,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: RULE,
  },
  panelTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  takeaway: { flexDirection: "row", gap: 6, marginBottom: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 3 },
  consensus: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  barTrack: { flex: 1, height: 7, backgroundColor: RULE, borderRadius: 4 },
  barFill: { height: 7, backgroundColor: ACCENT, borderRadius: 4 },
  section: { marginTop: 22 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    marginBottom: 10,
  },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  paragraph: { marginBottom: 6 },
  bullet: { flexDirection: "row", gap: 6, marginBottom: 3 },
  bulletMark: { width: 10, color: MUTED },
  twoCol: { flexDirection: "row", gap: 18 },
  col: { flex: 1 },
  advisorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  advisorName: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  advisorTagline: { fontSize: 9, color: MUTED },
  pill: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  finding: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  findingHead: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  claim: { fontFamily: "Helvetica-Bold", flex: 1 },
  detail: { color: MUTED, marginTop: 2 },
  source: { fontSize: 8, color: FAINT, marginTop: 1 },
  footer: {
    position: "absolute",
    left: 54,
    right: 54,
    bottom: 28,
    // Fixed nodes are re-laid-out per page; a unitless lineHeight compounds
    // on each pass and blows up the box, so pin the height in points.
    height: 22,
    lineHeight: "10pt",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: FAINT,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 6,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
});

// ---------------------------------------------------------------------------
// Light Markdown → paragraphs and bullets. Enough for advisor prose.
// ---------------------------------------------------------------------------

type Block = { kind: "p"; text: string } | { kind: "li"; text: string } | { kind: "h"; text: string };

function inline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,;:!?])/g, "$1$2")
    .replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,;:!?])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function blocksFrom(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "p", text: inline(paragraph.join(" ")) });
      paragraph = [];
    }
  };
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading?.[1]) {
      flush();
      blocks.push({ kind: "h", text: inline(heading[1]) });
      continue;
    }
    const item = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (item?.[1]) {
      flush();
      blocks.push({ kind: "li", text: inline(item[1]) });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

function Prose({ markdown }: { markdown: string }) {
  const blocks = blocksFrom(markdown);
  return (
    <View>
      {blocks.map((block, index) => {
        if (block.kind === "h") {
          return (
            <Text key={index} style={styles.h3}>
              {block.text}
            </Text>
          );
        }
        if (block.kind === "li") {
          return (
            <View key={index} style={styles.bullet}>
              <Text style={styles.bulletMark}>•</Text>
              <Text style={{ flex: 1 }}>{block.text}</Text>
            </View>
          );
        }
        return (
          <Text key={index} style={styles.paragraph}>
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

function Bullets({ items, numbered = false }: { items: string[]; numbered?: boolean }) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={index} style={styles.bullet}>
          <Text style={styles.bulletMark}>{numbered ? `${index + 1}.` : "•"}</Text>
          <Text style={{ flex: 1 }}>{inline(item)}</Text>
        </View>
      ))}
    </View>
  );
}

function Pill({ label, ink, fill }: { label: string; ink: string; fill: string }) {
  return <Text style={[styles.pill, { color: ink, backgroundColor: fill }]}>{label}</Text>;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function Cover({
  idea,
  evaluation,
  readiness,
}: {
  idea: IdeaWithDetails;
  evaluation: EvaluationWithFindings;
  readiness: Readiness;
}) {
  const model = getMuseModel(evaluation.model)?.label ?? evaluation.model;
  const takeaways = takeawaysFor(evaluation, 4);
  const share = readiness.finished > 0 ? readiness.recommending / readiness.finished : 0;
  const toneColor = { success: "#16a34a", warning: "#d97706", info: "#2563eb" } as const;
  return (
    <View>
      <Text style={styles.eyebrow}>Idea Workshop report</Text>
      <Text style={styles.title}>{idea.name}</Text>
      <Text style={styles.subtitle}>
        {IDEA_TYPE_LABELS[idea.type]} idea · evaluated by {readiness.total} advisor
        {readiness.total === 1 ? "" : "s"}
      </Text>
      <Text style={styles.meta}>
        {formatDate(evaluation.completedAt ?? evaluation.createdAt)} · {model} · Prepared by the AI
        Advisory Team in WeStride&apos;s Idea Workshop
      </Text>

      <View style={styles.hero}>
        <View style={styles.scoreCard}>
          <Text style={styles.eyebrow}>Overall readiness</Text>
          <Text style={[styles.scoreNumber, { marginTop: 8 }]}>
            {readiness.score === null ? "—" : `${readiness.score}%`}
          </Text>
          <Text style={styles.scoreBand}>
            {readiness.band ? READINESS_BAND_LABELS[readiness.band] : "Not scored"}
          </Text>
          <Text style={styles.scoreNote}>
            {readiness.band
              ? READINESS_BAND_SUMMARIES[readiness.band]
              : "No advisor finished this evaluation."}
          </Text>
        </View>
        <View style={styles.takeaways}>
          <Text style={styles.panelTitle}>Key takeaways</Text>
          {takeaways.length === 0 ? (
            <Text style={{ color: MUTED }}>The synthesis did not finish.</Text>
          ) : (
            takeaways.map((item, index) => (
              <View key={index} style={styles.takeaway}>
                <View style={[styles.dot, { backgroundColor: toneColor[item.tone] }]} />
                <Text style={{ flex: 1 }}>{inline(item.text)}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.consensus}>
        <View style={{ width: 150 }}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Advisor consensus</Text>
          <Text style={{ fontSize: 8.5, color: MUTED }}>
            {readiness.recommending} of {readiness.finished} see a path forward
          </Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(share * 100)}%` }]} />
        </View>
        <Text style={{ fontFamily: "Helvetica-Bold", width: 36, textAlign: "right" }}>
          {Math.round(share * 100)}%
        </Text>
      </View>
    </View>
  );
}

function Synthesis({ evaluation }: { evaluation: EvaluationWithFindings }) {
  const synthesis = evaluation.synthesis;
  if (!synthesis) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What the team found, taken together</Text>
        <Text style={{ color: MUTED }}>
          {evaluation.error ?? "Muse did not finish synthesising the advisors' findings."}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>What the team found, taken together</Text>
      <Prose markdown={synthesis.overview} />

      <View style={[styles.twoCol, { marginTop: 8 }]}>
        {synthesis.agreements.length > 0 ? (
          <View style={styles.col}>
            <Text style={styles.h3}>Where the advisors agree</Text>
            <Bullets items={synthesis.agreements} />
          </View>
        ) : null}
        {synthesis.risks.length > 0 ? (
          <View style={styles.col}>
            <Text style={styles.h3}>Risks to watch</Text>
            <Bullets items={synthesis.risks} />
          </View>
        ) : null}
      </View>

      {synthesis.disagreements.length > 0 ? (
        <View>
          <Text style={styles.h3}>Where they disagree</Text>
          {synthesis.disagreements.map((item, index) => (
            <View key={index} style={{ marginBottom: 6 }}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{inline(item.topic)}</Text>
              <Text>{inline(item.positions)}</Text>
              <Text style={{ color: MUTED }}>How to settle it: {inline(item.resolution)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.h3}>Recommendation</Text>
      <Prose markdown={synthesis.recommendation} />

      {synthesis.questionsForYou.length > 0 ? (
        <View>
          <Text style={styles.h3}>Questions for you</Text>
          <Bullets items={synthesis.questionsForYou} numbered />
        </View>
      ) : null}
    </View>
  );
}

function Advisor({ finding, score }: { finding: IdeaFactoryFinding; score: number | null }) {
  const agent = getAgent(finding.agentSlug);
  const verdict = finding.verdict ? VERDICT_COLORS[finding.verdict] : null;
  return (
    <View style={styles.section} wrap>
      <View style={styles.advisorHeader} minPresenceAhead={80}>
        <View style={{ flex: 1 }}>
          <Text style={styles.advisorName}>{agent?.name ?? finding.agentSlug}</Text>
          {agent ? <Text style={styles.advisorTagline}>{agent.tagline}</Text> : null}
        </View>
        {score !== null ? (
          <Text style={{ fontFamily: "Helvetica-Bold", color: ACCENT }}>{score}%</Text>
        ) : null}
        {verdict ? <Pill label={verdict.label} ink={verdict.ink} fill={verdict.fill} /> : null}
        {finding.status === "FAILED" ? (
          <Pill label="Did not finish" ink="#991b1b" fill="#fee2e2" />
        ) : null}
      </View>

      {finding.status === "FAILED" ? (
        <Text style={{ color: MUTED }}>{finding.error ?? "This advisor could not finish."}</Text>
      ) : null}
      {finding.summary ? <Prose markdown={finding.summary} /> : null}

      {finding.findings.map((item, index) => {
        const evidence = EVIDENCE_COLORS[item.evidenceClass];
        return (
          <View key={index} style={styles.finding} wrap={false}>
            <View style={styles.findingHead}>
              <Pill
                label={EVIDENCE_CLASS_LABELS[item.evidenceClass]}
                ink={evidence.ink}
                fill={evidence.fill}
              />
              <Text style={styles.claim}>{inline(item.claim)}</Text>
            </View>
            {item.detail ? <Text style={styles.detail}>{inline(item.detail)}</Text> : null}
            {item.sources.map((source, sourceIndex) => (
              <Text key={`${sourceIndex}-${source.url}`} style={styles.source}>
                {source.title ? `${inline(source.title)} — ` : ""}
                {source.url}
                {source.date ? ` (${source.date})` : ""}
              </Text>
            ))}
          </View>
        );
      })}

      {finding.nextSteps.length > 0 ? (
        <View>
          <Text style={styles.h3}>Next steps</Text>
          <Bullets items={finding.nextSteps} numbered />
        </View>
      ) : null}
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      {(Object.keys(EVIDENCE_COLORS) as EvidenceClass[]).map((key) => (
        <View key={key} style={styles.legendItem}>
          <Pill label={EVIDENCE_CLASS_LABELS[key]} ink={EVIDENCE_COLORS[key].ink} fill={EVIDENCE_COLORS[key].fill} />
        </View>
      ))}
      <Text style={{ fontSize: 8, color: FAINT, flex: 1 }}>
        Verified means a named, dated source was found. Everything else is the advisors&apos;
        reasoning and should be checked before you rely on it. Scores summarise verdicts and
        evidence; they are not predictions.
      </Text>
    </View>
  );
}

function Report({ idea, evaluation }: { idea: IdeaWithDetails; evaluation: EvaluationWithFindings }) {
  const readiness = readinessFor(evaluation);
  const scores = new Map(readiness.advisors.map((advisor) => [advisor.agentSlug, advisor.score]));
  const ordered = [...evaluation.findings].sort(
    (a, b) => (scores.get(b.agentSlug) ?? -1) - (scores.get(a.agentSlug) ?? -1),
  );
  return (
    <Document
      title={`${idea.name} — Idea Workshop report`}
      author="WeStride Idea Workshop"
      subject="AI advisory team evaluation"
    >
      <Page size="LETTER" style={styles.page}>
        <Cover idea={idea} evaluation={evaluation} readiness={readiness} />
        <Synthesis evaluation={evaluation} />
        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Advisor reports</Text>
          <Text style={{ color: MUTED }}>
            Each advisor reviewed the idea independently and labelled every finding with how it is
            evidenced. They are ordered from most to least confident.
          </Text>
          <Legend />
        </View>
        {ordered.map((finding) => (
          <Advisor key={finding.id} finding={finding} score={scores.get(finding.agentSlug) ?? null} />
        ))}
        <View style={styles.footer} fixed>
          <Text>WeStride · Idea Workshop · {idea.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Renders the report and returns the PDF bytes. */
export async function renderEvaluationReport(input: {
  idea: IdeaWithDetails;
  evaluation: EvaluationWithFindings;
}): Promise<Buffer> {
  const buffer = await renderToBuffer(<Report idea={input.idea} evaluation={input.evaluation} />);
  return Buffer.from(buffer);
}
