export type ListFilesArgs = {
  projectRoot: string;
  startPath?: string;
  depth?: number;
  includeGitIgnore?: boolean;
  includeHidden?: boolean;
};

export type SearchCodeInFilesArgs = {
  files: string[];
  query: string | RegExp;
  isRegex?: boolean;
  flags?: string;
  projectRoot: string;
};

export type SearchCodeInFilesResult =
  | {
      file: string;
      line: number;
      content: string;
    }
  | {
      Error: string;
    };

export type ReadFileArgs = {
  filePath: string;
  projectRoot: string;
};

// Allow `any` here because tool functions accept differing argument shapes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type asyncFunction = (...args: any[]) => Promise<unknown>;

export type GithubTreeAPIResponse = {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size: number;
  url: string;
};
