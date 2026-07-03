# @biscotto/cli

CLI for managing Biscotto projects, modules, and bot processes ~ one biscuit at a time.

> Published as ESM. Pair with `@biscotto/core` in your bot project.

## Installation

```bash
npm install -g @biscotto/cli
```

## Usage

```bash
biscotto <command> [options]
```

## Commands

| Command | Description |
|---------|-------------|
| `init <name>` | Initialize a new project |
| `create <name> [--stack]` | Create a new module |
| `pack <module>` | Validate a module for publishing |
| `publish <module>` | Publish a module to GitHub |
| `dev` | Start bot with hot reload |
| `add <source>` | Install a module from GitHub |
| `remove <name>` | Uninstall a module |
| `list` | List installed modules |
| `enable <module>` | Enable a module |
| `disable <module>` | Disable a module |
| `reload <module>` | Hot-reload a running module |
| `config <module>` | View or edit module config |
| `start` | Start bot in background |
| `stop` | Stop the bot |
| `restart` | Restart the bot |
| `status [module]` | Show bot/module status |
| `update <name>` | Update a module |
| `search <query>` | Search the registry |

## Quick Start

```bash
biscotto init my-bot
cd my-bot
npm install
biscotto dev
```

## Creating Modules

```bash
biscotto create my-module              # commands only
biscotto create my-module --stack full # everything

# Available stacks:
#   simple   — commands only
#   full     — commands + buttons + modals + selects
#   voice    — commands + voice support
#   storage  — commands + storage integration
#   moderate — commands + buttons (moderation style)
```
