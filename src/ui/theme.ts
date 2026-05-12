import { Appearance } from "react-native";

const lightColors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#64748B",
  border: "#CBD5E1",
  primary: "#2563EB",
  primaryText: "#FFFFFF",
  success: "#15803D",
  warning: "#B45309",
  danger: "#DC2626",
  chip: "#EEF2FF",
  primarySoft: "#EFF6FF",
  successSoft: "#DCFCE7",
  warningSoft: "#FEF3C7",
  dangerSoft: "#FEE2E2",
  shadow: "#0F172A"
};

const darkColors: typeof lightColors = {
  background: "#0F172A",
  surface: "#111827",
  text: "#F8FAFC",
  muted: "#CBD5E1",
  border: "#334155",
  primary: "#60A5FA",
  primaryText: "#0F172A",
  success: "#86EFAC",
  warning: "#FCD34D",
  danger: "#FCA5A5",
  chip: "#1E293B",
  primarySoft: "#172554",
  successSoft: "#14532D",
  warningSoft: "#451A03",
  dangerSoft: "#450A0A",
  shadow: "#000000"
};

export const colors = Appearance.getColorScheme() === "dark" ? darkColors : lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
};
