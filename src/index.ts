import dotenv from "dotenv";
import OpenAI from "openai";
import { getConfig } from "./config";
import { tools, listFiles } from "./tools";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import {
  ResponseInput,
  ResponseInputItem,
} from "openai/resources/responses/responses.js";

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
  let totalLoop = 2;
  while (totalLoop > 0) {
    const response = await client.responses.create({
      model: "gpt-5.6",
      instructions: `
            You are a software repository investigation assistant.
      
            Investigate the repository using tools.
            Do not guess.
          `,
      tools,
      input,
    });

    input.push(...toResponseInputItems(response.output));

    console.log("Response 1:", response.output_text);

    const toolCalls = response.output.filter(
      (item) => item.type === "function_call",
    );

    if (!toolCalls || toolCalls.length === 0) {
      console.log("No tool calls found in the response.");
      break;
    }

    for (const tool of toolCalls) {
      if (tool.name === "list_files") {
        const response = await listFiles();
        console.log("List Files Response:", response);

        input.push({
          type: "function_call_output",
          call_id: tool.call_id,
          output: JSON.stringify(response),
        });
      }
    }

    console.log("Tool Calls:", totalLoop, toolCalls);
    console.log("Updated Input for Next Iteration:", input);

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
