# Code Discovery Agent

A lightweight AI-powered codebase explorer for local repositories and public GitHub projects. It gives an OpenAI model repository tools so it can inspect the structure, read files, and answer code-level questions without manually digging through the entire project.

## What it does

This app helps you ask questions like:

- How is authentication implemented?
- What are the core features of this project?
- Where is the main business logic located?
- Which files handle routing, configuration, or data flow?
- What patterns are used across the codebase?

It supports both:

- a local project path on your machine
- a public GitHub repository URL

## How it works

When the app starts, it asks for a repository source. It then creates the right repository backend:

- local filesystem repo for a folder on disk
- GitHub repo integration for public GitHub URLs

From there, the model can:

- list files and folders in a chosen directory
- read specific files
- search for text or regex matches across files
- explore the repo structure before drilling into relevant code

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Add your OpenAI key

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=your_key_here
```

### 3. Start the app

```bash
npm run dev
```

### 4. Provide a repository

At the prompt, enter one of the following:

- a local project path
- a public GitHub repo URL
- nothing to use the current working directory

Example:

```text
Project path or public github url (leave empty for current working dir): https://github.com/vercel/next.js
```

## Example questions

```text
What are the core features of this project?
How is authentication implemented?
Which files define the main API or app flow?
What are the entry points and configuration files?
```

## Notes

- Public GitHub repositories are supported through the GitHub API and a shallow repo checkout for exploration.
- Invalid local paths are rejected with a clear error.
- Hidden folders and .gitignore entries can be included or excluded depending on the tool settings.
- Keep your OpenAI API key private and do not commit it to version control.

## Scripts

```bash
npm run dev
npm run build
npm start
```
