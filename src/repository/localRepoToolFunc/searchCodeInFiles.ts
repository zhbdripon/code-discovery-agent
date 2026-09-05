import fs from "node:fs/promises";
import path from "node:path";
import { SearchCodeInFilesArgs, SearchCodeInFilesResult } from "../../types";

export default async function searchCodeInFiles({
  files,
  query,
  isRegex = false,
  flags = "",
  projectRoot,
}: SearchCodeInFilesArgs) {
  const results: SearchCodeInFilesResult[] = [];

  let pattern: RegExp | undefined;
  if (query instanceof RegExp) {
    pattern = query;
  } else if (isRegex) {
    pattern = new RegExp(query, flags || undefined);
  }

  for (const file of files) {
    const fullPath = path.join(projectRoot, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      results.push({
        Error: `The path ${file} is a directory. Please provide file paths only.`,
      });
      continue;
    }

    if (!stat.isFile()) {
      results.push({
        Error: `The path ${file} is not a file. Please provide valid file paths.`,
      });
      continue;
    }

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
