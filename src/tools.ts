import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve("../study-buddy");

export async function listFiles() {
  const results: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(PROJECT_ROOT, full);
      // skip any directory that starts with a dot (e.g. .git, .next)
      const segments = rel.split(path.sep).filter(Boolean);
      // If this entry is a directory and any segment (including itself) starts with a dot, skip it
      if (entry.isDirectory()) {
        if (segments.some((s) => s.startsWith("."))) continue;
        await walk(full);
      } else if (entry.isFile()) {
        // Skip files that live inside a dot-prefixed directory
        const parentDirs = segments.slice(0, -1);
        if (parentDirs.some((s) => s.startsWith("."))) continue;
        results.push(rel || entry.name);
      } else if (entry.isSymbolicLink()) {
        try {
          const stat = await fs.stat(full);
          if (stat.isDirectory()) {
            const rel2 = path.relative(PROJECT_ROOT, full);
            const segs2 = rel2.split(path.sep).filter(Boolean);
            if (segs2.some((s) => s.startsWith("."))) continue;
            await walk(full);
          } else if (stat.isFile()) {
            const parent = rel.split(path.sep).slice(0, -1);
            if (parent.some((s) => s.startsWith("."))) continue;
            results.push(rel || entry.name);
          }
        } catch {
          // ignore broken symlinks
        }
      }
    }
  }

  await walk(PROJECT_ROOT);
  return results;
}

export async function searchCode({
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

export const listFilesTool = {
  type: "function" as const,
  name: "list_files",
  description: "List all files in the current directory",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  strict: true,
};

export const searchCodeTool = {
  type: "function" as const,
  name: "search_code",
  description: `
    Search the given files for a text pattern. simple string or a valid regex can be used.
    Returns matching file paths and relevant lines.
  `,
  parameters: {
    type: "object",
    properties: {
      files: {
        type: "array",
        items: { type: "string" },
        description: "The list of files to search in",
      },
      query: {
        type: "string",
        description: "The text pattern to search for",
      },
      isRegex: {
        type: "boolean",
        description: "When true, treat `query` as a regular expression",
      },
      flags: {
        type: "string",
        description: "Optional RegExp flags (e.g. 'i' for case-insensitive')",
      },
    },
    required: ["files", "query", "isRegex", "flags"],
    additionalProperties: false,
  },
  strict: true,
};

export const tools = [listFilesTool, searchCodeTool];
