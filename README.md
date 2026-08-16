# APEX Coach Plugin

[English](README.md) | [日本語](README.ja.md)

A Codex plugin for reviewing APEX Legends gameplay videos using observable evidence and APEX-specific reference data.

It bundles the following three components into one plugin:

- `apex-combat-review`: A coaching skill that separates observations, available options, actual actions, and evaluation while avoiding hindsight bias
- `apex-reference`: An MCP server for looking up weapons, legends, items, mechanics, and patch-specific changes
- `game-video-analysis`: An MCP server for extracting video metadata, frames, short clips, audio, and HUD regions

## Requirements

- Codex
- Bun 1.3 or later
- `ffmpeg` and `ffprobe` when using video analysis features

Add `ffmpeg` and `ffprobe` to `PATH`, or specify them with `FFMPEG_PATH` and `FFPROBE_PATH`.

## Install in Codex

This repository includes a marketplace definition that can be added with the Codex CLI.

### 1. Check the required commands

Run the following commands in PowerShell:

```powershell
bun --version
ffmpeg -version
ffprobe -version
```

`bun` is required. `ffmpeg` and `ffprobe` are required only when using video analysis features.

### 2. Add the marketplace

#### Ask an AI agent

Create a new task in Codex and provide the repository URL:

```text
https://github.com/link1345/apex-coach-plugin
Install the Codex plugin from this repository.
```

The AI agent will inspect the README and marketplace definition, register the marketplace, and verify the result. Depending on your environment permissions, it may ask for approval before running commands. After setup, see "Usage" below.

#### Add it manually

Run the following command in the Codex integrated terminal or PowerShell:

```powershell
codex plugin marketplace add https://github.com/link1345/apex-coach-plugin.git --sparse .agents/plugins
```

This command retrieves `.agents/plugins/marketplace.json` as the marketplace definition. The definition exposes the `apex-coach-plugin` located at the repository root.

Verify the registration with:

```powershell
codex plugin marketplace list
```

### Troubleshooting

- Marketplace does not appear: Confirm that `apex-coach` is listed by `codex plugin marketplace list`, then restart Codex.
- MCP tools are unavailable: Confirm that `bun` is available on `PATH`, then start a new task.
- Video analysis reports `binary_not_found`: Add `ffmpeg` and `ffprobe` to `PATH`, or set `FFMPEG_PATH` and `FFPROBE_PATH`, then restart Codex.

To retrieve marketplace updates, run:

```powershell
codex plugin marketplace upgrade apex-coach
```

For more information about plugin packaging and installation, see the [official OpenAI Package your plugin documentation](https://developers.openai.com/plugins/build/plugins).

## Usage

In a new task, try a prompt such as:

```text
@apex-coach-plugin
Analyze this APEX combat video and list the improvements in priority order.
```

## Development

```sh
bun install --frozen-lockfile
bun run check
```

`bun run build` bundles both MCP servers and their dependencies into `dist/`. The `dist/` directory is committed so that installing the plugin does not require downloading additional packages.

## Plugin structure

```text
.agents/plugins/marketplace.json  Marketplace definition for Git distribution
.codex-plugin/plugin.json         Codex plugin manifest
.mcp.json                         Startup configuration for both MCP servers
skills/apex-combat-review/        Coaching skill
packages/                         Reviewed snapshots of the upstream MCP sources
runtime/                          MCP entry points for distribution
dist/                             Bundled MCP servers and reference data
```

Imported upstream commits are recorded in [UPSTREAM.md](UPSTREAM.md).

## Example prompts

- "Analyze this APEX combat video and list the improvements in priority order."
- "Determine whether pushing, holding, or resetting was the best option in this situation."
- "Review the decisions in this video using only information that was observable at the time."

## Data handling

The video analysis MCP reads local videos selected by the user and creates extracted files in the operating system's temporary directory. The APEX reference MCP reads local JSON data bundled with the plugin.
