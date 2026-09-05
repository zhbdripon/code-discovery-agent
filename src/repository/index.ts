import path from "node:path";
import { ListFilesArgs, SearchCodeInFilesArgs } from "../types";
import { LocalRepository } from "./LocalRepository";
import { GithubRepository } from "./GithubRepository";

export interface Repository {
  listFiles({
    startPath,
    depth,
    includeGitIgnore,
    includeHidden,
  }: ListFilesArgs): Promise<string[]>;
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
