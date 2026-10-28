import {
  Text as NativeText,
  StyleSheet,
  type TextProps as NativeTextProps,
} from "react-native";
import { colors, fontSize } from "@/theme";

type TextVariant = "title" | "heading" | "body" | "supporting" | "label";

export type TextProps = NativeTextProps & {
  variant?: TextVariant;
};

export function Text({ variant = "body", style, ...props }: TextProps) {
  return (
    <NativeText
      accessibilityRole={
        variant === "title" || variant === "heading" ? "header" : undefined
      }
      style={[styles[variant], style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xlarge,
    fontWeight: "700",
    lineHeight: 30,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: fontSize.medium,
    fontWeight: "600",
    lineHeight: 22,
  },
  body: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  supporting: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.small,
    fontWeight: "500",
    lineHeight: 16,
  },
});
