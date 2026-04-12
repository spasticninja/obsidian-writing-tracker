# Writing Tracker for Obsidian

Writing Tracker is an Obsidian plugin for tracking writing progress by project. It is designed for writers who want to manage active projects, monitor word count progress, and log writing sessions without leaving their vault.

## What This Plugin Is For

This plugin helps you:

- create and manage multiple writing projects
- set a starting word count for in-progress work
- track progress manually or by counting words from a file or folder in your vault
- set optional word-count and time goals for each project
- start and stop writing sessions and save session history

The plugin is intended to give you a lightweight way to see project progress and capture writing activity directly inside Obsidian.

## Current Features

- Sidebar view for writing projects
- Per-project tracking modes:
  - manual
  - single file
  - folder
- Word-count adjustments for writing done outside tracked notes
- Writing session start/stop workflow
- Session history stored in plugin data

## Pulling Down The Project

Clone the repository into your local Obsidian plugins directory or into another development folder:

```bash
git clone <your-repo-url> obsidian-writing-tracker
cd obsidian-writing-tracker
```

If you want to develop it directly inside a test vault, place it at:

```text
<YourVault>/.obsidian/plugins/obsidian-writing-tracker
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the development build:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## Installing In Obsidian

To install the plugin manually in a vault:

1. Copy `manifest.json`, `main.js`, and `styles.css` into:

```text
<YourVault>/.obsidian/plugins/obsidian-writing-tracker
```

2. Open Obsidian.
3. Go to `Settings -> Community plugins`.
4. Enable Writing Tracker.

## Notes

- The plugin id is `writing-tracker`.
- The current minimum Obsidian version in `manifest.json` is `0.15.0`.
