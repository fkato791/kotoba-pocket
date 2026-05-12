import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { listDailyReviewCounts, type DailyReviewCount } from "@/data/repositories/cardRepository";
import { HabitTracker } from "@/features/home/HabitTracker";
import { colors, spacing } from "@/ui/theme";

export function StudyStatsScreen(): JSX.Element {
  const [activity, setActivity] = useState<DailyReviewCount[]>([]);

  useFocusEffect(
    useCallback(() => {
      void listDailyReviewCounts(365).then(setActivity);
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>学習記録</Text>
        <Text style={styles.subtitle}>過去365日の復習ペースを確認できます。</Text>
      </View>
      <HabitTracker data={activity} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 112,
    backgroundColor: colors.background
  },
  header: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 }
});
