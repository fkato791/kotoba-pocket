import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { requestMagicLink } from "@/data/remote/apiClient";
import { useSyncStore } from "@/features/sync/syncStore";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { SyncStatusBadge } from "@/ui/components/SyncStatusBadge";
import { colors, spacing } from "@/ui/theme";
import { useState } from "react";

export function SettingsScreen(): JSX.Element {
  const [email, setEmail] = useState("");
  const syncStatus = useSyncStore(state => state.status);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="アカウント">
        <AppInput label="メール" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <AppButton label="マジックリンクを送る" onPress={() => void requestMagicLink(email).then(() => Alert.alert("メールを確認してください"))} />
      </Section>
      <Section title="同期">
        <SyncStatusBadge />
        <Text style={styles.text}>現在の状態: {syncStatus}</Text>
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
});
