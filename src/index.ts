import dotenv from "dotenv";
import readline from "node:readline/promises";
import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { ResponseInputItem } from "openai/resources/responses/responses.js";
import { getConfig } from "./config";
import { listFiles, readFile, searchCodes, tools } from "./tools";

// setups
dotenv.config();
const config = getConfig();
const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

const reader = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log(`Starting ${config.appName} on port ${config.port}`);

const MAX_LLM_LOOP = 15;
const MAX_TOOL_CALLS_PER_TURN: Record<string, number> = {
  list_files: 1,
  search_code: 5,
  read_file: 5,
};

// context for the LLM to keep track of the conversation and tool calls
let inputOutputHistory: ResponseInputItem[] = [
  {
    role: "user",
    content: "How Authentication implemented?",
  },
];

type asyncFunction = (...args: any[]) => Promise<unknown>;

const toolFromToolName: Record<string, asyncFunction> = {
  list_files: listFiles,
  search_code: searchCodes,
  read_file: readFile,
};

const toolCallCounts: Record<string, number> = {
  list_files: 0,
  search_code: 0,
  read_file: 0,
};

const canUseTool = (toolName: string): boolean => {
  return toolCallCounts[toolName] < MAX_TOOL_CALLS_PER_TURN[toolName];
};

const promptUserForInput = async (): Promise<void> => {
  const newUserInput = await reader.question("user: ");
  inputOutputHistory.push({
    role: "user",
    content: newUserInput,
  });
};

const resetToolCallCounts = (): void => {
  for (const toolName in toolCallCounts) {
    toolCallCounts[toolName] = 0;
  }
};

async function main() {
  let iterationCount = 0;

  while (iterationCount <= MAX_LLM_LOOP) {
    iterationCount++;

    const response = await client.responses.create({
      model: "gpt-5.4-mini",
      instructions: `
            You are a software repository investigation assistant.
      
            Investigate the repository using tools.
            Do not guess.
          `,
      tools,
      input: inputOutputHistory,
    });

    inputOutputHistory.push(...toResponseInputItems(response.output));

    console.log(
      "Response from llm on iteration " + iterationCount + ": ",
      response.output,
      response.output_text,
    );

    const toolCalls = response.output.filter(
      (item) => item.type === "function_call",
    );

    if (!toolCalls || toolCalls.length === 0) {
      await promptUserForInput();
      resetToolCallCounts();
      continue;
    }

    for (const toolCall of toolCalls) {
      if (toolFromToolName[toolCall.name]) {
        if (!canUseTool(toolCall.name)) {
          console.log(`Maximum calls reached for toolCall: ${toolCall.name}`);

          inputOutputHistory.push({
            type: "function_call_output",
            call_id: toolCall.call_id,
            output: JSON.stringify({
              error: `Tool "${toolCall.name}" has reached its usage limit.`,
            }),
          });
          continue;
        }

        toolCallCounts[toolCall.name]++;
        const toolArgs = JSON.parse(toolCall.arguments);
        const response = await toolFromToolName[toolCall.name](toolArgs);
        console.log(`${toolCall.name} Response:`, response);

        inputOutputHistory.push({
          type: "function_call_output",
          call_id: toolCall.call_id,
          output: JSON.stringify(response),
        });
      }
    }
    
  }

  console.log("Maximum iterations reached. Exiting.");
  process.exit(0);
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => {
    reader.close();
  });

process.on("SIGINT", () => {
  console.log("Shutting down");
  process.exit(0);
});
