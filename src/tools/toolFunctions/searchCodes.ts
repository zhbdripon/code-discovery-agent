import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve("../hellochat");

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
  // Only consider the exact file paths provided. Do not recurse into directories.
  for (const file of files) {
    const fullPath = path.resolve(PROJECT_ROOT, file);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) {
        normalizedFiles.add(file);
      }
      // If it's a directory or other type, ignore it.
    } catch {
      // Ignore missing or invalid paths.
    }
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