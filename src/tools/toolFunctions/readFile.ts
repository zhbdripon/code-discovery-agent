import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve("../hellochat");

export default async function readFile({ filePath }: { filePath: string }) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  try {
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
  } catch (error) {
    throw new Error(`Failed to read file at ${filePath}: ${error}`);
  }
}
