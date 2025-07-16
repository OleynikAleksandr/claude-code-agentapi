import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

let agentApiProcess: ChildProcess | null = null;
let chatPanel: vscode.WebviewPanel | null = null;
let messagePolling: NodeJS.Timer | null = null;
let screenSubscription: any = null;
let screenOutputChannel: vscode.OutputChannel | null = null;
let rawDataOutputChannel: vscode.OutputChannel | null = null;
let currentPollingInterval = 1000; // Current polling interval (default 1 second)
let isInteractiveMode = false; // Interactive mode flag
const API_URL = 'http://localhost:3284';

// Function to detect interactive messages by specific headers
function isInteractiveMessage(content: string): boolean {
    const interactiveHeaders = [
        "Select IDE",
        "Connect to an IDE for integrated development features",
        "Modified    Created     # Messages Summary",  // Sessions table from /resume
        "Resume Session",
        "Do you want to proceed?",
        "Opened changes in Visual Studio Code",
        "Yes, and don't ask again",
        "No, and tell Claude what to do differently"
    ];
    
    return interactiveHeaders.some(header => content.includes(header));
}

export function activate(context: vscode.ExtensionContext) {
    // Create Output channels
    screenOutputChannel = vscode.window.createOutputChannel('Claude Code - Screen');
    rawDataOutputChannel = vscode.window.createOutputChannel('Claude Code - Raw Data');
    
    const startCommand = vscode.commands.registerCommand('claude-code-agentapi.start', async () => {
        if (agentApiProcess) {
            vscode.window.showWarningMessage('Claude Code server is already running');
            return;
        }
        try {
            await startAgentApiServer();
            vscode.window.showInformationMessage('Claude Code server started');
        } catch (error) {
            vscode.window.showErrorMessage(`Server startup error: ${error}`);
        }
    });

    const stopCommand = vscode.commands.registerCommand('claude-code-agentapi.stop', () => {
        if (agentApiProcess) {
            agentApiProcess.kill();
            agentApiProcess = null;
        }
        if (messagePolling) {
            clearInterval(messagePolling);
            messagePolling = null;
        }
        // Reset interactive mode on stop
        isInteractiveMode = false;
        currentPollingInterval = 1000;
    });

    const chatCommand = vscode.commands.registerCommand('claude-code-agentapi.chat', async () => {
        if (!agentApiProcess) {
            const start = await vscode.window.showWarningMessage('Server not running. Start?', 'Yes', 'No');
            if (start === 'Yes') {
                await vscode.commands.executeCommand('claude-code-agentapi.start');
            } else {
                return;
            }
        }

        if (chatPanel) {
            chatPanel.reveal();
            return;
        }

        chatPanel = vscode.window.createWebviewPanel('claude-code-chat', 'Claude Code Chat', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });

        chatPanel.webview.html = getWebviewContent();
        
        chatPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'send':
                    await handleSendMessage(message.text);
                    break;
                case 'sendKey':
                    await handleSendKey(message.key);
                    break;
                case 'toggleView':
                    // Switch between chat and screen modes
                    break;
                case 'showRawData':
                    await showRawData();
                    break;
                case 'init':
                    await initializeChat();
                    startMessagePolling();
                    startScreenSubscription();
                    break;
            }
        }, undefined, context.subscriptions);

        chatPanel.onDidDispose(() => {
            chatPanel = null;
            if (messagePolling) {
                clearInterval(messagePolling);
                messagePolling = null;
            }
            if (screenSubscription) {
                clearInterval(screenSubscription);
                screenSubscription = null;
            }
        });
    });

    const showScreenOutputCommand = vscode.commands.registerCommand('claude-code-agentapi.showScreenOutput', () => {
        if (screenOutputChannel) {
            screenOutputChannel.show();
        }
    });
    
    const showRawDataOutputCommand = vscode.commands.registerCommand('claude-code-agentapi.showRawDataOutput', () => {
        if (rawDataOutputChannel) {
            rawDataOutputChannel.show();
        }
    });
    
    context.subscriptions.push(startCommand, stopCommand, chatCommand, showScreenOutputCommand, showRawDataOutputCommand);
}

async function startAgentApiServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const cwd = workspaceFolder?.uri.fsPath || process.cwd();
        agentApiProcess = spawn('agentapi', ['server', '--', 'claude'], { cwd, stdio: 'pipe' });
        agentApiProcess.on('error', (error) => {
            reject(`Error starting agentapi: ${error.message}`);
        });
        setTimeout(async () => {
            try {
                await axios.get(`${API_URL}/status`);
                resolve();
            } catch (error) {
                reject('Server did not respond');
            }
        }, 3000);
    });
}

async function initializeChat(): Promise<void> {
    try {
        const response = await axios.get(`${API_URL}/messages`);
        chatPanel?.webview.postMessage({ command: 'messages', messages: response.data.messages });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

async function showRawData(): Promise<void> {
    try {
        const [messagesResponse, statusResponse] = await Promise.all([
            axios.get(`${API_URL}/messages`),
            axios.get(`${API_URL}/status`)
        ]);
        
        // Write data to Output channel
        if (rawDataOutputChannel) {
            rawDataOutputChannel.clear();
            rawDataOutputChannel.appendLine('=== MESSAGES RAW DATA ===');
            rawDataOutputChannel.appendLine(JSON.stringify(messagesResponse.data, null, 2));
            rawDataOutputChannel.appendLine('\n=== STATUS RAW DATA ===');
            rawDataOutputChannel.appendLine(JSON.stringify(statusResponse.data, null, 2));
            rawDataOutputChannel.appendLine(`\n=== TIMESTAMP: ${new Date().toISOString()} ===`);
            rawDataOutputChannel.show();
        }
        
        // Also send to webview for compatibility
        chatPanel?.webview.postMessage({ 
            command: 'rawData', 
            messagesRaw: messagesResponse.data,
            statusRaw: statusResponse.data
        });
    } catch (error) {
        console.error('Error getting raw data:', error);
        if (rawDataOutputChannel) {
            rawDataOutputChannel.appendLine(`ERROR: ${error}`);
        }
    }
}

function startMessagePolling(): void {
    if (messagePolling) clearInterval(messagePolling);
    
    const pollMessages = async () => {
        try {
            const response = await axios.get(`${API_URL}/messages`);
            chatPanel?.webview.postMessage({ command: 'messages', messages: response.data.messages });
            
            // Check last message for interactivity
            if (response.data.messages.length > 0) {
                const lastMessage = response.data.messages[response.data.messages.length - 1];
                const wasInteractive = isInteractiveMode;
                const nowInteractive = lastMessage.role === 'agent' && isInteractiveMessage(lastMessage.content);
                
                // Change interval when entering/exiting interactive mode
                if (nowInteractive !== wasInteractive) {
                    isInteractiveMode = nowInteractive;
                    const newInterval = nowInteractive ? 75 : 1000; // 75ms for interactive mode, 1000ms for normal
                    
                    if (newInterval !== currentPollingInterval) {
                        currentPollingInterval = newInterval;
                        console.log(`Changed polling interval to ${currentPollingInterval}ms (interactive mode: ${isInteractiveMode})`);
                        
                        // Restart polling with new interval
                        if (messagePolling) clearInterval(messagePolling);
                        messagePolling = setInterval(pollMessages, currentPollingInterval);
                    }
                }
                
                // Also write last message to Screen Output for debugging
                if (screenOutputChannel) {
                    screenOutputChannel.appendLine(`[${new Date().toISOString()}] ${lastMessage.role}: ${lastMessage.content}`);
                }
            }
        } catch (error) {
            console.error('Error updating messages:', error);
        }
    };
    
    messagePolling = setInterval(pollMessages, currentPollingInterval);
}

function startScreenSubscription(): void {
    if (screenSubscription) {
        clearInterval(screenSubscription);
    }
    
    // Temporarily disable screen subscription as polling messages should be sufficient
    console.log('Screen subscription disabled - using message polling instead');
    
    // May return to this later when we find the right way to connect to SSE
    /*
    screenSubscription = setInterval(async () => {
        try {
            // Try to get current screen content
            const response = await axios.get(`${API_URL}/status`);
            console.log('Status response:', response.data);
        } catch (error) {
            console.error('Error getting status:', error);
        }
    }, 1000);
    */
}

async function handleSendMessage(text: string): Promise<void> {
    try {
        await axios.post(`${API_URL}/message`, { content: text, type: 'user' });
        // Reset interactive mode when sending message
        if (isInteractiveMode) {
            isInteractiveMode = false;
            startMessagePolling(); // Restart with normal speed
        }
    } catch (error) {
        console.error('Error sending message:', error);
        vscode.window.showErrorMessage('Error sending message');
    }
}

async function handleSendKey(key: string): Promise<void> {
    const keyMap: Record<string, string> = {
        up: "\x1b[A",
        down: "\x1b[B",
        left: "\x1b[D",
        right: "\x1b[C",
        enter: "\r",
        escape: "\x1b"
    };
    
    try {
        await axios.post(`${API_URL}/message`, {
            content: keyMap[key] || key,
            type: 'raw'
        });
        // If Enter sent in interactive mode - reset it
        if (key === 'enter' && isInteractiveMode) {
            isInteractiveMode = false;
            startMessagePolling(); // Restart with normal speed
        }
    } catch (error) {
        console.error('Error sending key:', error);
        vscode.window.showErrorMessage('Error sending key');
    }
}

function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: monospace; margin: 10px; background-color: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
        .tabs { display: flex; margin-bottom: 10px; border-bottom: 1px solid var(--vscode-panel-border); }
        .tab-button { padding: 8px 16px; background: none; border: none; color: var(--vscode-foreground); cursor: pointer; border-bottom: 2px solid transparent; }
        .tab-button:hover { background-color: var(--vscode-button-hoverBackground); }
        .tab-button.active { border-bottom-color: var(--vscode-button-background); }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .chat { border: 1px solid var(--vscode-panel-border); height: 400px; overflow-y: auto; padding: 10px; margin-bottom: 10px; }
        .screen { border: 1px solid var(--vscode-panel-border); height: 400px; overflow-y: auto; padding: 10px; margin-bottom: 10px; font-family: monospace; white-space: pre; background-color: var(--vscode-terminal-background); color: var(--vscode-terminal-foreground); }
        .screen div { white-space: normal; }
        .raw { border: 1px solid var(--vscode-panel-border); height: 400px; overflow-y: auto; padding: 10px; margin-bottom: 10px; font-family: monospace; white-space: pre; background-color: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-size: 12px; }
        .message { margin-bottom: 10px; padding: 5px; border-radius: 5px; }
        .user-message { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); text-align: right; }
        .agent-message { background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); white-space: pre-wrap; }
        .input-container { display: flex; gap: 10px; margin-bottom: 10px; }
        .message-input { flex: 1; padding: 8px; border: 1px solid var(--vscode-input-border); background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); }
        .controls { display: flex; gap: 5px; flex-wrap: wrap; }
        button { padding: 6px 12px; background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background-color: var(--vscode-button-hoverBackground); }
        .arrow-keys { display: grid; grid-template-columns: repeat(3, 30px); gap: 2px; margin-right: 10px; }
        .arrow-keys button { padding: 4px; font-size: 14px; }
        .arrow-keys .up { grid-column: 2; }
        .arrow-keys .left { grid-column: 1; grid-row: 2; }
        .arrow-keys .down { grid-column: 2; grid-row: 2; }
        .arrow-keys .right { grid-column: 3; grid-row: 2; }
    </style>
</head>
<body>
    <div class="tabs">
        <button class="tab-button active" onclick="switchTab('chat')">Chat</button>
        <button class="tab-button" onclick="switchTab('screen')">Screen</button>
        <button class="tab-button" onclick="switchTab('raw')">Raw Data</button>
    </div>
    <div id="chat" class="chat tab-content active"></div>
    <div id="screen" class="screen tab-content"></div>
    <div id="raw" class="raw tab-content"></div>
    <div class="input-container">
        <input id="input" class="message-input" placeholder="Enter message...">
        <button onclick="sendText()">Send</button>
        <label style="margin-left: 10px;">
            <input type="checkbox" id="autoSwitch" checked onchange="toggleAutoSwitch()"> Auto-switch
        </label>
        <button onclick="showRawDataOutput()" style="margin-left: 10px;">Raw Data Output</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        let autoSwitchEnabled = true;
        vscode.postMessage({ command: 'init' });
        
        window.addEventListener('message', event => {
            if (event.data.command === 'messages') {
                displayMessages(event.data.messages);
            } else if (event.data.command === 'screenUpdate') {
                displayScreen(event.data.screen);
            } else if (event.data.command === 'rawData') {
                displayRawData(event.data.messagesRaw, event.data.statusRaw);
            }
        });
        
        function displayMessages(messages) {
            console.log('displayMessages called with', messages.length, 'messages');
            const chat = document.getElementById('chat');
            chat.innerHTML = '';
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = msg.role === 'user' ? 'message user-message' : 'message agent-message';
                div.textContent = msg.content;
                chat.appendChild(div);
            });
            // Removed auto-scroll - now you can calmly read the history
            
            // Switch to chat tab only if auto-switch is enabled
            if (autoSwitchEnabled) {
                switchTab('chat');
                console.log('displayMessages: Switched to chat tab');
            } else {
                console.log('displayMessages: Auto-switch disabled, staying on current tab');
            }
        }
        
        function displayScreen(screenContent) {
            const screen = document.getElementById('screen');
            const chat = document.getElementById('chat');
            
            // Handle empty content or "(no content)"
            const trimmedContent = screenContent ? screenContent.trim() : '';
            
            // Debug: output content to console for diagnostics
            console.log('Screen content:', JSON.stringify(screenContent));
            console.log('Trimmed content:', JSON.stringify(trimmedContent));
            console.log('Content length:', trimmedContent.length);
            
            // More aggressive check for empty content
            const isEmpty = !screenContent || 
                           trimmedContent === '' || 
                           trimmedContent === '(no content)' ||
                           trimmedContent.includes('(no content)') ||
                           trimmedContent.includes('no content') ||
                           trimmedContent.includes('⎿') ||  // Добавляем проверку символа ⎿
                           trimmedContent.match(/^\s*\(no content\)\s*$/i) ||
                           trimmedContent.match(/^\s*no content\s*$/i) ||
                           trimmedContent.match(/^\s*\w?\s*\(no content\)\s*$/i) ||
                           (trimmedContent.length < 20 && trimmedContent.includes('no content'));
            
            console.log('Is empty:', isEmpty);
            
            if (isEmpty) {
                console.log('Switching to chat mode with friendly message');
                // Show friendly message in chat instead of empty screen
                chat.innerHTML = '<div style="color: var(--vscode-descriptionForeground); font-style: italic; text-align: center; padding: 20px;">' +
                    '<p>💬 Ready to work</p>' +
                    '<p>Enter message or command to continue</p>' +
                    '</div>';
                
                // Switch to chat tab only if auto-switch is enabled
                if (autoSwitchEnabled) {
                    switchTab('chat');
                    console.log('Switched to chat tab with friendly message');
                } else {
                    console.log('Auto-switch disabled, friendly message in chat but staying on current tab');
                }
            } else {
                console.log('Switching to screen mode');
                screen.textContent = screenContent;
                // Switch to screen tab only if auto-switch is enabled
                if (autoSwitchEnabled) {
                    switchTab('screen');
                    console.log('Switched to screen tab');
                } else {
                    console.log('Auto-switch disabled, screen content updated but staying on current tab');
                }
            }
        }
        
        function sendText() {
            const input = document.getElementById('input');
            if (input.value.trim()) {
                vscode.postMessage({ command: 'send', text: input.value });
                input.value = '';
            }
        }
        
        function sendKey(key) {
            vscode.postMessage({ command: 'sendKey', key: key });
        }
        
        function switchTab(tabName) {
            // Remove active state from all tabs
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Activate selected tab
            document.querySelectorAll('.tab-button').forEach(btn => {
                if (btn.textContent.toLowerCase().includes(tabName.toLowerCase()) || 
                    (tabName === 'raw' && btn.textContent.includes('Raw Data'))) {
                    btn.classList.add('active');
                }
            });
            document.getElementById(tabName).classList.add('active');
            
            // If raw data is selected, request data
            if (tabName === 'raw') {
                vscode.postMessage({ command: 'showRawData' });
            }
        }
        
        function displayRawData(messagesRaw, statusRaw) {
            const rawDiv = document.getElementById('raw');
            rawDiv.innerHTML = '<h3>Messages Raw Data:</h3><pre>' + JSON.stringify(messagesRaw, null, 2) + '</pre>' +
                              '<h3>Status Raw Data:</h3><pre>' + JSON.stringify(statusRaw, null, 2) + '</pre>';
        }
        
        function toggleAutoSwitch() {
            autoSwitchEnabled = document.getElementById('autoSwitch').checked;
            console.log('Auto-switch enabled:', autoSwitchEnabled);
        }
        
        function showRawDataOutput() {
            vscode.postMessage({ command: 'showRawData' });
        }
        
        document.getElementById('input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const text = this.value.trim();
                if (text) {
                    vscode.postMessage({ command: 'send', text: text });
                } else {
                    vscode.postMessage({ command: 'sendKey', key: 'enter' });
                }
                this.value = '';
            }
        });
        
        // Handler for input field - only arrows and Escape
        document.getElementById('input').addEventListener('keydown', function(e) {
            switch(e.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'Escape':
                    e.preventDefault();
                    const keyMap = {
                        'ArrowUp': 'up',
                        'ArrowDown': 'down',
                        'ArrowLeft': 'left',
                        'ArrowRight': 'right',
                        'Escape': 'escape'
                    };
                    vscode.postMessage({ command: 'sendKey', key: keyMap[e.key] });
                    break;
            }
        });
        
        // Handler for all keyboard keys
        document.addEventListener('keydown', function(e) {
            // Check that focus is not on input field
            if (e.target !== document.getElementById('input')) {
                switch(e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        vscode.postMessage({ command: 'sendKey', key: 'up' });
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        vscode.postMessage({ command: 'sendKey', key: 'down' });
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        vscode.postMessage({ command: 'sendKey', key: 'left' });
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        vscode.postMessage({ command: 'sendKey', key: 'right' });
                        break;
                    case 'Enter':
                        e.preventDefault();
                        vscode.postMessage({ command: 'sendKey', key: 'enter' });
                        break;
                    case 'Escape':
                        e.preventDefault();
                        vscode.postMessage({ command: 'sendKey', key: 'escape' });
                        break;
                }
            }
        });
    </script>
</body>
</html>`;
}

export function deactivate() {
    if (agentApiProcess) agentApiProcess.kill();
    if (messagePolling) clearInterval(messagePolling);
    if (screenSubscription) clearInterval(screenSubscription);
}