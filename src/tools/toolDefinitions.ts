export const listFilesTool = {
  type: "function" as const,
  name: "list_files",
  description:
    "List files in the given directory path relative to the project root, with optional depth and filters.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path relative to project root to start scanning",
      },
      depth: {
        type: "number",
        description:
          "Maximum recursion depth (0 = only files in the start directory)",
      },
      includeGitIgnore: {
        type: "boolean",
        description: "When true, include files ignored by .gitignore",
      },
      includeHidden: {
        type: "boolean",
        description:
          "When true, include hidden directories (names starting with a dot)",
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
  description: `
    Search in the given files for a text pattern. simple string or a valid regex can be used.
    Returns matching file paths and relevant lines.
  `,
  parameters: {
    type: "object",
    properties: {
      files: {
        type: "array",
        items: { type: "string" },
        description:
          "The list of file paths relative to the repository root to search in. Each file path should point to a file, not a directory.",
      },
      query: {
        type: "string",
        description: "The text pattern to search for",
      },
      isRegex: {
        type: "boolean",
        description: "When true, treat `query` as a regular expression",
      },
      flags: {
        type: "string",
        description: "Optional RegExp flags (e.g. 'i' for case-insensitive')",
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
  description: `
    Read the contents of a repository file.
  `,
  parameters: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "file path relative to the repository root",
      },
    },
    required: ["filePath"],
    additionalProperties: false,
  },
  strict: true,
};

export const toolDefinitions = [listFilesTool, searchCodeInFilesTool, readFileTool];
