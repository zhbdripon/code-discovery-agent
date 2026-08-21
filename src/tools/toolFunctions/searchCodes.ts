import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve("../study-buddy");

export default async function searchCode({
  files,
  query,
  isRegex = false,
  flags = "",
}: {
  files: string[];
  query: string | RegExp;
  isRegex?: boolean;
  flags?: string;
}) {
  const results: { file: string; line: number; content: string }[] = [];
  const normalizedFiles = new Set<string>();

  async function collectFiles(target: string) {
    const fullPath = path.resolve(PROJECT_ROOT, target);

    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(target, entry.name);
          if (entry.name.startsWith(".")) continue;
          if (entry.isDirectory()) {
            await collectFiles(entryPath);
          } else if (entry.isFile()) {
            normalizedFiles.add(entryPath);
          }
        }
        return;
      }

      if (stat.isFile()) {
        normalizedFiles.add(target);
      }
    } catch {
      // Ignore missing or invalid paths.
    }
  }

  for (const file of files) {
    await collectFiles(file);
  }

  let pattern: RegExp | undefined;
  if (query instanceof RegExp) {
    pattern = query;
  } else if (isRegex) {
    pattern = new RegExp(query, flags || undefined);
  }

  for (const file of normalizedFiles) {
    const fullPath = path.join(PROJECT_ROOT, file);
    const content = await fs.readFile(fullPath, "utf-8");
    const lines = content.split("\n");
    lines.forEach((lineContent, index) => {
      if (pattern) {
        pattern.lastIndex = 0;
      }
      const matched = pattern
        ? pattern.test(lineContent)
        : lineContent.includes(String(query));
      if (matched) {
        results.push({ file, line: index + 1, content: lineContent });
      }
    });
  }

  return results;
}