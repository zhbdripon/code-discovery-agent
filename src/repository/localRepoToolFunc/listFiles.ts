import fs from "node:fs/promises";
import nodePath from "node:path";
import { ListFilesArgs, ListFilesReturnItem } from "../../types";

const HARD_EXCLUDE = new Set([".git", ".next", "node_modules"]);

async function getGitIgnores(projectRoot: string): Promise<string[]> {
  const gitignorePath = nodePath.join(projectRoot, ".gitignore");
  try {
    const content = await fs.readFile(gitignorePath, "utf-8");
    return content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function patternToRegex(pat: string) {
  // simple conversion: treat '*' -> '.*', '?' -> '.', escape other regex chars
  let s = pat.trim();
  if (!s) return null;
  if (s.startsWith("#")) return null;
  // strip leading slash for matching relative paths
  if (s.startsWith("/")) s = s.slice(1);
  // escape regex special chars except '*' and '?'
  s = s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  // convert glob wildcards to regex equivalents
  s = s.replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^(?:${s})$`);
}

function matchesGitignore(relPosix: string, patterns: string[]) {
  if (!patterns || patterns.length === 0) return false;
  for (const pat of patterns) {
    const p = pat.trim();
    if (!p || p.startsWith("#")) continue;
    // simple handling: exact match or regex-like
    const regex = patternToRegex(p);
    if (!regex) continue;
    if (regex.test(relPosix)) return true;
    // also test prefix (folders)
    if (relPosix.startsWith(p)) return true;
  }
  return false;
}

export default async function listFiles({
  projectRoot,
  path = ".",
  depth = Infinity,
  includeGitIgnore = false,
  includeHidden = false,
}: ListFilesArgs) {
  const results: ListFilesReturnItem[] = [];
  const gitignorePatterns: string[] = includeGitIgnore
    ? []
    : await getGitIgnores(projectRoot);

  async function walk(dir: string, currentDepth: number) {
    if (currentDepth > depth) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = nodePath.join(dir, entry.name);
      const rel = nodePath.relative(projectRoot, full) || entry.name;
      const relPosix = rel.split(nodePath.sep).join("/");
      const segments = rel.split(nodePath.sep).filter(Boolean);

      // Hard exclusions always apply
      if (segments.some((s) => HARD_EXCLUDE.has(s))) continue;

      if (includeGitIgnore === false && gitignorePatterns.length > 0) {
        if (matchesGitignore(relPosix, gitignorePatterns)) continue;
      }

      const parentDirs = segments.slice(0, -1);
      const isInHiddenDir = parentDirs.some((s) => s.startsWith("."));
      if (!includeHidden && isInHiddenDir) continue;

      if (entry.isDirectory()) {
        if (!includeHidden && entry.name.startsWith(".")) continue;
        results.push({ path: rel, type: "directory" });
        if (currentDepth < depth) {
          await walk(full, currentDepth + 1);
        }
      } else if (entry.isFile()) {
        results.push({ path: rel, type: "file" });
      }
    }
  }

  const startFull = nodePath.resolve(projectRoot, path);
  await walk(startFull, 0);

  return results;
}
