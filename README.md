# env-sync-tool-tool

[![NPM Version](https://img.shields.io/npm/v/env-sync-tool)](https://www.npmjs.com/package/env-sync-tool)
[![License](https://img.shields.io/npm/l/env-sync-tool)](LICENSE)

**The tool**

`env-sync-tool-tool` is a command-line tool to synchronize environment variables between `.env` and `.env.example` files. It helps ensure that your `.env.example` file is always up-to-date with the variables defined in your `.env` file whenever a teammate add new environment variables and forget to update `.env.example`.

**What's included**

- **Detects missing keys**: Identifies environment variables present in `.env` but missing in `.env.example`.
- **Interactive and Automatic modes**:
  - **Interactive mode (default)**: Prompts you to confirm adding missing keys to `.env.example`.
  - **Automatic mode (`-a` or `--mode automatic`)**: Automatically updates `.env.example` without prompting.
- **Comment preservation**: Optionally preserves comments from `.env` and adds them to `.env.example` for better context (`-c` or `--comments`).
- **Auto-approve option**: Use `-y` or `--yes` in interactive mode to skip the confirmation prompt.

**Installation**

To install the tool, run:

```bash
bun install env-sync-tool
```

**Usage**

**Basic Usage:**

In your project directory (where `.env` and `.env.example` are located), simply run:

```bash
bun run env-sync-tool
```

This will run the tool in interactive mode. It will check for missing keys and prompt you to update `.env.example` if needed.

**Automatic Mode:**

To run in automatic mode and update `.env.example` without prompts:

```bash
bun run env-sync-tool --mode automatic

# or

bun run env-sync-tool -a
```

**Preserving Comments:**

To include comments from `.env` in `.env.example` (enabled by default):

```bash
bun run env-sync-tool -c

# or

bun run env-sync-tool --no-comments # to disbale comment preservation
```

**Auto-approve in Interactive Mode:**

To automatically approve the update in interactive mode:

```bash
bun run env-sync-tool --yes # or -y
```

**License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
