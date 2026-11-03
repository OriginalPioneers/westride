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

export default function NewBuildScreen() {
  const api = useApi();
  const router = useRouter();
  const loadIdeas = useCallback(
    (signal: AbortSignal) => api.listIdeas({ view: "mine" }, { signal }),
    [api],
  );
  const { data: ideas } = useRequest(loadIdeas);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ideaId, setIdeaId] = useState<string>("none");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const ideaOptions = [
    { value: "none", label: "No idea" },
    ...(ideas ?? []).map((idea) => ({ value: idea.id, label: idea.name })),
  ];

  async function handleCreate() {
    setError(null);
    setFieldErrors({});
    setBusy(true);
    try {
      const project = await api.createProject({
        name: name.trim(),
        description: description.trim(),
        isPublic,
        ideaId: ideaId === "none" ? null : ideaId,
      });
      router.replace({ pathname: "/builds/[id]", params: { id: project.id } });
    } catch (cause) {
      if (cause instanceof WestrideApiError) {
        setError(cause.message);
        setFieldErrors(cause.fields ?? {});
      } else {
        setError("Could not create the build.");
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
          A build is a project with tickets and milestones. Link it to one of your ideas if you have one.
        </Text>
        <Field
          error={fieldErrors.name}
          label="Name"
          maxLength={120}
          onChangeText={setName}
          value={name}
        />
        <Field
          error={fieldErrors.description}
          label="Description"
          maxLength={8000}
          multiline
          onChangeText={setDescription}
          value={description}
        />
        <View style={styles.block}>
          <Text variant="label">Linked idea</Text>
          <Segmented options={ideaOptions} value={ideaId} onChange={setIdeaId} />
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
        <Button label="Create build" loading={busy} onPress={() => void handleCreate()} />
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
