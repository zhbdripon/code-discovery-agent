# Code Discovery Agent

A minimal TypeScript project that demonstrates a small runtime which
integrates with OpenAI Responses and exposes two repository-inspection
tools (`list_files` and `search_code`). It uses `dotenv` for environment
configuration and TypeScript for strict typing.

**What this project does**
- Starts a small runner (`src/index.ts`) that calls the OpenAI Responses API
	and allows the model to invoke local tools to inspect a codebase.
- Includes tools under `src/tools`:
	- `list_files`: recursively lists files under a configured project root.
	- `search_code`: searches provided files/paths for a string or regex.
	- `read_file`: reads the contents of a single file (relative path).

- **Prerequisites**
- Node 20+ (for `node:readline/promises` and `node:` builtin imports)
- An OpenAI API key (set `OPENAI_API_KEY` in your environment)

Installation

```bash
npm install
```

Environment

Create a `.env` file in the project root or set environment variables directly. Important variables:
- `OPENAI_API_KEY` — required to call OpenAI APIs
- `PORT` — optional, default `3000`
- `APP_NAME` — optional, default `Code Discovery Agent`

Available npm scripts
- `npm run dev` — start in development mode with auto-reload (`ts-node-dev`).
- `npm run build` — compile TypeScript into `dist/`.
- `npm start` — run the compiled output from `dist/`.

Project layout (important files)
- `src/index.ts` — main runner; configures OpenAI client and orchestrates
	tool calls coming from the model.
- `src/config.ts` — runtime configuration helpers.
- `src/tools/toolDefinitions.ts` — JSON schema-like tool definitions exposed
	to the model.
- `src/tools/toolFunctions/listFiles.ts` — implementation of `list_files`.
- `src/tools/toolFunctions/searchCodes.ts` — implementation of `search_code`.

Notes about the tools
- Both `listFiles` and `searchCode` use a hard-coded `PROJECT_ROOT` set to
	`path.resolve("../study-buddy")`. Update that path to point to the
	repository you want the tools to operate on.

Tool: `list_files`
- Description: Recursively list files under the configured project root.
- Usage: invoked by the LLM via `tools` in `src/index.ts`.

Tool: `search_code`
- Description: Search files/paths for a text pattern (string or regex).
- Parameters (see `src/tools/toolDefinitions.ts`):
	- `files`: array of file paths or directories to search (relative to the tool's project root)
	- `query`: string pattern or regex text
	- `isRegex`: boolean, when true treat `query` as a regular expression
	- `flags`: optional regex flags (for example `i` for case-insensitive)

Running the project

Start development mode (recommended while editing):

```bash
npm run dev
```

Build and run (production-like):

```bash
npm run build
npm start
```

Security & usage notes
- Ensure `OPENAI_API_KEY` is kept secret (do not commit it to git).
- The project currently targets `gpt-5.4-mini` in `src/index.ts` — update
	the model name if needed.
- Tools operate on the filesystem path defined by `PROJECT_ROOT` inside
	each tool implementation (`src/tools/toolFunctions/*`). If you want the
	tools to inspect this repository, set `PROJECT_ROOT` to `path.resolve('.')`.

Next steps
- Adjust `PROJECT_ROOT` to the repository you want to inspect.
- Provide a `.env` with `OPENAI_API_KEY` and run `npm run dev`.
- If you'd like, I can: update `PROJECT_ROOT`, add an `.env.example`, or
	expand README with examples and sample tool calls.
