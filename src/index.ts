import dotenv from "dotenv";
import readline from "node:readline/promises";
import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import {
  ResponseInputItem,
  ResponseOutputItem
} from "openai/resources/responses/responses.js";
import { getConfig } from "./config";
import { RepositoryFactory } from "./repository";
import { createTools } from "./tools";

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

// Context for the LLM to keep track of the conversation and tool calls
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
  const localProjectPathOrGithubUrl = await reader.question(
    "\n\nProject path or public github url (leave empty for current working dir): ",
  );

  const repository = await RepositoryFactory.create(
    localProjectPathOrGithubUrl,
  );

  const initialQuery = await reader.question(
    "\n\nWhat do you want to know about the repository?\nuser: ",
  );

  inputOutputHistory.push({
    role: "user",
    content: initialQuery,
  });

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

    const stream = await client.responses.create({
      model: "gpt-5.4-mini",
      instructions: `
        You are a software repository investigation assistant.

        Investigate the repository using tools. Generally you don't want to discover files
        and folders ignored by .gitignore and hidden folders start with dot unless you have a
        strong reason to.

        You can use the tools to explore the repository and answer the user's questions.
        Workflow:
        1. Use list_files to discover files. start with depth 0 and then go deeper if needed. Use the output of list_files to understand the project structure.
        2. Choose the relevant file paths returned by list_files.
        3. use relevant tool to read the file contents or search for code in files.

        IMPORTANT:
        - "files" accepts FILE paths only.
        - Never pass a directory for search_code_in_files.
        - This tool does not recursively search directories.
        - Do not guess.
      `,
      tools,
      input: inputOutputHistory,
      stream: true,
    });

    const outputItems: ResponseOutputItem[] = [];
    let hasTextOutput = false;

    for await (const event of stream) {
      switch (event.type) {
        case "response.output_item.added": {
          outputItems.push(event.item);
          break;
        }

        case "response.output_text.delta": {
          if (!hasTextOutput) {
            process.stdout.write("\nassistant: ");
            hasTextOutput = true;
          }

          process.stdout.write(event.delta);
          break;
        }

        case "response.output_item.done": {
          const index = outputItems.findIndex(
            (item) => item.id === event.item.id,
          );

          if (index !== -1) {
            outputItems[index] = event.item;
          }

          break;
        }

        case "response.completed": {
          process.stdout.write("\n");
          break;
        }
      }
    }

    inputOutputHistory.push(...toResponseInputItems(outputItems));

    const toolCalls = outputItems.filter(
      (item) => item.type === "function_call",
    );

    if (toolCalls.length === 0) {
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

        console.log(`\n[Calling tool: ${toolCall.name}]`);

        incrementToolCallCount(toolCall.name);

        const toolArgs = JSON.parse(toolCall.arguments);

        const response = await toolFuncFromToolName[toolCall.name](toolArgs);

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
