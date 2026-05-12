import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { BookOpen, Database, Home, RotateCcw, Settings } from "lucide-react-native";
import { colors, spacing } from "@/ui/theme";

const tabs = [
  { label: "ホーム", href: "/", icon: Home },
  { label: "単語", href: "/collection", icon: BookOpen },
  { label: "復習", href: "/review", icon: RotateCcw },
  { label: "データ", href: "/import-export", icon: Database },
  { label: "設定", href: "/settings", icon: Settings }
] as const;

export function BottomNavigation(): JSX.Element {
  const pathname = usePathname();
  return (
    <View style={styles.wrap}>
      {tabs.map(tab => {
        const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
        const Icon = tab.icon;
        return (
          <Pressable
            key={tab.href}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label}へ移動`}
            accessibilityState={{ selected: active }}
            onPress={() => router.push(tab.href)}
            style={[styles.item, active && styles.activeItem]}
          >
            <Icon size={20} color={active ? colors.primary : colors.muted} />
            <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 68,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-around"
  },
  item: {
    minWidth: 56,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 8
  },
  activeItem: { backgroundColor: colors.primarySoft },
  label: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  activeLabel: { color: colors.primary }
});
