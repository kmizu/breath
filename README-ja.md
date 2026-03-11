# mindfulness-supervisor

監督優先のマインドフルネスアプリ。瞑想の先生ではなく、安全モニター。

深い瞑想状態を目指すのではなく、練習が有害になりはじめるサインを早期に検出します。自己批判、内部監視、強制的な受け入れ、強迫的な最適化、パフォーマンス思考などのパターンを監視します。

## セットアップ

Node.js 18以上が必要です。

```bash
git clone https://github.com/kmizu/p-mindfulness.git
cd p-mindfulness
npm install
cp .env.example .env.local
```

`.env.local` を編集してAPIキーを設定します（どちらも任意）。

```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=sk_...
```

## 起動

```bash
npm run dev
```

http://localhost:3000 をブラウザで開く。

## 環境変数

| 変数名 | 必須 | 説明 |
|---|---|---|
| `OPENAI_API_KEY` | 任意 | LLMによる監督・ガイダンス生成（gpt-5.4）。未設定時はルールベース検出のみ。 |
| `ELEVENLABS_API_KEY` | 任意 | 音声再生。未設定時はテキストのみ。 |
| `ELEVENLABS_VOICE_ID` | 任意 | 使用する音声ID。デフォルトは落ち着いた英語音声。 |

**APIキーなしでも動作します。** 監督はキーワードベース検出、ガイダンスはプリセットスクリプトを使用します。

## 使い方

1. **チェックイン** — 現在の状態についていくつかの質問に答える
2. **監督レビュー** — 今日の練習が助けになるか、害になるかを評価
3. **セッション** — 短いガイド練習（30秒 / 1分 / 3分）
   - 練習中は常に「これは悪化させている」ボタンが表示される
4. **振り返り** — 練習は助けになったか、プレッシャーを増やしたか
5. **履歴** — 過去のセッション一覧とパーソナライズメモ

## データ

セッションデータは `data/mindfulness.db`（SQLite）にローカル保存されます。
音声キャッシュは `data/tts-cache/` に保存されます（SHA-256ハッシュファイル名）。
どちらもgitにはコミットされません。

## ドキュメント

- `docs/architecture.md` — アーキテクチャ概要
- `docs/safety-model.md` — 3層安全モデルの詳細
- `docs/prompting.md` — プロンプト設計の方針
