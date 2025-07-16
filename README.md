# Claude Code AgentAPI Extension

VS Code extension for working with Claude Code through AgentAPI.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Compile TypeScript:
```bash
npm run compile
```

3. Create package:
```bash
npm install -g vsce
vsce package
```

4. Install extension:
```bash
code --install-extension claude-code-agentapi-0.3.4.vsix
```

## Usage

### Hotkeys
- `Cmd+Shift+C` - open chat with Claude

### Commands (Command Palette)
- `Start Claude Code Server` - start server
- `Stop Claude Code Server` - stop server  
- `Open Claude Code Chat` - open chat

### Features
- Automatic AgentAPI server startup
- Auto-confirmation of folder trust
- Integration with VS Code workspace
- Web panel for communicating with Claude
- Dynamic polling speed adjustment for interactive messages
- Real-time message updates

## Requirements
- Node.js 18+
- AgentAPI installed and available in PATH
- Claude Code installed and configured
- VS Code 1.74+