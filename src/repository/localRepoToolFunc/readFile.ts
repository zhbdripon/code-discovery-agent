import fs from "node:fs/promises";
import path from "node:path";
import { ReadFileArgs } from "../../types";

export default async function readFile({
  projectRoot,
  filePath,
}: ReadFileArgs) {
  const fullPath = path.join(projectRoot, filePath);
  try {
    const content = await fs.readFile(fullPath, "utf-8");
    return { ok: true, content };
  } catch (error: unknown) {
    // Provide a structured error so callers (and the LLM) can detect missing files
    const e = error as { code?: string; message?: string } | undefined;
    if (e && e.code === "ENOENT") {
      return {
        ok: false,
        error: "not_found",
        message: `File not found: ${filePath}`,
      };
    }
    console.log(`Failed to read file at ${filePath}:`, error);
    return {
      ok: false,
      error: "read_error",
      message: e?.message || "Unknown error occurred while reading the file.",
    };
  }
}
