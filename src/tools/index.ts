export { listFilesTool, searchCodeTool, readFileTool } from "./toolDefinitions";

import listFilesImpl from "./toolFunctions/listFiles";
import searchCodesImpl from "./toolFunctions/searchCodes";
import readFileImpl from "./toolFunctions/readFile";
import { toolDefinitions } from "./toolDefinitions";

type asyncFunction = (...args: any[]) => Promise<unknown>;

export function createTools(projectRoot: string) {
  // wrappers that inject projectRoot into tool implementations
  const listFiles = (args: any) =>
    listFilesImpl({ ...(args || {}), projectRoot });
  const searchCodes = (args: any) =>
    searchCodesImpl({ ...(args || {}), projectRoot });
  const readFile = (args: any) =>
    readFileImpl({ ...(args || {}), projectRoot });

  const toolFuncFromToolName: Record<string, asyncFunction> = {
    list_files: listFiles,
    search_code: searchCodes,
    read_file: readFile,
  };

  const maxToolCallPerTurn: Record<string, number> = {
    list_files: 5,
    search_code: 10,
    read_file: 10,
  };

  const canUseTool = (
    toolCallCounts: Record<string, number>,
    toolName: string,
  ): boolean => {
    return toolCallCounts[toolName] < maxToolCallPerTurn[toolName];
  };

  return {
    toolDefinitions,
    toolFuncFromToolName,
    maxToolCallPerTurn,
    canUseTool,
    listFiles,
    searchCodes,
    readFile,
  } as const;
}
