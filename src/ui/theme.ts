import { getInitialColorScheme, getInitialVisualStyle } from "@/ui/themePreference";

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

const classicWindowsLightColors: typeof lightColors = {
  background: "#3A6EA5",
  surface: "#D4D0C8",
  text: "#000000",
  muted: "#1F2933",
  border: "#808080",
  primary: "#000080",
  primaryText: "#FFFFFF",
  success: "#008000",
  warning: "#7A4A00",
  danger: "#B00000",
  chip: "#D4D0C8",
  primarySoft: "#ECE9D8",
  successSoft: "#D9F2D9",
  warningSoft: "#FFF2CC",
  dangerSoft: "#F8D7DA",
  shadow: "#404040"
};

const classicWindowsDarkColors: typeof lightColors = {
  background: "#1B4F72",
  surface: "#3A3A3A",
  text: "#F5F5F5",
  muted: "#D0D0D0",
  border: "#707070",
  primary: "#4A90E2",
  primaryText: "#FFFFFF",
  success: "#5FD35F",
  warning: "#FFD166",
  danger: "#FF6B6B",
  chip: "#3A3A3A",
  primarySoft: "#12345A",
  successSoft: "#173D17",
  warningSoft: "#453000",
  dangerSoft: "#4D1616",
  shadow: "#000000"
};

function selectColors(): typeof lightColors {
  const scheme = getInitialColorScheme();
  if (visualStyle === "classic_windows") return scheme === "dark" ? classicWindowsDarkColors : classicWindowsLightColors;
  return scheme === "dark" ? darkColors : lightColors;
}

export const visualStyle = getInitialVisualStyle();
export const colors = selectColors();
export const isClassicWindows = visualStyle === "classic_windows";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
};
