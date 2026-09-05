import fs from "node:fs";
import path from "node:path";
import {
  ListFilesArgs,
  SearchCodeInFilesArgs,
  SearchCodeInFilesResult,
} from "../types";
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
  ): Promise<SearchCodeInFilesResult[]>;
}

export class RepositoryFactory {
  static async create(source: string): Promise<Repository> {
    if (source.includes("github.com")) {
      return await GithubRepository.create(source);
    }

    const trimmedSource = source.trim();

    if (trimmedSource) {
      const projectRoot = path.isAbsolute(trimmedSource)
        ? trimmedSource
        : path.resolve(process.cwd(), trimmedSource);

      if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        throw new Error(`Invalid local repository path: ${projectRoot}`);
      }

      return new LocalRepository(projectRoot);
    }

    return new LocalRepository(process.cwd());
  }
}
