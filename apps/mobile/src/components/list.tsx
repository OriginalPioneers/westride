import { useRouter, type Href } from "expo-router";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "@/theme";
import { Text } from "./text";

export function ListSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const rows = Children.toArray(children);

  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

type ListRowProps = {
  label: string;
  value?: string;
  leading?: string;
  href?: Href;
};

export function ListRow({ label, value, leading, href }: ListRowProps) {
  const router = useRouter();
  const content = (
    <>
      {leading ? (
        <Text variant="supporting" style={styles.leading}>
          {leading}
        </Text>
      ) : null}
      <Text style={styles.label}>{label}</Text>
      {value ? <Text variant="supporting">{value}</Text> : null}
      {href ? (
        <Text variant="supporting" style={styles.chevron}>
          ›
        </Text>
      ) : null}
    </>
  );

  if (!href) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing(2),
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderColor: colors.border,
    borderRadius: radius.container,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing(4),
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  rowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  leading: {
    minWidth: spacing(5),
  },
  label: {
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    lineHeight: 20,
  },
});
