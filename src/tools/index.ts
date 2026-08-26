export {
  listFilesTool,
  readFileTool,
  searchCodeInFilesTool,
} from "./toolDefinitions";

import { ListFilesArgs, ReadFileArgs, SearchCodeInFilesArgs } from "../types";
import { toolDefinitions } from "./toolDefinitions";
import listFilesImpl from "./toolFunctions/listFiles";
import readFileImpl from "./toolFunctions/readFile";
import searchCodeInFilesImpl from "./toolFunctions/searchCodeInFiles";

// Allow `any` here because tool functions accept differing argument shapes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type asyncFunction = (...args: any[]) => Promise<unknown>;

export function createTools(projectRoot: string) {
  // wrappers that inject projectRoot into tool implementations
  const listFiles = (args: Omit<ListFilesArgs, "projectRoot">) =>
    listFilesImpl({ ...(args || {}), projectRoot });
  const searchCodeInFiles = (
    args: Omit<SearchCodeInFilesArgs, "projectRoot">,
  ) => searchCodeInFilesImpl({ ...(args || {}), projectRoot });
  const readFile = (args: Omit<ReadFileArgs, "projectRoot">) =>
    readFileImpl({ ...(args || {}), projectRoot });

  const toolFuncFromToolName: Record<string, asyncFunction> = {
    list_files: listFiles,
    search_code_in_files: searchCodeInFiles,
    read_file: readFile,
  };

  const toolCallCounts: Record<string, number> = {
    list_files: 0,
    search_code_in_files: 0,
    read_file: 0,
  };

  const maxToolCallPerTurn: Record<string, number> = {
    list_files: 5,
    search_code_in_files: 10,
    read_file: 10,
  };

  const canUseTool = (toolName: string): boolean => {
    return toolCallCounts[toolName] < maxToolCallPerTurn[toolName];
  };

  const resetToolCallCounts = (): void => {
    for (const toolName in toolCallCounts) {
      toolCallCounts[toolName] = 0;
    }
  };

  const incrementToolCallCount = (toolName: string): void => {
    if (Object.prototype.hasOwnProperty.call(toolCallCounts, toolName)) {
      toolCallCounts[toolName]++;
    }
  };

  return {
    toolDefinitions,
    toolFuncFromToolName,
    maxToolCallPerTurn,
    canUseTool,
    listFiles,
    searchCodeInFiles,
    readFile,
    resetToolCallCounts,
    incrementToolCallCount,
  } as const;
}
