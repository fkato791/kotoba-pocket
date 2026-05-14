import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { logout, requestMagicLink } from "@/data/remote/apiClient";
import { supabase } from "@/data/remote/supabaseClient";
import { useSyncStore } from "@/features/sync/syncStore";
import type { SyncStatus } from "@/features/sync/syncStore";
import { syncWorker } from "@/features/sync/syncWorker";
import { getCurrentReviewPace, loadReviewPace, setReviewPace, type ReviewPace } from "@/features/review/reviewPreferences";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { Chip } from "@/ui/components/Chip";
import { ErrorBanner } from "@/ui/components/ErrorBanner";
import { SyncStatusBadge } from "@/ui/components/SyncStatusBadge";
import { colors, spacing } from "@/ui/theme";
import {
  getStoredThemeMode,
  getStoredVisualStyle,
  reloadForThemeChange,
  setStoredThemeMode,
  setStoredVisualStyle,
  type ThemeMode,
  type VisualStyle
} from "@/ui/themePreference";

export function SettingsScreen(): JSX.Element {
  const [email, setEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("standard");
  const [reviewPace, setReviewPaceState] = useState<ReviewPace>(getCurrentReviewPace());
  const syncStatus = useSyncStore(state => state.status);
  const syncError = useSyncStore(state => state.error);
  const lastSyncedAt = useSyncStore(state => state.lastSyncedAt);
  const pulledCount = useSyncStore(state => state.pulledCount);
  const conflictCount = useSyncStore(state => state.conflictCount);

  useEffect(() => {
    void refreshSession();
    void getStoredThemeMode().then(setThemeMode);
    void getStoredVisualStyle().then(setVisualStyle);
    void loadReviewPace().then(setReviewPaceState);
    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });
    return () => subscription.data.subscription.unsubscribe();
  }, []);

  async function refreshSession(): Promise<void> {
    const session = await supabase.auth.getSession();
    setSessionEmail(session.data.session?.user.email ?? null);
  }

  async function sendMagicLink(): Promise<void> {
    try {
      await requestMagicLink(email.trim());
      Alert.alert("メールを確認してください", "新しいマジックリンクを送信しました。古いリンクではなく、今届いたリンクを開いてください。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "送信できませんでした";
      if (message.toLowerCase().includes("rate limit")) {
        Alert.alert("少し待ってください", "短時間にメールを送りすぎています。数分待ってから再試行してください。");
        return;
      }
      Alert.alert("送信できませんでした", message);
    }
  }

  async function resetLogin(): Promise<void> {
    await logout().catch(() => undefined);
    setSessionEmail(null);
    Alert.alert("ログイン状態をリセットしました", "もう一度マジックリンクを送ってください。");
  }

  async function updateThemeMode(nextMode: ThemeMode): Promise<void> {
    setThemeMode(nextMode);
    await setStoredThemeMode(nextMode);
    if (Platform.OS === "web") {
      reloadForThemeChange();
      return;
    }
    Alert.alert("テーマを保存しました", "次回起動時に表示へ反映されます。");
  }

  async function updateVisualStyle(nextStyle: VisualStyle): Promise<void> {
    setVisualStyle(nextStyle);
    await setStoredVisualStyle(nextStyle);
    if (Platform.OS === "web") {
      reloadForThemeChange();
      return;
    }
    Alert.alert("見た目を保存しました", "次回起動時に表示へ反映されます。");
  }

  async function updateReviewPace(nextPace: ReviewPace): Promise<void> {
    setReviewPaceState(nextPace);
    await setReviewPace(nextPace);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="アカウント">
        <AppInput label="メール" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <AppButton label="マジックリンクを送る" disabled={!email.trim()} onPress={() => void sendMagicLink()} />
        <AppButton label="ログイン状態を確認" variant="secondary" onPress={() => void refreshSession()} />
        <AppButton label="ログイン状態をリセット" variant="secondary" onPress={() => void resetLogin()} />
        <Text style={styles.text}>ログイン: {sessionEmail ?? "未ログイン"}</Text>
      </Section>

      <Section title="同期">
        <SyncStatusBadge />
        <Text style={styles.text}>現在の状態: {syncStatusLabels[syncStatus]}</Text>
        <Text style={styles.text}>最終同期: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString("ja-JP") : "未同期"}</Text>
        <Text style={styles.text}>今回の取得: {pulledCount}件 / 競合: {conflictCount}件</Text>
        {syncError ? <ErrorBanner title="同期できませんでした" message={syncError} /> : null}
        <AppButton label="今すぐ同期" variant="secondary" onPress={() => void syncWorker.flush()} />
      </Section>

      <Section title="音声">
        <Text style={styles.text}>英語の発音は端末のTTSを優先して再生します。</Text>
      </Section>

      <Section title="学習">
        <Text style={styles.text}>復習ボタンは「もう一度 / むずかしい / できた / かんたん」で記録します。</Text>
        <View style={styles.pacePanel}>
          <Text style={styles.textStrong}>復習間隔</Text>
          <Text style={styles.helperText}>忘れやすい時は「集中」、余裕を持って進めたい時は「ゆっくり」を選びます。</Text>
          <View style={styles.chipRow}>
            {reviewPaceItems.map(item => (
              <Chip
                key={item.value}
                label={item.label}
                selected={reviewPace === item.value}
                onPress={() => void updateReviewPace(item.value)}
              />
            ))}
          </View>
          <Text style={styles.helperText}>{reviewPaceDescriptions[reviewPace]}</Text>
        </View>
      </Section>

      <Section title="表示">
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.textStrong}>ダークモード</Text>
            <Text style={styles.helperText}>背景を暗くして、夜や暗い場所でも読みやすくします。</Text>
          </View>
          <Switch
            accessibilityLabel="ダークモード"
            value={themeMode === "dark"}
            onValueChange={value => void updateThemeMode(value ? "dark" : "light")}
          />
        </View>
        <AppButton label="端末設定に合わせる" variant="secondary" onPress={() => void updateThemeMode("system")} />
        <Text style={styles.helperText}>現在: {themeModeLabels[themeMode]}</Text>
        <View style={styles.visualPanel}>
          <Text style={styles.textStrong}>見た目</Text>
          <Text style={styles.helperText}>現在のデザインを基準に、好みの雰囲気へ切り替えられます。</Text>
          <View style={styles.chipRow}>
            {visualStyleItems.map(item => (
              <Chip
                key={item.value}
                label={item.label}
                selected={visualStyle === item.value}
                onPress={() => void updateVisualStyle(item.value)}
              />
            ))}
          </View>
          <View style={styles.previewGrid}>
            {visualStyleItems.map(item => (
              <VisualStylePreview key={item.value} item={item} selected={visualStyle === item.value} />
            ))}
          </View>
        </View>
      </Section>

      <Section title="プライバシー">
        <Text style={styles.text}>デッキは非公開が初期値です。共有リンクを作る前には確認を求めます。</Text>
        <AppButton label="データをエクスポート" variant="secondary" onPress={() => Alert.alert("データ画面から実行できます")} />
        <AppButton label="アカウント削除" variant="danger" onPress={() => Alert.alert("確認", "リモートデータ削除APIを呼び出します")} />
      </Section>

      <Section title="アプリ言語">
        <Text style={styles.text}>日本語</Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

function VisualStylePreview({
  item,
  selected
}: {
  item: VisualStyleItem;
  selected: boolean;
}): JSX.Element {
  return (
    <View style={[styles.previewCard, selected && styles.previewCardSelected]}>
      <View style={[styles.previewTop, { backgroundColor: item.preview.primary }]} />
      <View style={[styles.previewBody, { backgroundColor: item.preview.surface, borderColor: item.preview.border }]}>
        <View style={[styles.previewLineStrong, { backgroundColor: item.preview.text }]} />
        <View style={[styles.previewLine, { backgroundColor: item.preview.muted }]} />
        <View style={styles.previewCells}>
          <View style={[styles.previewCell, { backgroundColor: item.preview.soft }]} />
          <View style={[styles.previewCell, { backgroundColor: item.preview.primary }]} />
          <View style={[styles.previewCell, { backgroundColor: item.preview.soft }]} />
        </View>
      </View>
      <Text style={styles.previewLabel}>{item.label}</Text>
      <Text style={styles.previewDescription}>{item.description}</Text>
    </View>
  );
}

const syncStatusLabels: Record<SyncStatus, string> = {
  offline: "オフライン",
  syncing: "同期中",
  synced: "同期済み",
  signed_out: "ログイン待ち",
  error: "同期エラー"
};

const themeModeLabels: Record<ThemeMode, string> = {
  system: "端末設定に合わせる",
  light: "ライトモード",
  dark: "ダークモード"
};

interface VisualStyleItem {
  label: string;
  value: VisualStyle;
  description: string;
  preview: {
    primary: string;
    surface: string;
    border: string;
    text: string;
    muted: string;
    soft: string;
  };
}

const visualStyleItems: VisualStyleItem[] = [
  {
    label: "スタンダード",
    value: "standard",
    description: "現在の見た目です。",
    preview: { primary: "#2563EB", surface: "#FFFFFF", border: "#CBD5E1", text: "#111827", muted: "#64748B", soft: "#EFF6FF" }
  },
  {
    label: "クラシック",
    value: "classic_windows",
    description: "Windows 2000風の青い背景とグレーの画面です。",
    preview: { primary: "#000080", surface: "#D4D0C8", border: "#808080", text: "#000000", muted: "#1F2933", soft: "#3A6EA5" }
  }
];

const reviewPaceItems: { label: string; value: ReviewPace }[] = [
  { label: "集中", value: "focused" },
  { label: "標準", value: "standard" },
  { label: "ゆっくり", value: "relaxed" }
];

const reviewPaceDescriptions: Record<ReviewPace, string> = {
  focused: "短めの間隔で復習します。試験前や苦手語を固めたい時に向いています。",
  standard: "標準的な間隔で復習します。迷ったらこの設定がおすすめです。",
  relaxed: "長めの間隔で復習します。負担を減らして続けたい時に向いています。"
};

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background, paddingBottom: 112 },
  section: {
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "900" },
  text: { color: colors.text, lineHeight: 22 },
  textStrong: { color: colors.text, lineHeight: 22, fontWeight: "900" },
  helperText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  pacePanel: { gap: spacing.sm },
  visualPanel: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  previewCard: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: "hidden"
  },
  previewCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  previewTop: { height: 10 },
  previewBody: { gap: spacing.xs, padding: spacing.sm, borderBottomWidth: 1 },
  previewLineStrong: { width: "62%", height: 8, borderRadius: 8 },
  previewLine: { width: "82%", height: 7, borderRadius: 8 },
  previewCells: { flexDirection: "row", gap: spacing.xs },
  previewCell: { flex: 1, height: 18, borderRadius: 5 },
  previewLabel: { color: colors.text, fontWeight: "900", paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  previewDescription: { color: colors.muted, fontSize: 12, lineHeight: 17, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm }
});
