# APEX Coach Plugin

[English](README.md) | [日本語](README.ja.md)

A Codex plugin for reviewing APEX Legends gameplay videos using observable evidence and APEX-specific reference data.

It bundles the following three components into one plugin:

- `apex-combat-review`: A coaching skill that separates observations, available options, actual actions, and evaluation while avoiding hindsight bias
- `apex-reference`: An MCP server for looking up weapons, legends, items, mechanics, and patch-specific changes
- `game-video-analysis`: An MCP server for extracting video metadata, frames, short clips, audio, and HUD regions

At the start of a review, the plugin diagnoses the video-analysis runtime and validates structured findings plus reader-facing claims before producing the final response. Validation rejects unavailable abilities, unsupported numeric thresholds, squad-wide HUD generalizations, unsupported enemy-movement causality, post-validation numbers, reliance on unreviewed audio, decisive comparisons of ambiguous actions, and overclaims about recovery conditions or reference data. Coverage output distinguishes validated findings from supplemental observations.

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
- Before starting video analysis, use the plugin's `check_runtime` tool to inspect the executables and versions visible to the Codex process and receive actionable fixes.

To retrieve marketplace updates, run:

```powershell
codex plugin marketplace upgrade apex-coach
```

Then reinstall the plugin entry and restart Codex so a new task loads the updated Skill and MCP bundles:

```powershell
codex plugin add apex-coach-plugin@apex-coach
```

In the new task, call `get_plugin_info`. For this release it must report plugin version `0.3.0`; it also reports the bundle content hash, Skill revision, both MCP server revisions, and the cache path actually in use. Compare the content hash when diagnosing an update. If the old version or hash is still loaded, run the marketplace upgrade and plugin add commands again, restart Codex, and verify from another new task instead of deleting cache directories manually.

For more information about plugin packaging and installation, see the [official OpenAI Package your plugin documentation](https://developers.openai.com/plugins/build/plugins).

## Usage

In a new task, try a prompt such as:

```text
@apex-coach-plugin
Analyze this APEX combat video and list the improvements in priority order.
```

The skill separates observed facts, inferences, options available at the time, and actual actions. It does not convert measured values such as distance into unsupported general thresholds. Before advising, it checks the HUD and recent ability use, recovery conditions such as health, shields, cover, reachability, and available time, and whether audio was actually reviewed.

The audio MCP extracts audio segments; it is not a classifier that automatically confirms footsteps or other sounds. When audio cannot be reviewed, the response uses conditional branches instead of a single definitive claim.

## Development

```sh
bun install --frozen-lockfile
bun run check
```

Changes to distributed Skill, MCP, reference-data, manifest, marketplace, runtime, or bundled files must include a plugin version bump. CI compares those files with the base revision and rejects unchanged versions. Keep `.codex-plugin/plugin.json`, the root package, and both MCP package versions equal; the marketplace schema has no independent version field and resolves the version from the plugin manifest at its configured source revision.

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
