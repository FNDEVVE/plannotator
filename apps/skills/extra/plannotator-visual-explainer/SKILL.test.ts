/// <reference types="bun-types" />
/// <reference types="node" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const themeOverride = readFileSync(
  join(import.meta.dir, "references/theme-override.md"),
  "utf-8",
);
const mermaidStart = themeOverride.indexOf("## Mermaid theming");
const mermaidEnd = themeOverride.indexOf("\n## ", mermaidStart + 1);
const mermaidSection = themeOverride.slice(mermaidStart, mermaidEnd);
const exampleStart = mermaidSection.indexOf("```javascript");
const exampleEnd = mermaidSection.indexOf("```", exampleStart + 3);
const mermaidExample = mermaidSection.slice(exampleStart, exampleEnd);

describe("plannotator-visual-explainer Mermaid theming", () => {
  test("keeps the Mermaid theming section", () => {
    expect(mermaidStart).toBeGreaterThan(-1);
    expect(mermaidEnd).toBeGreaterThan(mermaidStart);
    expect(exampleStart).toBeGreaterThan(-1);
    expect(exampleEnd).toBeGreaterThan(exampleStart);
  });

  test("uses Mermaid-compatible literal colors", () => {
    const literalColors = mermaidExample.match(/#[0-9a-f]{6}\b/gi) ?? [];
    expect(mermaidExample).toContain("themeVariables");
    expect(literalColors.length).toBeGreaterThanOrEqual(10);
  });

  test("keeps CSS color processing outside Mermaid themeVariables", () => {
    expect(mermaidSection).not.toMatch(/\boklch\(\s*[^)]/i);
    expect(mermaidSection).not.toMatch(/\bvar\(\s*[^)]/i);
    expect(mermaidSection).not.toMatch(/\bcolor-mix\(\s*[^)]/i);
  });

  test("preserves OKLCH for ordinary page CSS", () => {
    expect(themeOverride).toMatch(/--background:\s+oklch\(/);
    expect(themeOverride).toMatch(
      /@media \(prefers-color-scheme: dark\)[\s\S]*--background:\s+oklch\(/,
    );
  });
});
