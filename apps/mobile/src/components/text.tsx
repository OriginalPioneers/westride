import {
  Text as NativeText,
  StyleSheet,
  type TextProps as NativeTextProps,
} from "react-native";
import { useColors } from "@/lib/theme-preference";
import { fontSize, fonts } from "@/theme";

type TextVariant =
  | "display"
  | "title"
  | "heading"
  | "body"
  | "supporting"
  | "label";

export type TextProps = NativeTextProps & {
  variant?: TextVariant;
};

export function Text({ variant = "body", style, ...props }: TextProps) {
  const colors = useColors();
  const color =
    variant === "supporting" || variant === "label" ? colors.textSecondary : colors.textPrimary;

  return (
    <NativeText
      accessibilityRole={
        variant === "display" || variant === "title" || variant === "heading"
          ? "header"
          : undefined
      }
      style={[styles[variant], { color }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: fonts.bold,
    fontSize: fontSize.display,
    lineHeight: 38,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xlarge,
    lineHeight: 30,
  },
  heading: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.medium,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  supporting: {
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.small,
    lineHeight: 16,
  },
});
