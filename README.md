# APEX Coach Plugin

APEX Legendsのゲームプレイ動画を、観察可能な情報とAPEX固有の参照情報に基づいてレビューするCodexプラグインです。

1つのプラグインに、次の3コンポーネントをまとめています。

- `apex-combat-review`: 後知恵を避け、観察・選択肢・実際の行動・評価を分けるコーチングSkill
- `apex-reference`: 武器、レジェンド、アイテム、メカニクス、パッチ差分を参照するMCPサーバー
- `game-video-analysis`: 動画情報、フレーム、短いクリップ、音声、HUD領域を抽出するMCPサーバー

## Requirements

- Codex
- Bun 1.3以上
- `ffmpeg`と`ffprobe`（動画解析機能を使用する場合）

`ffmpeg`と`ffprobe`は`PATH`に追加するか、`FFMPEG_PATH`と`FFPROBE_PATH`で指定できます。

## Development

```sh
bun install --frozen-lockfile
bun run check
```

`bun run build`は2つのMCPサーバーを依存込みで`dist/`へバンドルします。`dist/`は、プラグイン導入後に追加のパッケージ取得を必要としないよう、リポジトリへコミットします。

## Plugin structure

```text
.codex-plugin/plugin.json     Codexプラグインマニフェスト
.mcp.json                     2つのMCPサーバーの起動設定
skills/apex-combat-review/    コーチングSkill
packages/                     上流MCPソースのレビュー済みスナップショット
runtime/                      配布用MCPエントリーポイント
dist/                         バンドル済みMCPと参照データ
```

取り込んだ上流コミットは[UPSTREAM.md](UPSTREAM.md)に記録します。

## Example prompts

- 「このAPEX戦闘動画を分析して、優先度順に改善点を教えてください」
- 「この場面でプッシュ、維持、リセットのどれが妥当だったか確認してください」
- 「動画内の判断を、観察できた情報だけに基づいてレビューしてください」

## Data handling

動画解析MCPは、ユーザーが指定したローカル動画を読み取り、抽出物をOSの一時ディレクトリに作成します。APEX参照MCPは、プラグインに同梱されたローカルJSONデータを読み取ります。
