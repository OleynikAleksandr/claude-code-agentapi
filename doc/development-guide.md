# Руководство по созданию расширения Claude Code AgentAPI для VS Code

## Обзор проекта

Это расширение объединяет два репозитория для создания HTTP API интерфейса к Claude Code прямо в VS Code:
- **AgentAPI**: https://github.com/coder/agentapi - HTTP API для управления Claude Code
- **Claude Code**: https://github.com/anthropics/claude-code - Командная утилита Claude от Anthropic

## Архитектура решения

```
VS Code Extension
    ↓
AgentAPI HTTP Server (порт 3284)
    ↓
Claude Code CLI
    ↓
Anthropic API
```

## Пошаговое создание

### Этап 1: Установка зависимостей

#### 1.1 Установка Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

Настройка аутентификации:
```bash
claude
# Следуйте инструкциям для входа через Anthropic Console
```

#### 1.2 Установка AgentAPI

**Вариант A: Через Go**
```bash
# Установка Go (если не установлен)
brew install go

# Установка AgentAPI
go install github.com/coder/agentapi@latest

# Добавление в PATH
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.zshrc
source ~/.zshrc
```

**Вариант B: Скачивание бинарника**
```bash
curl -L https://github.com/coder/agentapi/releases/latest/download/agentapi_darwin_amd64.tar.gz | tar -xz
sudo mv agentapi /usr/local/bin/
```

#### 1.3 Проверка установки
```bash
agentapi --help
claude --version
```

### Этап 2: Тестирование AgentAPI

#### 2.1 Запуск сервера
```bash
agentapi server -- claude
```

#### 2.2 Тестирование HTTP API
```bash
# Статус сервера
curl localhost:3284/status

# Получение сообщений
curl localhost:3284/messages

# Отправка сообщения
curl -X POST localhost:3284/message 
  -H "Content-Type: application/json" 
  -d '{"content": "Привет!", "type": "user"}'
```

### Этап 3: Создание VS Code расширения

#### 3.1 Структура проекта
```
claude-code-agentapi/
├── package.json          # Манифест расширения
├── tsconfig.json         # Конфигурация TypeScript
├── src/
│   └── extension.ts      # Основной код расширения
├── out/                  # Скомпилированные файлы
└── doc/                  # Документация
```

#### 3.2 Файл package.json
```json
{
  "name": "claude-code-agentapi",
  "displayName": "Claude Code AgentAPI",
  "description": "VS Code extension for Claude Code through AgentAPI",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.75.0"
  },
  "categories": ["Other"],
  "activationEvents": ["*"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "claude-code-agentapi.start",
        "title": "Start Claude Code Server"
      },
      {
        "command": "claude-code-agentapi.stop",
        "title": "Stop Claude Code Server"
      },
      {
        "command": "claude-code-agentapi.chat",
        "title": "Open Claude Code Chat"
      }
    ],
    "keybindings": [
      {
        "command": "claude-code-agentapi.chat",
        "key": "ctrl+shift+c",
        "mac": "cmd+shift+c"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/vscode": "^1.75.0",
    "@types/node": "16.x",
    "typescript": "^4.9.4"
  },
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

#### 3.3 Файл tsconfig.json
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2020",
    "outDir": "out",
    "lib": ["es2020", "dom"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".vscode-test"]
}
```

### Этап 4: Основной код расширения

#### 4.1 Ключевые компоненты extension.ts

**Управление AgentAPI сервером:**
```typescript
async function startAgentApiServer(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const cwd = workspaceFolder?.uri.fsPath || process.cwd();

    agentApiProcess = spawn('agentapi', ['server', '--', 'claude'], {
        cwd,
        stdio: 'pipe'
    });
}
```

**Автоподтверждение доверия к папке:**
```typescript
async function autoConfirmTrust(): Promise<void> {
    const response = await axios.get(`${API_URL}/messages`);
    const messages = response.data.messages;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.content.includes('Do you trust the files in this folder?')) {
        await axios.post(`${API_URL}/message`, {
            content: '1',
            type: 'user'
        });
    }
}
```

**Webview для чата:**
```typescript
chatPanel = vscode.window.createWebviewPanel(
    'claude-code-chat',
    'Claude Code Chat',
    vscode.ViewColumn.Beside,
    {
        enableScripts: true,
        retainContextWhenHidden: true
    }
);
```

**Polling для обновления сообщений:**
```typescript
function startMessagePolling(): void {
    messagePolling = setInterval(async () => {
        const response = await axios.get(`${API_URL}/messages`);
        const messages = response.data.messages;
        
        chatPanel?.webview.postMessage({
            command: 'messages',
            messages: messages
        });
    }, 1000);
}
```

### Этап 5: Сборка и установка

#### 5.1 Установка зависимостей
```bash
npm install
```

#### 5.2 Компиляция
```bash
npm run compile
```

#### 5.3 Создание пакета
```bash
npm install -g vsce
vsce package
```

#### 5.4 Установка в VS Code
```bash
code --install-extension claude-code-agentapi-0.0.1.vsix
```

### Этап 6: Использование

#### 6.1 Запуск
- Горячая клавиша: `Cmd+Shift+C` (Mac) / `Ctrl+Shift+C` (Windows/Linux)
- Command Palette: "Open Claude Code Chat"

#### 6.2 Возможности
- Автоматический запуск AgentAPI сервера
- Автоподтверждение доверия к папке
- Обновление сообщений в реальном времени
- Интеграция с текущим рабочим пространством

## Технические детали

### API эндпоинты AgentAPI
- `GET /status` - статус агента
- `GET /messages` - история сообщений
- `POST /message` - отправка сообщения
- `GET /events` - SSE поток событий

### Решение проблем

#### Проблема 1: Таймауты при отправке сообщений
**Решение:** Добавлен polling для автоматического обновления сообщений

#### Проблема 2: Зависание на подтверждении доверия
**Решение:** Автоматическое подтверждение через HTTP API

#### Проблема 3: Не обновляются сообщения в реальном времени
**Решение:** Интервальный polling каждую секунду

## Требования к системе

- macOS 10.15+ / Ubuntu 20.04+ / Windows 10+ (с WSL)
- Node.js 18+
- VS Code 1.75+
- AgentAPI установлен и доступен в PATH
- Claude Code установлен и настроен
- Активная подписка Anthropic API

## Дальнейшие улучшения

1. **Поддержка SSE:** Использование Server-Sent Events вместо polling
2. **Настройки:** Конфигурация порта, интервала обновления
3. **Темы:** Поддержка различных тем VS Code
4. **Экспорт:** Сохранение истории чата в файл
5. **Мультисессии:** Поддержка нескольких сессий Claude
6. **Статус-бар:** Индикатор состояния сервера

## Лицензия

Расширение использует:
- AgentAPI (Apache 2.0)
- Claude Code (коммерческая лицензия Anthropic)
- VS Code Extension API (MIT)
