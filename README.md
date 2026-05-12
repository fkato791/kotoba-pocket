# Kotoba Pocket

Kotoba Pocket は、日本語話者向けの英単語・イディオム学習アプリ MVP です。出会った英語をすばやく保存し、短い復習セッションと学習記録で習慣化できることを重視しています。

現在は **ローカルMVP** として、Web / Expo 上での入力、保存、復習、学習記録、CSV/JSONバックアップを確認する段階です。Supabaseログイン同期は保留中でも、ローカル保存と復習は利用できます。

## 現在できること

- すばやく単語・意味を追加
- 写真URIをカードに保存
- 複数デッキへの保存
- 端末TTSによる発音再生
- カード詳細編集、アーカイブ、削除確認
- コレクション検索・フィルター
- 復習モード: カード、選択、穴埋め、入力
- 復習時間: 30秒 / 1分 / 3分 / 無制限
- 学習記録と365日ハビットトラッカー
- CSVインポート/エクスポート
- JSONバックアップ/復元
- インポート時の重複スキップ
- オフライン前提のローカル保存

## 技術スタック

- Expo + React Native + TypeScript
- Expo Router
- SQLite。WebではブラウザlocalStorageベースの簡易DBを使用
- Supabase Auth / Postgres / Edge Functions。同期は保留中
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
```

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

- Web版でカードを追加できる
- コレクションに戻ってもカードが残る
- ブラウザを再読み込みしてもカードが残る
- 復習画面でカードを復習できる
- 学習記録に復習数が反映される
- CSVを書き出せる
- JSONバックアップを書き出せる
- CSV/JSONインポートで重複がスキップされる
- 画面幅を狭くしてもボタンや文字が重ならない
- ダークモードで文字が読める

## Supabase同期について

Supabaseプロジェクト、SQL migration、Edge Function の土台はありますが、マジックリンク復帰と同期安定化は保留中です。現時点では以下を推奨します。

- 学習データはローカル保存を主経路にする
- バックアップはCSV/JSONで行う
- 同期エラーが出てもローカル保存は継続利用する

## 次の品質改善候補

- Android実機またはDevelopment BuildでSQLite永続化を確認
- iOS実機またはEAS BuildでTTS/写真URIを確認
- Supabaseマジックリンク復帰の修正
- アクセシビリティの実機読み上げ確認
- ストア提出用スクリーンショットとプライバシー説明の準備
