# @biscotto/cli

CLI for managing Biscotto projects, modules, and bot processes ~ one biscuit at a time.

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
| `init <name>` | Initialize a new Biscotto project |
| `create <name>` | Create a new module with stack selection |
| `pack <module>` | Validate a module for publishing |
| `publish <module>` | Publish a module to GitHub |
| `dev` | Start bot with hot reload |
| `add <source>` | Install a module from GitHub |
| `remove <name>` | Uninstall a module |
| `list` | List installed modules |
| `enable <module>` | Enable a module |
| `disable <module>` | Disable a module |
| `reload <module>` | Reload a module |
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

## Module Management

```bash
# Enable/disable modules
biscotto enable shop
biscotto disable shop

# Check module status
biscotto status shop

# Validate before publishing
biscotto pack my-module

# Publish to GitHub
biscotto publish my-module
```

## Project Structure

```
my-bot/
  .biscotto/
    installed.json
  src/
    index.ts
  modules/
    zero/
      manifest.ts
      index.ts
      commands/
        ping.ts
      listeners/
        ready.ts
  .env
  package.json
  tsconfig.json
```
