import dotenv from "dotenv";
import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { ResponseInputItem } from "openai/resources/responses/responses.js";
import { getConfig } from "./config";
import { listFiles, searchCode, tools } from "./tools";

dotenv.config();
const config = getConfig();

console.log(`Starting ${config.appName} on port ${config.port}`);

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});

let input: ResponseInputItem[] = [
  {
    role: "user",
    content: "How is authentication implemented?",
  },
];

async function main() {
  let totalLoop = 15;
  while (totalLoop > 0) {
    const response = await client.responses.create({
      model: "gpt-5.4-mini",
      instructions: `
            You are a software repository investigation assistant.
      
            Investigate the repository using tools.
            Do not guess.
          `,
      tools,
      input,
    });

    input.push(...toResponseInputItems(response.output));
    console.log("Response from llm: ", response.output, response);

    const toolCalls = response.output.filter(
      (item) => item.type === "function_call",
    );

    if (!toolCalls || toolCalls.length === 0) {
      console.log("No tool calls found in the response.");
      break;
    }

    console.log("Tool Calls requested:", totalLoop, toolCalls);

    for (const tool of toolCalls) {
      if (tool.name === "list_files") {
        const response = await listFiles();
        console.log("List Files Response:", response.length, response); // Log the number of results and the first 5 results

        input.push({
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
        const response = await searchCode({ files, query, isRegex, flags });
        console.log("Search Code Response:", response.length, response.slice(0, 5)); // Log the number of results and the first 5 results

        input.push({
          type: "function_call_output",
          call_id: tool.call_id,
          output: JSON.stringify(response),
        });
      }
    }
    totalLoop--;
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

// Placeholder for application logic
// process.on("SIGINT", () => {
//   console.log("Shutting down");
//   process.exit(0);
// });
