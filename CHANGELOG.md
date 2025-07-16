# Changelog

All changes to the Claude Code AgentAPI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.4] - 2025-07-16
### Added
- New patterns for detecting interactive messages:
  - "Do you want to proceed?" - confirmation dialogs
  - "Opened changes in Visual Studio Code" - IDE change notifications
  - "Yes, and don't ask again" - save choice options
  - "No, and tell Claude what to do differently" - alternative response options
### Changed
- Improved recognition of interactive elements for faster response (75ms)

## [0.3.3] - 2025-07-16
### Added
- Dynamic polling frequency changes for interactive messages
- Detection of interactive messages by headers ("Select IDE", "Resume Session", etc.)
- Speed up to 75ms for interactive messages (was 1000ms)
### Changed
- Improved interface responsiveness when working with interactive elements

## [0.3.2] - 2025-07-16
### Removed
- Control elements under input field (arrows ↑↓←→, Enter, Escape)
- Mention of control keys in friendly message
### Changed
- Test version to check stability of Assistant message display

## [0.3.1] - 2025-07-16
### Changed
- Removed auto-scroll in chat - now you can calmly read message history
- Scroll stays in place when messages are updated
### Fixed
- Issue with inability to scroll chat history up

## [0.3.0] - 2025-07-16
### Based on
- Stable version 0.1.3 (complete copy)
### Changed
- Added ⎿ symbol check to displayScreen function
### Preserved
- ALL functions from version 0.1.3:
  - Three tabs: Chat, Screen, Raw Data
  - "Auto-switch" checkbox
  - Control buttons: arrows ↑↓←→, Enter, Escape
  - Raw Data Output button
  - Output channels for diagnostics

## [0.2.0] - 2025-07-16
### Changed
- Removed all debug console.log messages for clean console
- Optimized polling frequency from 1 second to 500ms
- Removed logging to Screen Output channel on each update

### Issues
- ⚠️ Messages disappear from chat after some time

## [0.1.9] - 2025-07-16
### Fixed
- Logic for displaying friendly message (shown only when no messages)
- Enabled screen subscription via /screen endpoint
### Added
- Debug messages for filtering diagnostics

### Issues
- ⚠️ Excessive console logging

## [0.1.8] - 2025-07-16
### Added
- Slash command filtering (not displayed in chat)
- Multi-line input field (textarea instead of input)
- Automatic input field height adjustment
- Shift+Enter support for new line

## [0.1.7] - 2025-07-16
### Restored
- Chat and Screen tabs for correct display
- Automatic switching between tabs function
### Preserved
- Raw Data Output button
- Removed control buttons (arrows, Enter, Escape)

## [0.1.6] - 2025-07-16
### Restored
- Raw Data Output button (needed for data updates)

## [0.1.5] - 2025-07-16
### Removed
- Screen and Raw Data tabs
- Arrow buttons, Enter and Escape
- Auto-switch checkbox
- Raw Data Output button

### Issues
- ⚠️ Message display problems started

## [0.1.4] - 2025-07-16
### Fixed
- Added ⎿ symbol check in empty content
- Improved check for "  ⎿  (no content)  ..." format
- Added check for empty string without trim

## [0.1.3] - 2025-07-16 ✅ STABLE VERSION
### Added
- Tabs: Chat, Screen, Raw Data
- "Auto-switch" checkbox
- Control buttons: arrows ↑↓←→, Enter, Escape
- Output channels for diagnostics
### Status
- ✅ All functions work stably
- ✅ Messages display correctly

## [0.1.2] - 2025-07-16
### Added
- Tab auto-switch control

## [0.1.1] - 2025-07-16
### Added
- Raw Data tab

## [0.1.0] - 2025-07-16
### Fixed
- EventSource error (disabled screen subscription)

## [0.0.9] - [0.0.5] - 2025-07-16
### Attempts
- Various attempts to fix "(no content)"

## [0.0.4] - 2025-07-16
### Added
- Real keyboard key support

## [0.0.3] - 2025-07-16
### Added
- Screen subscription (didn't work)

## [0.0.2] - 2025-07-16
### Fixed
- Message type from 'user' to 'raw' for special keys

## [0.0.1] - 2025-07-16
### Initial version
- Basic extension functionality
- AgentAPI integration
- Web panel for chat