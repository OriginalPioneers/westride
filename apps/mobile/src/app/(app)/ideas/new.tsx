import { WestrideApiError, type IdeaType } from "@westride/api-client";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { useApi } from "@/lib/api-context";
import { IDEA_TYPE_LABELS, IDEA_TYPES } from "@/lib/labels";
import { spacing } from "@/theme";

const TYPE_OPTIONS = IDEA_TYPES.map((value) => ({
  value,
  label: IDEA_TYPE_LABELS[value],
}));

export default function NewIdeaScreen() {
  const api = useApi();
  const router = useRouter();
  const [type, setType] = useState<IdeaType>("BUSINESS");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setError(null);
    setFieldErrors({});
    const categoryNames = categories
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!name.trim() || !description.trim() || categoryNames.length === 0) {
      setError("Name, description, and at least one category are required.");
      return;
    }
    setBusy(true);
    try {
      const idea = await api.createIdea({
        type,
        name: name.trim(),
        description: description.trim(),
        categories: categoryNames,
        isPublic,
      });
      router.replace({ pathname: "/ideas/[id]", params: { id: idea.id } });
    } catch (cause) {
      if (cause instanceof WestrideApiError) {
        setError(cause.message);
        setFieldErrors(cause.fields ?? {});
      } else {
        setError("Could not create the idea.");
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
          Give the idea a name, say what it is, and file it under at least one category.
        </Text>
        <View style={styles.block}>
          <Text variant="label">Kind of idea</Text>
          <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} />
        </View>
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
        <Field
          error={fieldErrors.categories}
          label="Categories"
          onChangeText={setCategories}
          placeholder="Community, Sustainability"
          value={categories}
        />
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
        <Button label="Create idea" loading={busy} onPress={() => void handleCreate()} />
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
