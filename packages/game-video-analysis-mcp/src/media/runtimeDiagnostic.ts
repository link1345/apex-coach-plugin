import { MediaError } from "./errors.js";
import { FfmpegRunner } from "./ffmpeg.js";

export type RuntimeBinaryDiagnostic = {
  ready: boolean;
  path?: string;
  version?: string;
  configuredBy: "environment" | "path";
  error?: {
    code: string;
    message: string;
  };
};

export type RuntimeDiagnosticResult = {
  ready: boolean;
  ffmpeg: RuntimeBinaryDiagnostic;
  ffprobe: RuntimeBinaryDiagnostic;
  audioExtractionAvailable: boolean;
  videoExtractionAvailable: boolean;
  remediation: string[];
  restartRequiredAfterEnvironmentChange: boolean;
};

export class RuntimeDiagnosticService {
  constructor(private readonly runner = new FfmpegRunner()) {}

  async checkRuntime(): Promise<RuntimeDiagnosticResult> {
    const [ffmpeg, ffprobe] = await Promise.all([
      this.checkBinary("ffmpeg"),
      this.checkBinary("ffprobe")
    ]);
    const ready = ffmpeg.ready && ffprobe.ready;
    const remediation: string[] = [];

    if (!ffmpeg.ready) {
      remediation.push("Install ffmpeg or set FFMPEG_PATH to an executable file.");
    }
    if (!ffprobe.ready) {
      remediation.push("Install ffprobe or set FFPROBE_PATH to an executable file.");
    }
    if (!ready) {
      remediation.push("Restart Codex after changing PATH, FFMPEG_PATH, or FFPROBE_PATH.");
    }

    return {
      ready,
      ffmpeg,
      ffprobe,
      audioExtractionAvailable: ready,
      videoExtractionAvailable: ready,
      remediation,
      restartRequiredAfterEnvironmentChange: !ready
    };
  }

  private async checkBinary(kind: "ffmpeg" | "ffprobe"): Promise<RuntimeBinaryDiagnostic> {
    const environmentName = kind === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH";
    const configuredBy = process.env[environmentName] ? "environment" : "path";

    try {
      const path = kind === "ffmpeg" ? await this.runner.getFfmpegPath() : await this.runner.getFfprobePath();
      const result = kind === "ffmpeg"
        ? await this.runner.runFfmpeg(["-version"])
        : await this.runner.runFfprobe(["-version"]);
      const version = result.stdout.split(/\r?\n/, 1)[0]?.trim();

      return {
        ready: true,
        path,
        ...(version ? { version } : {}),
        configuredBy
      };
    } catch (error) {
      const payload = error instanceof MediaError
        ? error.toJSON()
        : { code: "unexpected_error", message: error instanceof Error ? error.message : String(error) };

      return {
        ready: false,
        configuredBy,
        error: {
          code: payload.code,
          message: payload.message
        }
      };
    }
  }
}
