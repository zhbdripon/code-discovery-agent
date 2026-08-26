export { listFilesTool, readFileTool, searchCodeInFilesTool } from "./toolDefinitions";

import { toolDefinitions } from "./toolDefinitions";
import listFilesImpl from "./toolFunctions/listFiles";
import readFileImpl from "./toolFunctions/readFile";
import searchCodeInFilesImpl from "./toolFunctions/searchCodeInFiles";

type asyncFunction = (...args: any[]) => Promise<unknown>;

export function createTools(projectRoot: string) {
  // wrappers that inject projectRoot into tool implementations
  const listFiles = (args: any) =>
    listFilesImpl({ ...(args || {}), projectRoot });
  const searchCodeInFiles = (args: any) =>
    searchCodeInFilesImpl({ ...(args || {}), projectRoot });
  const readFile = (args: any) =>
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
    if (toolCallCounts.hasOwnProperty(toolName)) {
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
