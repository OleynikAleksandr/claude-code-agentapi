# Документация расширения Claude Code AgentAPI

## Содержание документации

### 📋 [development-guide.md](development-guide.md)
Полное пошаговое руководство по созданию расширения:
- Установка всех зависимостей
- Настройка AgentAPI и Claude Code
- Создание структуры проекта
- Написание кода расширения
- Сборка и установка
- Решение проблем

### 🏗️ [architecture-overview.md](architecture-overview.md) 
Техническая архитектура и схема взаимодействия:
- Диаграмма компонентов
- Поток данных
- Управление состоянием
- Обработка ошибок
- Производительность и безопасность

## Быстрый старт

1. **Клонировать/скачать проект**
2. **Установить зависимости** (см. development-guide.md)
3. **Собрать расширение:**
   ```bash
   npm install
   npm run compile
   npx vsce package
   code --install-extension claude-code-agentapi-0.0.1.vsix
   ```
4. **Использовать:** `Cmd+Shift+C` для открытия чата

## Основные компоненты

### Репозитории-основы
- **AgentAPI:** https://github.com/coder/agentapi
- **Claude Code:** https://github.com/anthropics/claude-code

### Ключевые файлы проекта
- `package.json` - манифест расширения
- `src/extension.ts` - основная логика
- `tsconfig.json` - конфигурация TypeScript

### Технологии
- **VS Code Extension API** - интеграция с редактором
- **Axios** - HTTP клиент для AgentAPI
- **WebView** - пользовательский интерфейс
- **TypeScript** - основной язык разработки

## Архитектура в двух словах

```
VS Code Extension → AgentAPI HTTP Server → Claude Code CLI → Anthropic API
```

Расширение создает WebView панель в VS Code, которая через HTTP API управляет Claude Code CLI, предоставляя удобный интерфейс для работы с Claude прямо в редакторе.

## Поддержка и развитие

### Текущий статус
- ✅ Базовая функциональность работает
- ✅ Автоматическое подтверждение доверия
- ✅ Polling для обновлений в реальном времени
- ✅ Горячие клавиши и команды

### Планы развития
- 🔄 Поддержка Server-Sent Events
- ⚙️ Настройки расширения
- 🎨 Улучшенный UI/UX
- 📤 Экспорт истории чата
- 📊 Мультисессии

## Требования

### Системные
- macOS 10.15+ / Ubuntu 20.04+ / Windows 10+ (WSL)
- Node.js 18+
- VS Code 1.75+

### Сервисы
- Активная подписка Anthropic API
- Интернет соединение
- Права на выполнение команд в терминале

## Лицензии

Проект использует открытые и коммерческие компоненты:
- VS Code Extension API (MIT)
- AgentAPI (Apache 2.0)
- Claude Code (Commercial - Anthropic)
- Axios (MIT)
- TypeScript (Apache 2.0)

---

*Создано в рамках интеграции Claude Code с VS Code через AgentAPI*
