import { Repository } from ".";
import {
  GithubTreeAPIResponse,
  ListFilesArgs,
  SearchCodeInFilesArgs,
} from "../types";

export class GithubRepository implements Repository {
  private repoUrl: string;
  private owner: string;
  private repo: string;
  private fileRecords: GithubTreeAPIResponse[] = [];

  constructor(repoUrl: string) {
    this.repoUrl = repoUrl;
    const urlSplits = repoUrl.split("/");
    this.repo = urlSplits.at(-1) || "";
    this.owner = urlSplits.at(-2) || "";
  }

  async listFiles({
    startPath,
    depth,
    includeGitIgnore,
    includeHidden,
  }: ListFilesArgs) {
    const filesData = await fetch(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/master?recursive=1`,
    )
      .then((res) => res.json())
      .then((data) => {
        return data;
      });

    this.fileRecords = filesData.tree.filter(
      (file: GithubTreeAPIResponse) => file.type === "blob",
    );
    return this.fileRecords.map((file: GithubTreeAPIResponse) => file.path);
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

  async getFileContent(filePath: string): Promise<string | null> {
    const fileRecord = this.fileRecords.find((file) => file.path === filePath);

    const fileData = fileRecord
      ? await this.fetchGitHubFileData(fileRecord.url)
      : await this.fetchGitHubFileData(
          `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${filePath}?ref=master`,
        );

    if (!fileData?.content) {
      return null;
    }

    try {
      return Buffer.from(fileData.content, "base64").toString("utf-8");
    } catch (error) {
      return null;
    }
  }

  async readFile({ filePath }: { filePath: string }) {
    const content = await this.getFileContent(filePath);

    if (content !== null) {
      return {
        ok: true,
        content,
      };
    }

    return {
      ok: false,
      error: "File not found",
      message: `The file ${filePath} was not found in the repository.`,
    };
  }

  async searchCodeInFiles(
    searchArgs: Omit<SearchCodeInFilesArgs, "projectRoot">,
  ) {
    const results: { file: string; line: number; content: string }[] = [];
    const { files: filePaths, query, isRegex, flags } = searchArgs;

    let pattern: RegExp | undefined;
    if (query instanceof RegExp) {
      pattern = query;
    } else if (isRegex) {
      pattern = new RegExp(query, flags || undefined);
    }

    for (const file of filePaths) {
      const content = await this.getFileContent(file);
      if (!content) {
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
