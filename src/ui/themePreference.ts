import { Appearance, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";
export type VisualStyle = "standard" | "classic_windows";

const themeModeKey = "kotoba-pocket-theme-mode";
const visualStyleKey = "kotoba-pocket-visual-style";

function isVisualStyle(value: string | null): value is VisualStyle {
  return value === "standard" || value === "classic_windows";
}

export function getInitialThemeMode(): ThemeMode {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const stored = window.localStorage.getItem(themeModeKey);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  }
  return "system";
}

export function getInitialColorScheme(): "light" | "dark" {
  const mode = getInitialThemeMode();
  if (mode === "dark" || mode === "light") return mode;
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export async function getStoredThemeMode(): Promise<ThemeMode> {
  if (Platform.OS === "web" && typeof window !== "undefined") return getInitialThemeMode();
  const stored = await AsyncStorage.getItem(themeModeKey);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(themeModeKey, mode);
  } else {
    await AsyncStorage.setItem(themeModeKey, mode);
  }
  const forcedScheme = mode === "system" ? null : mode;
  const appearance = Appearance as unknown as { setColorScheme?: (scheme: "light" | "dark" | null) => void };
  appearance.setColorScheme?.(forcedScheme);
}

export function getInitialVisualStyle(): VisualStyle {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const stored = window.localStorage.getItem(visualStyleKey);
    if (isVisualStyle(stored)) return stored;
  }
  return "standard";
}

export async function getStoredVisualStyle(): Promise<VisualStyle> {
  if (Platform.OS === "web" && typeof window !== "undefined") return getInitialVisualStyle();
  const stored = await AsyncStorage.getItem(visualStyleKey);
  if (isVisualStyle(stored)) return stored;
  return "standard";
}

export async function setStoredVisualStyle(style: VisualStyle): Promise<void> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(visualStyleKey, style);
    return;
  }
  await AsyncStorage.setItem(visualStyleKey, style);
}

export function reloadForThemeChange(): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.reload();
  }
}
