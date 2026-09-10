/**
 * Schema materialization for the Codex output-schema flag, across all three
 * review surfaces.
 *
 * Run: bun test packages/server/codex-command-builders.test.ts
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Imported statically and BEFORE any PLANNOTATOR_DATA_DIR is set: these modules
// used to capture the data directory at import, so changing the env var later
// left every derived path (and the materialized schema) in the old location.
import { buildCodexCommand } from "./codex-review";
import { buildGuideCodexCommand } from "./guide/guide-review";
import { buildTourCodexCommand } from "./tour/tour-review";

import { createTestEnvironment } from "../../tests/helpers/environment";

const env = createTestEnvironment(["PLANNOTATOR_DATA_DIR"], "plannotator-codex-builders-");

const OPTIONS = {
  cwd: "/tmp/project",
  outputPath: "/tmp/output.json",
  prompt: "Review these changes.",
};

beforeEach(() => {
  env.reset();
  process.env.PLANNOTATOR_DATA_DIR = env.makeTempDir();
});

afterEach(() => env.restore());

/** The path passed to `--output-schema`. */
function schemaPath(command: string[]): string {
  const index = command.indexOf("--output-schema");
  expect(index).toBeGreaterThanOrEqual(0);
  return command[index + 1]!;
}

describe("Codex command builders", () => {
  test("use the current automatic approval flag for every review surface", async () => {
    const commands = await Promise.all([
      buildCodexCommand(OPTIONS),
      buildGuideCodexCommand(OPTIONS),
      buildTourCodexCommand(OPTIONS),
    ]);

    for (const command of commands) {
      expect(command).toContain("--approve-for-me");
      expect(command).not.toContain("--full-auto");
    }
  });

  test("materialize each schema under PLANNOTATOR_DATA_DIR set after import", async () => {
    const dataDir = process.env.PLANNOTATOR_DATA_DIR!;
    const surfaces = [
      [await buildCodexCommand(OPTIONS), "codex-review-schema.json"],
      [await buildGuideCodexCommand(OPTIONS), "guide-schema.json"],
      [await buildTourCodexCommand(OPTIONS), "tour-schema.json"],
    ] as const;

    for (const [command, fileName] of surfaces) {
      const expected = join(dataDir, fileName);
      expect(schemaPath(command)).toBe(expected);
      expect(existsSync(expected)).toBe(true);
      expect(readFileSync(expected, "utf-8")).toContain('"type":"object"');
    }
  });

  test("re-materialize the schema after PLANNOTATOR_DATA_DIR changes", async () => {
    const first = process.env.PLANNOTATOR_DATA_DIR!;
    expect(schemaPath(await buildCodexCommand(OPTIONS))).toBe(
      join(first, "codex-review-schema.json"),
    );

    const second = env.makeTempDir();
    process.env.PLANNOTATOR_DATA_DIR = second;
    const schema = schemaPath(await buildCodexCommand(OPTIONS));

    expect(schema).toBe(join(second, "codex-review-schema.json"));
    expect(existsSync(schema)).toBe(true);
  });
});
