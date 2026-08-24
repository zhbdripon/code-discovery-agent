import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve("../hellochat");

const HARD_EXCLUDE = new Set([".git", ".next", "node_modules"]);

function readGitignore(projectRoot: string) {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  try {
    const content = fs.readFile(gitignorePath, "utf-8");
    return content;
  } catch {
    return null;
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
  startPath = ".",
  depth = Infinity,
  includeGitIgnore = false,
  includeHidden = false,
}: {
  startPath?: string;
  depth?: number;
  includeGitIgnore?: boolean;
  includeHidden?: boolean;
} = {}) {
  const results: string[] = [];

  // load gitignore patterns if needed
  let gitignorePatterns: string[] = [];
  if (!includeGitIgnore) {
    try {
      const gi = await fs.readFile(
        path.join(PROJECT_ROOT, ".gitignore"),
        "utf-8",
      );
      gitignorePatterns = gi
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    } catch {
      gitignorePatterns = [];
    }
  }

  async function walk(dir: string, currentDepth: number) {
    if (currentDepth > depth) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(PROJECT_ROOT, full) || entry.name;
      const relPosix = rel.split(path.sep).join("/");
      const segments = rel.split(path.sep).filter(Boolean);

      // Hard exclusions always apply
      if (segments.some((s) => HARD_EXCLUDE.has(s))) continue;

      // Handle gitignore exclusion when includeGitIgnore == false
      if (!includeGitIgnore && gitignorePatterns.length > 0) {
        if (matchesGitignore(relPosix, gitignorePatterns)) continue;
      }

      // Hidden handling: includeHidden applies to folders only.
      // Determine if this entry is inside a hidden directory (parent dirs).
      const parentDirs = segments.slice(0, -1);
      const isInHiddenDir = parentDirs.some((s) => s.startsWith("."));
      if (!includeHidden && isInHiddenDir) continue;

      if (entry.isDirectory()) {
        // Skip hidden directory itself when includeHidden is false
        if (!includeHidden && entry.name.startsWith(".")) continue;
        // recurse if depth allows
        if (currentDepth < depth) {
          await walk(full, currentDepth + 1);
        }
      } else if (entry.isFile()) {
        // Files that start with a dot are allowed unless they live inside a hidden directory
        results.push(rel);
      }
    }
  }

  const startFull = path.resolve(PROJECT_ROOT, startPath);
  await walk(startFull, 0);
  return results;
}
