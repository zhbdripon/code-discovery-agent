import dotenv from 'dotenv';
import OpenAI from "openai";
import { getConfig } from './config';

dotenv.config();
const config = getConfig();



const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});


async function main() {

    const response = await client.responses.create({
      model: 'gpt-5.5',
      instructions: 'You are a coding assistant that talks like a pirate',
      input: 'Are semicolons optional in JavaScript?',
    });
    
    console.log(response.output_text);
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});

console.log(`Starting ${config.appName} on port ${config.port}`);

// Placeholder for application logic
process.on('SIGINT', () => {
  console.log('Shutting down');
  process.exit(0);
});
