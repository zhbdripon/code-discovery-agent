import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { promisify } from "node:util";

import { Repository } from ".";
import {
  GitTreeItem,
  ListFilesArgs,
  SearchCodeInFilesArgs,
  SearchCodeInFilesResult,
} from "../types";

const execFileAsync = promisify(execFile);

export class GithubRepository implements Repository {
  private owner: string;
  private repo: string;
  private defaultBranch: string;
  private isCloned: boolean = false;
  private isLargeRepo: boolean = false;
  private cachedFileContents: Map<string, string> = new Map();
  static clonedRepoPath: string = "temp/workingRepo";

  constructor(
    owner: string,
    repo: string,
    defaultBranch: string,
    isLargeRepo: boolean = false,
    isCloned: boolean = false,
  ) {
    this.owner = owner;
    this.repo = repo;
    this.defaultBranch = defaultBranch;
    this.isLargeRepo = isLargeRepo;
    this.isCloned = isCloned;
  }

  static async partialCloneWithoutFiles(repoUrl: string): Promise<void> {
    console.log("Fetching the file tree.");

    await rm(GithubRepository.clonedRepoPath, {
      recursive: true,
      force: true,
    });

    await execFileAsync("git", [
      "clone",
      "--depth=1",
      "--filter=blob:none",
      "--no-checkout",
      repoUrl,
      GithubRepository.clonedRepoPath,
    ]);
    console.log("File tree fetched.");
  }

  static async create(repoUrl: string): Promise<GithubRepository> {
    // remove .git suffix if present
    if (repoUrl.slice(-4) === ".git") {
      repoUrl = repoUrl.slice(0, -4);
    }

    const urlSplits = repoUrl.split("/");
    const repo = urlSplits.at(-1) || "";
    const owner = urlSplits.at(-2) || "";
    console.log("fetching repository meta.");
    const repoData: { default_branch: string; size: number } = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
    ).then((res) => res.json());

    const branch = repoData.default_branch;
    const isLargeRepo = repoData.size > 100000;
    console.log("Default Branch:", branch, "\nLarge Repo:", isLargeRepo);

    if (!branch) {
      throw new Error(
        `Could not fetch required data for repository ${owner}/${repo}`,
      );
    }

    await GithubRepository.partialCloneWithoutFiles(
      `https://github.com/${owner}/${repo}.git`,
    );
    return new GithubRepository(owner, repo, branch, isLargeRepo, true);
  }

  async getTreeNodeContent(nodeSha: string): Promise<GitTreeItem[]> {
    const { stdout: nodeContent } = await execFileAsync(
      "git",
      ["ls-tree", nodeSha],
      {
        cwd: GithubRepository.clonedRepoPath,
      },
    );

    const tree: GitTreeItem[] = nodeContent
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [modeTreeSha, itemName] = line.split("\t");
        const [mode, type, sha] = modeTreeSha.split(" ") as [
          string,
          "blob" | "tree",
          string,
        ];
        return {
          mode,
          type,
          sha,
          path: itemName,
        };
      });

    return tree;
  }

  async walkTree(
    treeSha: string,
    currentDepth: number,
    maxDepth: number,
    prefix: string,
  ): Promise<GitTreeItem[]> {
    console.log(
      `Walking tree at depth ${currentDepth} for SHA ${treeSha} with prefix "${prefix}"`,
    );
    const tree = await this.getTreeNodeContent(treeSha);

    const files: GitTreeItem[] = [];

    for (const entry of tree) {
      const path = prefix ? `${prefix}/${entry.path}` : entry.path;

      if (["blob", "tree"].includes(entry.type)) {
        files.push({
          ...entry,
          path,
        });
        continue;
      }

      if (entry.type === "tree" && currentDepth < maxDepth) {
        files.push(
          ...(await this.walkTree(entry.sha, currentDepth + 1, maxDepth, path)),
        );
      }
    }
    console.log(`Found ${files.length} files at depth ${currentDepth}`);
    return files;
  }

  async listFiles({
    path,
    depth,
    includeGitIgnore,
    includeHidden,
  }: ListFilesArgs) {
    console.log("listFiles called with:", {
      path,
      depth,
      includeGitIgnore,
      includeHidden,
    });

    const startPathNormalized =
      path === "." || !path ? "" : path.replace(/^\.\//, "");

    const { stdout: startPathSha } = await execFileAsync(
      "git",
      [
        "rev-parse",
        `HEAD${startPathNormalized ? `:${startPathNormalized}` : ""}`,
      ],
      {
        cwd: GithubRepository.clonedRepoPath,
      },
    );

    const items = await this.walkTree(startPathSha.trim(), 0, depth ?? 1, "");

    const ret = items.map((item) => ({
      path: item.path,
      type: (item.type === "blob" ? "file" : "directory") as
        | "file"
        | "directory",
    }));

    console.log(`listFiles returning ${ret.length} items for path "${path}"`);

    return ret;
  }

  async getFileContent(
    filePath: string,
  ): Promise<string | { errorMessage: string }> {
    if (this.cachedFileContents.has(filePath)) {
      return this.cachedFileContents.get(filePath) as string;
    }

    const { stdout: fileContent } = await execFileAsync(
      "git",
      ["show", `HEAD:${filePath}`],
      {
        cwd: GithubRepository.clonedRepoPath,
      },
    );
    console.log(`Fetched content for file ${filePath} from GitHub.`);
    this.cachedFileContents.set(filePath, fileContent);
    return fileContent;
  }

  async readFile({ filePath }: { filePath: string }) {
    try {
      const content = await this.getFileContent(filePath);

      if (typeof content === "string") {
        return {
          ok: true,
          content,
        };
      }
    } catch (error) {
      console.log(`Failed to read file at ${filePath}:`, error);
      return {
        ok: false,
        error: "read_error",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while reading the file.",
      };
    }

    return {
      ok: false,
      error: "read_error",
      message: `Failed to read file ${filePath}.`,
    };
  }

  async searchCodeInFiles(
    searchArgs: Omit<SearchCodeInFilesArgs, "projectRoot">,
  ) {
    const results: SearchCodeInFilesResult[] = [];
    const { files: filePaths, query, isRegex, flags } = searchArgs;

    let pattern: RegExp | undefined;
    if (query instanceof RegExp) {
      pattern = query;
    } else if (isRegex) {
      pattern = new RegExp(query, flags || undefined);
    }

    for (const file of filePaths) {
      const content = await this.getFileContent(file);

      if (typeof content !== "string") {
        results.push({
          Error: `Failed to read file ${file}: ${content.errorMessage}`,
        });
        continue; // Skip if the file content couldn't be retrieved
      }
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
}
