import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { logout, requestMagicLink } from "@/data/remote/apiClient";
import { supabase } from "@/data/remote/supabaseClient";
import { useSyncStore } from "@/features/sync/syncStore";
import type { SyncStatus } from "@/features/sync/syncStore";
import { syncWorker } from "@/features/sync/syncWorker";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { ErrorBanner } from "@/ui/components/ErrorBanner";
import { SyncStatusBadge } from "@/ui/components/SyncStatusBadge";
import { colors, spacing } from "@/ui/theme";

export function SettingsScreen(): JSX.Element {
  const [email, setEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const syncStatus = useSyncStore(state => state.status);
  const syncError = useSyncStore(state => state.error);
  const lastSyncedAt = useSyncStore(state => state.lastSyncedAt);
  const pulledCount = useSyncStore(state => state.pulledCount);
  const conflictCount = useSyncStore(state => state.conflictCount);

  useEffect(() => {
    void refreshSession();
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

const syncStatusLabels: Record<SyncStatus, string> = {
  offline: "オフライン",
  syncing: "同期中",
  synced: "同期済み",
  signed_out: "ログイン待ち",
  error: "同期エラー"
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
  text: { color: colors.text, lineHeight: 22 }
});
