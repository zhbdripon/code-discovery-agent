import dotenv from "dotenv";
import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { ResponseInputItem } from "openai/resources/responses/responses.js";
import { getConfig } from "./config";
import { listFiles, searchCodes, tools } from "./tools";

// setups
dotenv.config();
const config = getConfig();
const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

console.log(`Starting ${config.appName} on port ${config.port}`);

// context for the LLM to keep track of the conversation and tool calls
let inputOutputHistory: ResponseInputItem[] = [
  {
    role: "user",
    content: "what vector database used in the codebase?",
  },
];

const MAX_LLM_LOOP = 15;

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
      console.log("No tool calls found in the response.");
      break;
    }

    console.log("Tool Calls requested:", iterationCount, toolCalls);

    for (const tool of toolCalls) {
      if (tool.name === "list_files") {
        const response = await listFiles();
        console.log("List Files Response:", response.length, response);

        inputOutputHistory.push({
          type: "function_call_output",
          call_id: tool.call_id,
          output: JSON.stringify(response),
        });
      }

      if (tool.name === "search_code") {
        const { files, query, isRegex, flags } = JSON.parse(tool.arguments);
        console.log(
          `Searching code with query: ${query}, isRegex: ${isRegex}, flags: ${flags}`,
        );
        const response = await searchCodes({ files, query, isRegex, flags });
        console.log(
          "Search Code Response:",
          response.length,
          response.slice(0, 5),
        ); // Log the number of results and the first 5 results

        inputOutputHistory.push({
          type: "function_call_output",
          call_id: tool.call_id,
          output: JSON.stringify(response),
        });
      }
    }
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

// Placeholder for application logic
process.on("SIGINT", () => {
  console.log("Shutting down");
  process.exit(0);
});
