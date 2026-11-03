import { WestrideApiError } from "@westride/api-client";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { useApi } from "@/lib/api-context";
import { useRequest } from "@/lib/use-request";
import { spacing } from "@/theme";

export default function NewAgentScreen() {
  const api = useApi();
  const router = useRouter();
  const loadIdeas = useCallback(
    (signal: AbortSignal) => api.listIdeas({ view: "mine" }, { signal }),
    [api],
  );
  const loadProjects = useCallback(
    (signal: AbortSignal) => api.listProjects({ mine: true }, { signal }),
    [api],
  );
  const { data: ideas } = useRequest(loadIdeas);
  const { data: projects } = useRequest(loadProjects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [firstTicket, setFirstTicket] = useState("");
  const [ideaId, setIdeaId] = useState("none");
  const [projectId, setProjectId] = useState("none");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const ideaOptions = [
    { value: "none", label: "No idea" },
    ...(ideas ?? []).map((idea) => ({ value: idea.id, label: idea.name })),
  ];
  const projectOptions = [
    { value: "none", label: "No build" },
    ...(projects ?? []).map((project) => ({ value: project.id, label: project.name })),
  ];

  async function handleCreate() {
    setError(null);
    setFieldErrors({});
    setBusy(true);
    try {
      const agent = await api.createAgent({
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim() || undefined,
        isPublic,
        ideaId: ideaId === "none" ? null : ideaId,
        projectId: projectId === "none" ? null : projectId,
        firstTicket: firstTicket.trim() || undefined,
      });
      router.replace({ pathname: "/agents/[id]", params: { id: agent.id } });
    } catch (cause) {
      if (cause instanceof WestrideApiError) {
        setError(cause.message);
        setFieldErrors(cause.fields ?? {});
      } else {
        setError("Could not create the agent.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <Screen>
        <Text variant="supporting">
          Give the agent a standing brief. A first ticket gives it something to do.
        </Text>
        <Field
          error={fieldErrors.name}
          label="Name"
          maxLength={80}
          onChangeText={setName}
          value={name}
        />
        <Field
          error={fieldErrors.description}
          label="Description"
          maxLength={2000}
          multiline
          onChangeText={setDescription}
          value={description}
        />
        <Field
          error={fieldErrors.instructions}
          label="Instructions"
          maxLength={8000}
          multiline
          onChangeText={setInstructions}
          placeholder="The standing brief every job starts from"
          value={instructions}
        />
        <Field
          error={fieldErrors.firstTicket}
          label="First ticket"
          onChangeText={setFirstTicket}
          placeholder="Optional. What should it do first?"
          value={firstTicket}
        />
        <View style={styles.block}>
          <Text variant="label">Linked idea</Text>
          <Segmented options={ideaOptions} value={ideaId} onChange={setIdeaId} />
        </View>
        <View style={styles.block}>
          <Text variant="label">Linked build</Text>
          <Segmented options={projectOptions} value={projectId} onChange={setProjectId} />
        </View>
        <View style={styles.block}>
          <Text variant="label">Who can see it</Text>
          <Segmented
            options={[
              { value: "public", label: "Public" },
              { value: "private", label: "Private" },
            ]}
            value={isPublic ? "public" : "private"}
            onChange={(value) => setIsPublic(value === "public")}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Create agent" loading={busy} onPress={() => void handleCreate()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  block: {
    gap: spacing(1),
  },
  error: {
    color: "#9b2c2c",
  },
});
