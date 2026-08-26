import { SearchCodeInFilesArgs } from "../types";
import listFilesImpl from "./localRepoToolFunc/listFiles";
import readFileImpl from "./localRepoToolFunc/readFile";
import searchCodeInFilesImpl from "./localRepoToolFunc/searchCodeInFiles";

interface Repository {
  listFiles(): Promise<string[]>;
  readFile({ filePath }: { filePath: string }): Promise<{
    ok: boolean;
    content?: string;
    error?: string;
    message?: string;
  }>;
  searchCodeInFiles(
    searchArgs: Omit<SearchCodeInFilesArgs, "projectRoot">,
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
