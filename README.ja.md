# APEX Coach Plugin

[English](README.md) | [日本語](README.ja.md)

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

## Codexアプリへのインストール

このリポジトリには、Codex CLIから追加できるMarketplace定義が含まれています。

### 1. 必要なコマンドを確認する

PowerShellで次のコマンドを実行します。

```powershell
bun --version
ffmpeg -version
ffprobe -version
```

`bun`は必須です。`ffmpeg`と`ffprobe`は動画解析機能を使用する場合のみ必要です。

### 2. Marketplaceを追加する

#### AIエージェントに任せる

Codexで新しいタスクを作成し、次のようにリポジトリを指定して依頼します。

```text
https://github.com/link1345/apex-coach-plugin
このリポジトリのCodexプラグインをインストールしてください。
```

AIエージェントがリポジトリ内のREADMEとMarketplace定義を確認し、Marketplaceの登録と登録結果の確認を進めます。環境の権限設定によっては、コマンドの実行前に承認を求められる場合があります。セットアップ完了後は「使い方」を参照してください。

#### コマンドで追加する

Codexアプリの統合ターミナル、またはPowerShellで次のコマンドを実行します。

```powershell
codex plugin marketplace add https://github.com/link1345/apex-coach-plugin.git --sparse .agents/plugins
```

このコマンドは`.agents/plugins/marketplace.json`だけをMarketplace情報として取得します。そこから、リポジトリ直下の`apex-coach-plugin`をインストール対象として読み込みます。

登録結果は次のコマンドで確認できます。

```powershell
codex plugin marketplace list
```

### トラブルシュート

- Marketplaceが表示されない: `codex plugin marketplace list`で`apex-coach`が登録されていることを確認し、Codexアプリを再起動します。
- MCPツールが利用できない: `bun`が`PATH`に設定されていることを確認し、新しいタスクを開始します。
- 動画解析で`binary_not_found`が表示される: `ffmpeg`と`ffprobe`を`PATH`へ追加するか、`FFMPEG_PATH`と`FFPROBE_PATH`を設定してCodexアプリを再起動します。

Marketplaceの更新を取得する場合は、次のコマンドを実行します。

```powershell
codex plugin marketplace upgrade apex-coach
```

詳しいプラグイン開発・導入方法は、[OpenAI公式のPackage your plugin](https://developers.openai.com/plugins/build/plugins)を参照してください。

## 使い方

新しいタスクで、例えば次のように依頼できます。

```text
@apex-coach-plugin
このAPEX戦闘動画を分析して、優先度順に改善点を教えてください。
```

## Development

```sh
bun install --frozen-lockfile
bun run check
```

`bun run build`は2つのMCPサーバーを依存込みで`dist/`へバンドルします。`dist/`は、プラグイン導入後に追加のパッケージ取得を必要としないよう、リポジトリへコミットします。

## Plugin structure

```text
.agents/plugins/marketplace.json  Git配布用Marketplace定義
.codex-plugin/plugin.json         Codexプラグインマニフェスト
.mcp.json                         2つのMCPサーバーの起動設定
skills/apex-combat-review/        コーチングSkill
packages/                         上流MCPソースのレビュー済みスナップショット
runtime/                          配布用MCPエントリーポイント
dist/                             バンドル済みMCPと参照データ
```

取り込んだ上流コミットは[UPSTREAM.md](UPSTREAM.md)に記録します。

## Example prompts

- 「このAPEX戦闘動画を分析して、優先度順に改善点を教えてください」
- 「この場面でプッシュ、維持、リセットのどれが妥当だったか確認してください」
- 「動画内の判断を、観察できた情報だけに基づいてレビューしてください」

## Data handling

動画解析MCPは、ユーザーが指定したローカル動画を読み取り、抽出物をOSの一時ディレクトリに作成します。APEX参照MCPは、プラグインに同梱されたローカルJSONデータを読み取ります。
