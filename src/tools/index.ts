import { Repository } from "../repository";
import { asyncFunction } from "../types";
import { toolDefinitions } from "./toolDefinitions";

export function createTools(repository: Repository) {
  const toolFuncFromToolName: Record<string, asyncFunction> = {
    list_files: repository.listFiles.bind(repository),
    search_code_in_files: repository.searchCodeInFiles.bind(repository),
    read_file: repository.readFile.bind(repository),
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
    resetToolCallCounts,
    incrementToolCallCount,
  } as const;
}
