# @biscotto/cli

CLI for managing Biscotto projects, modules, and bot processes ~ one biscuit at a time.

> Published as ESM. Pairs with `@biscotto/core` (CommonJS) in your bot
> project.

## Installation

```bash
npm install -g @biscotto/cli
```

## Version

1.9.0

## Usage

```bash
biscotto <command> [options]
```

## Commands

| Command | Description |
|---------|-------------|
| `init <name>` | Initialize a new Biscotto project |
| `create <name> [--stack]` | Create a new module with optional stack selection |
| `pack <module>` | Validate a module for publishing |
| `publish <module>` | Publish a module to GitHub |
| `dev` | Start bot with hot reload |
| `add <source>` | Install a module from GitHub |
| `remove <name>` | Uninstall a module |
| `list` | List installed modules |
| `enable <module>` | Enable a module |
| `disable <module>` | Disable a module |
| `reload <module>` | Hot-reload a module in the running bot |
| `config <module>` | View or edit module configuration |
| `start` | Start bot in background process |
| `stop` | Stop the bot process |
| `restart` | Restart the bot |
| `status [module]` | Show bot/module status |
| `update <name>` | Update a module to latest version |
| `search <query>` | Search the BiscottoRegistry |

## Creating Projects

```bash
# Initialize a new project
biscotto init my-bot
cd my-bot
npm install
biscotto dev
```

## Creating Modules

```bash
# Create a module with commands only
biscotto create my-module

# Create a module with all features
biscotto create my-module --stack full

# Available stacks:
#   simple   - Commands only
#   full     - Commands + buttons + modals + selects
#   voice    - Commands + voice support
#   storage  - Commands + storage integration
#   moderate - Commands + buttons (moderation style)
```
