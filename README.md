# Claude Code AgentAPI Extension

VS Code расширение для работы с Claude Code через AgentAPI.

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Скомпилируйте TypeScript:
```bash
npm run compile
```

3. Создайте пакет:
```bash
npm install -g vsce
vsce package
```

4. Установите расширение:
```bash
code --install-extension claude-code-agentapi-0.0.1.vsix
```

## Использование

### Горячие клавиши
- `Cmd+Shift+C` - открыть чат с Claude

### Команды (Command Palette)
- `Start Claude Code Server` - запустить сервер
- `Stop Claude Code Server` - остановить сервер  
- `Open Claude Code Chat` - открыть чат

### Функции
- Автоматический запуск AgentAPI сервера
- Автоподтверждение доверия к папке
- Интеграция с рабочим пространством VS Code
- Веб-панель для общения с Claude

## Требования
- Node.js 18+
- AgentAPI установлен и доступен в PATH
- Claude Code установлен и настроен
- VS Code 1.74+
