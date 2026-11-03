import {
  Text as NativeText,
  StyleSheet,
  type TextProps as NativeTextProps,
} from "react-native";
import { colors, fontSize, fonts } from "@/theme";

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
  return (
    <NativeText
      accessibilityRole={
        variant === "display" || variant === "title" || variant === "heading"
          ? "header"
          : undefined
      }
      style={[styles[variant], style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: fontSize.display,
    lineHeight: 38,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: fontSize.xlarge,
    lineHeight: 30,
  },
  heading: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: fontSize.medium,
    lineHeight: 22,
  },
  body: {
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  supporting: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: fontSize.small,
    lineHeight: 16,
  },
});
