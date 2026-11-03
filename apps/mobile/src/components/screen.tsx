import { type ReactNode } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useColors } from "@/lib/theme-preference";
import { spacing } from "@/theme";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function ListScreen<T>({
  data,
  keyExtractor,
  renderItem,
  header,
  empty,
  refreshing,
  onRefresh,
}: {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  header?: ReactNode;
  empty?: ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const colors = useColors();

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => <>{renderItem(item)}</>}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header ? <View style={styles.header}>{header}</View> : undefined}
      ListEmptyComponent={empty ? <>{empty}</> : undefined}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: {
    padding: spacing(4),
    paddingBottom: spacing(12),
  },
  header: {
    marginBottom: spacing(4),
  },
  separator: {
    height: spacing(3),
  },
});
