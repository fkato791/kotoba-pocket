import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import * as Clipboard from "expo-clipboard";
import { csvTemplate, previewCsv } from "@/features/importExport/csv";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { colors, spacing } from "@/ui/theme";

export function ImportExportScreen(): JSX.Element {
  const [csv, setCsv] = useState("");
  const preview = csv ? previewCsv(csv) : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppButton
        label="CSVサンプルをコピー"
        variant="secondary"
        onPress={() => void Clipboard.setStringAsync(csvTemplate).then(() => Alert.alert("コピーしました"))}
      />
      <AppInput label="CSVインポートプレビュー" value={csv} onChangeText={setCsv} multiline />
      {preview ? <Text style={styles.report}>有効: {preview.validRows.length} / エラー: {preview.errors.length}</Text> : null}
      <AppButton label="CSVエクスポート" variant="secondary" onPress={() => Alert.alert("ローカルCSVを書き出します")} />
      <AppButton label="JSONフルバックアップ" variant="secondary" onPress={() => Alert.alert("JSONを書き出します")} />
      <AppButton label="アカウント全データ出力" variant="secondary" onPress={() => Alert.alert("認証後にサーバーデータを出力します")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  report: { color: colors.text, fontWeight: "800" }
});
