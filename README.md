# Code Discovery Agent

Ask a coding assistant to explore a repository and answer questions about it. It works with either a local project on your machine or a public GitHub repository.

## What it does

This app gives an OpenAI model a set of repository tools so it can:

- list files in a project
- read individual files
- search for text or patterns across files
- inspect either a local directory or a public GitHub repo

You can point it at a folder on disk or paste a GitHub URL like:

```text
https://github.com/microsoft/typescript
```

## Why use it

This is built for understanding a codebase quickly, especially when you need to answer higher-level engineering questions without reading every file manually.

Examples:

- How is authentication implemented in this project?
- What are the core features and the main modules that power them?
- Where is the business logic for payments, user management, or APIs?
- Which services or components are involved in a request flow?
- How does this app handle configuration, validation, and error handling?
- What patterns are used across the codebase for routing, storage, or background jobs?
- What are the key files and entry points for onboarding a new developer?

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Add your API key

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=your_key_here
```

### 3. Start the app

```bash
npm run dev
```

### 4. Enter a repository

When prompted, provide one of these:

- a local project path
- a public GitHub URL
- nothing to use the current working directory

Example:

```text
Project path or public github url (leave empty for current working dir): https://github.com/vercel/next.js
```

Then ask a question about the repository.

## Supported inputs

- Local folder path
- Public GitHub repository URL
- Empty input defaults to the current working directory

If you give a local path that does not exist or is not a directory, the app will fail with a clear error instead of continuing silently.

## Example workflow

```bash
npm run dev
```

Then:

```text
Project path or public github url (leave empty for current working dir): /Users/alex/projects/my-app

What do you want to know about the repository?
user: Show me the main config files and explain the app structure.
```

## Notes

- This project is designed for public GitHub repositories and local filesystem repositories.
- It uses the GitHub public API for repository data and file contents.
- Keep your OpenAI key private and do not commit it to version control.

## Scripts

```bash
npm run dev
npm run build
npm start
```
