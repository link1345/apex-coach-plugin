# Upstream snapshots

The plugin keeps the three source projects separate by responsibility and
vendors reviewed snapshots for a self-contained release.

| Component | Repository | Commit |
| --- | --- | --- |
| Coaching Skill | https://github.com/link1345/apex-coach-skills | `e8fb6f5524fd5c7de49f344da1e7c6b7bb021a50` |
| APEX Reference MCP | https://github.com/link1345/apex-reference-mcp | `2827f1e798cdea05569af1b29cd82f1d43fabecc` |
| Game Video Analysis MCP | https://github.com/link1345/game-video-analysis-mcp | `39fd54e456496f946cd31ce4ed504094923c9ebc` |

## Integration adjustments

- `game-video-analysis-mcp/tests/media.test.ts` expects `unsupported_input`
  for a readable file with no video stream. Some ffprobe builds return a
  successful empty-stream result instead of a process error, and the runtime
  already normalizes that case to `unsupported_input`.

When updating a snapshot, copy the upstream files, update the commit in this
table, rebuild `dist/`, and run `bun run check` plus the Codex plugin validator.
