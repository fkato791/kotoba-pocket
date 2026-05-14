# Kotoba Pocket

Kotoba Pocket は、日本語話者向けの英単語・イディオム学習アプリ MVP です。出会った英語をすばやく保存し、短い復習セッションと学習記録で習慣化できることを重視しています。

現在は **ローカルMVP + Supabase同期の基本実装** として、Web / Expo 上での入力、保存、復習、学習記録、CSV/JSONバックアップ、ログイン後の同期を確認する段階です。同期に失敗しても、ローカル保存と復習は継続利用できます。

## 現在できること

- すばやく単語・意味を追加
- 写真URIを単語カードに保存
- 複数デッキへの保存
- 端末TTSによる発音再生
- 単語カード詳細編集、アーカイブ、削除確認
- 単語帳検索・フィルター
- 復習モード: 単語カード、選択、穴埋め、入力
- 復習時間: 30秒 / 1分 / 3分 / 無制限
- 学習記録と365日ハビットトラッカー
- 直近7日と過去365日のヒートマップ
- CSVインポート/エクスポート
- Excel `.xlsx` インポート/エクスポート
- JSONバックアップ/復元
- インポート時の重複スキップ
- オフライン前提のローカル保存
- 表示設定: ライト / ダーク / 端末設定、スタンダード / クラシック
- 単語帳での複数選択・一括削除

## 技術スタック

- Expo + React Native + TypeScript
- Expo Router
- SQLite。WebではブラウザlocalStorageベースの簡易DBを使用
- Supabase Auth / Postgres / Edge Functions。MVP同期はRLS付きの直接DB同期を標準使用
- TanStack Query
- Zod
- FSRS互換の復習スケジューリング
- `expo-speech` による端末TTS

## セットアップ

```bash
npm install
```

`.env.example` を `.env` にコピーします。

```bash
cp .env.example .env
```

Supabase同期を使わずにローカルMVPを確認する場合、Supabase値は空でも画面確認できます。同期を試す場合は以下を設定します。

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SYNC_TRANSPORT=direct
```

`EXPO_PUBLIC_SYNC_TRANSPORT=edge` を設定すると、`supabase/functions/api` のEdge Function経由に切り替えられます。MVP確認では `direct` を推奨します。

## 実行方法

Webで確認:

```bash
npm run web:preview
```

表示URL:

```text
http://localhost:8082
```

Expo Go / 実機で確認:

```bash
npm run start
```

表示されたQRコードをExpo Goで読み取ります。

## よく使うコマンド

```bash
npm run typecheck
npm run lint
npm test
```

Windows上の一部環境では、Vitest/esbuild が親ディレクトリ権限で止まることがあります。

```text
Cannot read directory "../../../..": Access is denied.
```

この場合でも `npm run typecheck` と `npm run lint` が通っていれば、まずUI確認を優先してください。GitHub Actions 側でのCI結果も確認します。

## 表示設定

設定画面から以下を変更できます。

- ライトモード / ダークモード / 端末設定に合わせる
- 見た目: スタンダード / クラシック

Web版では変更後に自動リロードして反映します。Expo Go / 実機では保存され、次回起動時に反映されます。

## プロジェクト構成

```text
app/                         Expo Router screens
src/domain/                  TypeScript models and schemas
src/data/local/              SQLite / Web fallback database
src/data/repositories/       Local-first repository layer
src/data/remote/             Supabase client and API adapter
src/features/                Feature modules
src/ui/components/           Reusable UI components
supabase/migrations/         Postgres schema and RLS policies
tests/                       Unit and integration tests
docs/                        QA and store checklists
```

## ローカルMVP確認チェック

- Web版で単語カードを追加できる
- 単語帳に戻っても単語カードが残る
- ブラウザを再読み込みしても単語カードが残る
- 復習画面で単語カードを復習できる
- 学習記録に復習数が反映される
- CSVを書き出せる
- Excelを書き出せる
- Excelファイルをプレビューしてインポートできる
- JSONバックアップを書き出せる
- CSV/JSONインポートで重複がスキップされる
- 単語帳で不要な単語カードを選択して一括削除できる
- 画面幅を狭くしてもボタンや文字が重ならない
- ダークモードで文字が読める
- クラシック表示でも主要画面の文字とボタンが読める

## 現在の品質確認状況

以下は通過済みです。

```bash
npm run typecheck
npm run lint
npm test -- --run
```

Vitest はWindows環境の権限制限で失敗することがあります。その場合は通常権限のPowerShellから再実行してください。

## Supabase同期について

Supabase同期は、標準ではSupabase JSクライアントからRLS付きでPostgresへ直接push/pullします。Edge Function未デプロイやJWT検証設定の影響を受けにくくするためです。

- ローカル変更は先にSQLite / Web fallbackへ保存
- sync queue がログイン後にSupabaseへ順番にpush
- remote cursor 以降の変更をpull
- 安全なフィールドはfield-level merge
- それ以外はlast-write-winsとしてconflict logを残す
- 同期エラーが出てもローカル保存は継続利用可能

## 次の品質改善候補

- Android実機またはDevelopment BuildでSQLite永続化を確認
- iOS実機またはEAS BuildでTTS/写真URIを確認
- Supabaseマジックリンク復帰の修正
- アクセシビリティの実機読み上げ確認
- ストア提出用スクリーンショットとプライバシー説明の準備
