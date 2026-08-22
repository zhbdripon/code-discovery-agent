export const listFilesTool = {
  type: "function" as const,
  name: "list_files",
  description: "List all files in the current directory",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  strict: true,
};

export const searchCodeTool = {
  type: "function" as const,
  name: "search_code",
  description: `
    Search the given files for a text pattern. simple string or a valid regex can be used.
    Returns matching file paths and relevant lines.
  `,
  parameters: {
    type: "object",
    properties: {
      files: {
        type: "array",
        items: { type: "string" },
        description: "The list of files to search in",
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

export const tools = [listFilesTool, searchCodeTool, readFileTool];
