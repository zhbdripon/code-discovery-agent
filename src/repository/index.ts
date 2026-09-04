import path from "node:path";
import { SearchCodeInFilesArgs } from "../types";
import listFilesImpl from "./localRepoToolFunc/listFiles";
import readFileImpl from "./localRepoToolFunc/readFile";
import searchCodeInFilesImpl from "./localRepoToolFunc/searchCodeInFiles";

export interface Repository {
  listFiles(): Promise<string[]>;
  readFile({ filePath }: { filePath: string }): Promise<{
    ok: boolean;
    content?: string;
    error?: string;
    message?: string;
  }>;
  searchCodeInFiles(
    searchArgs: Omit<SearchCodeInFilesArgs, "projectUrl">,
  ): Promise<{ file: string; line: number; content: string }[]>;
}

export class LocalRepository implements Repository {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async listFiles() {
    return await listFilesImpl({ projectRoot: this.projectRoot });
  }

  async readFile({ filePath }: { filePath: string }) {
    return await readFileImpl({ projectRoot: this.projectRoot, filePath });
  }

  async searchCodeInFiles(
    searchArgs: Omit<SearchCodeInFilesArgs, "projectRoot">,
  ) {
    return await searchCodeInFilesImpl({
      projectRoot: this.projectRoot,
      ...searchArgs,
    });
  }
}

export class GithubRepository implements Repository {
  private projectUrl: string;

  constructor(projectUrl: string) {
    this.projectUrl = projectUrl;
  }

  async listFiles() {
    return [""];
  }

  async readFile({ filePath }: { filePath: string }) {
    return {
      ok: false,
      error: "Not implemented",
      message: "Reading files from a Git repository is not implemented yet.",
    };
  }

  async searchCodeInFiles(
    searchArgs: Omit<SearchCodeInFilesArgs, "projectUrl">,
  ) {
    return [
      {
        file: "",
        line: 0,
        content: "",
      },
    ];
  }
}

export class RepositoryFactory {
  static create(source: string): Repository {
    if (source.includes("github.com")) {
      return new GithubRepository(source);
    }

    const projectRoot =
      source && source.trim()
        ? path.isAbsolute(source.trim())
          ? source.trim()
          : path.resolve(process.cwd(), source.trim())
        : process.cwd();

    return new LocalRepository(projectRoot);
  }
}
