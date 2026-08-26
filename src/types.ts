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

export type ReadFileArgs = {
  filePath: string;
  projectRoot: string;
};

