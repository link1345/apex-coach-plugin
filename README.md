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

## Codexアプリへのインストール

以下は、Windows版CodexアプリのPersonal Marketplaceへ、このリポジトリをローカルプラグインとして登録する手順です。

### 1. 必要なコマンドを確認する

PowerShellで次のコマンドを実行します。

```powershell
bun --version
ffmpeg -version
ffprobe -version
```

`bun`は必須です。`ffmpeg`と`ffprobe`は動画解析機能を使用する場合のみ必要です。

### 2. プラグインを配置する

Codex用のプラグインディレクトリへ、このリポジトリをクローンします。

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\plugins"
gh repo clone link1345/apex-coach-plugin "$env:USERPROFILE\plugins\apex-coach-plugin"
```

リポジトリが非公開の場合は、先に`gh auth login`を実行し、アクセス権のあるGitHubアカウントで認証してください。

### 3. Personal Marketplaceへ登録する

Personal Marketplaceの設定ディレクトリと設定ファイルを用意します。

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.agents\plugins"
notepad "$env:USERPROFILE\.agents\plugins\marketplace.json"
```

新規ファイルの場合は、次の内容を保存します。

```json
{
  "name": "personal",
  "interface": {
    "displayName": "Personal"
  },
  "plugins": [
    {
      "name": "apex-coach-plugin",
      "source": {
        "source": "local",
        "path": "./plugins/apex-coach-plugin"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Developer Tools"
    }
  ]
}
```

すでに`marketplace.json`が存在する場合は上書きせず、既存の`plugins`配列へ`apex-coach-plugin`のオブジェクトだけを追加してください。Personal MarketplaceはCodexが自動検出するため、`codex plugin marketplace add`の実行は不要です。

### 4. Codexアプリでインストールする

1. Codexアプリを完全に終了し、再起動します。
2. プラグイン画面を開き、`Personal`タブを選択します。
3. `Apex Coach Plugin`を開き、追加ボタンを押します。
4. インストール後、新しいタスクを開始します。

新しいタスクで、例えば次のように依頼できます。

```text
@apex-coach-plugin
このAPEX戦闘動画を分析して、優先度順に改善点を教えてください。
```

### トラブルシュート

- プラグインが表示されない: 配置先と`marketplace.json`のパス、JSONの構文を確認してCodexアプリを再起動します。
- MCPツールが利用できない: `bun`が`PATH`に設定されていることを確認し、新しいタスクを開始します。
- 動画解析で`binary_not_found`が表示される: `ffmpeg`と`ffprobe`を`PATH`へ追加するか、`FFMPEG_PATH`と`FFPROBE_PATH`を設定してCodexアプリを再起動します。

詳しいプラグイン開発・導入方法は、[OpenAIのBuild plugins](https://learn.chatgpt.com/docs/build-plugins)と[Plugins](https://learn.chatgpt.com/docs/plugins)を参照してください。

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
