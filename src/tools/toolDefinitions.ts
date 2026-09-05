export const listFilesTool = {
  type: "function" as const,
  name: "list_files",
  description:
    "List files and directories under a path. Use this to discover file paths before reading or searching their contents.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Directory path relative to the project root.",
      },
      depth: {
        type: "number",
        description:
          "Maximum directory depth to traverse. 0 lists only entries directly inside the path.",
      },
      includeGitIgnore: {
        type: "boolean",
        description: "Whether to include gitignored files.",
      },
      includeHidden: {
        type: "boolean",
        description: "Whether to include hidden files and directories.",
      },
    },
    additionalProperties: false,
    required: ["path", "depth", "includeGitIgnore", "includeHidden"],
  },
  strict: true,
};

export const searchCodeInFilesTool = {
  type: "function" as const,
  name: "search_code_in_files",
  description:
    "Search file contents for a text or regex pattern. Accepts file paths only, not directories. Use list_files first to discover files.",
  parameters: {
    type: "object",
    properties: {
      files: {
        type: "array",
        description:
          "File paths relative to the repository root. Each item must be an individual file path, not a directory.",
        items: {
          type: "string",
        },
      },
      query: {
        type: "string",
        description:
          "Text to search for, or a regex pattern when isRegex is true.",
      },
      isRegex: {
        type: "boolean",
        description: "Whether query should be treated as a regular expression.",
      },
      flags: {
        type: "string",
        description:
          "Regex flags such as 'i'. Use an empty string when not needed.",
      },
    },
    required: ["files", "query", "isRegex", "flags"],
    additionalProperties: false,
  },
  strict: true,
};

export const readFileTool = {
  type: "function" as const,
  name: "read_file",
  description:
    "Read the contents of one specific file. Use a file path relative to the repository root.",
  parameters: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Path to a specific file relative to the repository root.",
      },
    },
    required: ["filePath"],
    additionalProperties: false,
  },
  strict: true,
};

export const toolDefinitions = [
  listFilesTool,
  searchCodeInFilesTool,
  readFileTool,
];
