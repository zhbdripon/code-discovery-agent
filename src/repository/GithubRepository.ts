import { Repository } from ".";
import {
  GithubTreeAPIResponse,
  ListFilesArgs,
  SearchCodeInFilesArgs,
  SearchCodeInFilesResult,
} from "../types";

export class GithubRepository implements Repository {
  private owner: string;
  private repo: string;
  private defaultBranch: string;
  private fileRecords: GithubTreeAPIResponse[] = [];
  private cachedFileContents: Map<string, string> = new Map();

  constructor(owner: string, repo: string, defaultBranch: string) {
    this.owner = owner;
    this.repo = repo;
    this.defaultBranch = defaultBranch;
  }

  static async create(repoUrl: string): Promise<GithubRepository> {
    // remove .git suffix if present
    if (repoUrl.slice(-4) === ".git") {
      repoUrl = repoUrl.slice(0, -4);
    }

    const urlSplits = repoUrl.split("/");
    const repo = urlSplits.at(-1) || "";
    const owner = urlSplits.at(-2) || "";

    const repoData: Partial<{ default_branch: string }> = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
    ).then((res) => res.json());

    const branch = repoData?.default_branch;

    if (!branch) {
      throw new Error(
        `Could not fetch required data for repository ${owner}/${repo}`,
      );
    }

    return new GithubRepository(owner, repo, branch);
  }

  async listFiles({
    startPath,
    depth,
    includeGitIgnore,
    includeHidden,
  }: ListFilesArgs) {
    const filesData = await fetch(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${this.defaultBranch}?recursive=1`,
    )
      .then((res) => res.json())
      .then((data) => {
        return data;
      });

    const startPathNormalized =
      startPath === "." || !startPath ? "" : startPath.replace(/^\.\//, "");

    this.fileRecords = filesData.tree.filter(
      (file: GithubTreeAPIResponse) =>
        file.type === "blob" && file.path.startsWith(startPathNormalized),
    );

    const fileList = this.fileRecords.map(
      (file: GithubTreeAPIResponse) => file.path,
    );

    return fileList;
  }

  private async fetchGitHubFileData(
    url: string,
  ): Promise<{ content?: string; message?: string } | null> {
    try {
      const res = await fetch(url);

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as { content?: string; message?: string };

      if (data?.message) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  async getFileContent(
    filePath: string,
  ): Promise<string | { errorMessage: string }> {
    if (this.cachedFileContents.has(filePath)) {
      return this.cachedFileContents.get(filePath) as string;
    }

    const fileRecord = this.fileRecords.find((file) => file.path === filePath);

    const fileData = fileRecord
      ? await this.fetchGitHubFileData(fileRecord.url)
      : await this.fetchGitHubFileData(
          `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${filePath}?ref=${this.defaultBranch}`,
        );

    if (Array.isArray(fileData)) {
      return {
        errorMessage: `Directory path is not supported. Provide a valid file path.`,
      };
    }

    if (!fileData?.content) {
      return {
        errorMessage: `The file ${filePath} was not found in the repository.`,
      };
    }

    try {
      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      this.cachedFileContents.set(filePath, content);
      return content;
    } catch (error) {
      return {
        errorMessage: `Failed to decode the content of the file ${filePath}.`,
      };
    }
  }

  async readFile({ filePath }: { filePath: string }) {
    const content = await this.getFileContent(filePath);

    if (typeof content === "string") {
      return {
        ok: true,
        content,
      };
    }

    return {
      ok: false,
      error: "Failed to read file",
      message: content.errorMessage,
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
