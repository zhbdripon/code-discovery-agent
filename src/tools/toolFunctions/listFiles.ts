import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve("../study-buddy");

export default async function listFiles() {
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