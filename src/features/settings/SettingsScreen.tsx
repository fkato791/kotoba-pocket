import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { requestMagicLink } from "@/data/remote/apiClient";
import { supabase } from "@/data/remote/supabaseClient";
import { useSyncStore } from "@/features/sync/syncStore";
import { syncWorker } from "@/features/sync/syncWorker";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { SyncStatusBadge } from "@/ui/components/SyncStatusBadge";
import { colors, spacing } from "@/ui/theme";
import { useState } from "react";

export function SettingsScreen(): JSX.Element {
  const [email, setEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const syncStatus = useSyncStore(state => state.status);
  const syncError = useSyncStore(state => state.error);

  async function refreshSession(): Promise<void> {
    const session = await supabase.auth.getSession();
    setSessionEmail(session.data.session?.user.email ?? null);
  }

  async function sendMagicLink(): Promise<void> {
    try {
      await requestMagicLink(email);
      Alert.alert("メールを確認してください", "マジックリンクを送信しました。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "送信できませんでした";
      if (message.toLowerCase().includes("rate limit")) {
        Alert.alert("少し待ってください", "短時間にメールを送りすぎています。数分待ってから再試行してください。");
        return;
      }
      Alert.alert("送信できませんでした", message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="アカウント">
        <AppInput label="メール" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <AppButton label="マジックリンクを送る" onPress={() => void sendMagicLink()} />
        <AppButton label="ログイン状態を確認" variant="secondary" onPress={() => void refreshSession()} />
        <Text style={styles.text}>ログイン: {sessionEmail ?? "未ログイン"}</Text>
      </Section>
      <Section title="同期">
        <SyncStatusBadge />
        <Text style={styles.text}>現在の状態: {syncStatus}</Text>
        {syncError ? <Text style={styles.errorText}>{syncError}</Text> : null}
        <AppButton label="今すぐ同期" variant="secondary" onPress={() => void syncWorker.flush()} />
      </Section>
      <Section title="音声">
        <Text style={styles.text}>ネイティブTTSを優先します。速度設定はレビュー画面へ反映できます。</Text>
      </Section>
      <Section title="学習">
        <Text style={styles.text}>復習ボタンは「もう一度 / むずかしい / できた / かんたん」です。</Text>
      </Section>
      <Section title="プライバシー">
        <Text style={styles.text}>デッキは非公開が初期値です。共有リンク作成前に確認を求めます。</Text>
        <AppButton label="データをエクスポート" variant="secondary" onPress={() => Alert.alert("エクスポート画面から実行できます")} />
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

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
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
  ,
  errorText: { color: colors.danger, lineHeight: 20 }
});
