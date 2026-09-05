import { Repository } from ".";
import { ListFilesArgs, SearchCodeInFilesArgs } from "../types";
import { default as listFilesImpl } from "./localRepoToolFunc/listFiles";
import { default as readFileImpl } from "./localRepoToolFunc/readFile";
import { default as searchCodeInFilesImpl } from "./localRepoToolFunc/searchCodeInFiles";

export class LocalRepository implements Repository {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async listFiles({
    startPath,
    depth,
    includeGitIgnore,
    includeHidden,
  }: ListFilesArgs) {
    return await listFilesImpl({
      projectRoot: this.projectRoot,
      startPath,
      depth,
      includeGitIgnore,
      includeHidden,
    });
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
