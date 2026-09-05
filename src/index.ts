import dotenv from "dotenv";
import path from "node:path";
import readline from "node:readline/promises";
import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { ResponseInputItem } from "openai/resources/responses/responses.js";
import { getConfig } from "./config";
import { createTools } from "./tools";
import { RepositoryFactory } from "./repository";

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

const {
  maxModelLoop,
}: {
  maxModelLoop: number;
} = config;

// context for the LLM to keep track of the conversation and tool calls
const inputOutputHistory: ResponseInputItem[] = [];

const promptUserForInput = async (): Promise<void> => {
  const newUserInput = await reader.question("user: ");
  inputOutputHistory.push({
    role: "user",
    content: newUserInput,
  });
};

async function main() {
  // Prompt for project root before starting the main loop
  const projectPathOrUrl = await reader.question(
    "\n\nProject path or public github url (leave empty for current working dir): ",
  );

  const initialQuery = await reader.question(
    "\n\nWhat do you want to know about the repository?\nuser: ",
  );

  inputOutputHistory.push({
    role: "user",
    content: initialQuery,
  });

  const repository = RepositoryFactory.create(projectPathOrUrl)

  const {
    toolDefinitions: tools,
    toolFuncFromToolName,
    canUseTool,
    resetToolCallCounts,
    incrementToolCallCount,
  } = createTools(repository);

  let iterationCount = 0;

  while (iterationCount <= maxModelLoop) {
    iterationCount++;

    const response = await client.responses.create({
      model: "gpt-5.4-mini",
      instructions: `
            You are a software repository investigation assistant.
      
            Investigate the repository using tools. Generally you don't want to discover files 
            and folders ignored by .gitignore and hidden folders start with dot unless you have a 
            strong reason to.

            You can use the tools to explore the repository and answer the user's questions.
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
      if (toolFuncFromToolName[toolCall.name]) {
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

        incrementToolCallCount(toolCall.name);
        const toolArgs = JSON.parse(toolCall.arguments);
        const response = await toolFuncFromToolName[toolCall.name](toolArgs);
        // console.log(`${toolCall.name} Response:`, response);

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
