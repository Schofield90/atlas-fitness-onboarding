# Telegram Bridge Setup for Claude Code Development

## Overview
This Telegram bridge allows remote monitoring and control of Claude Code development sessions. It provides real-time notifications, voice command support, and interactive decision-making capabilities.

## Setup Instructions

### 1. Create a Telegram Bot
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Choose a name for your bot (e.g., "Claude Code Dev Bot")
4. Choose a username ending in `bot` (e.g., "claude_code_dev_bot")
5. Copy the bot token you receive

### 2. Get Your Telegram Chat ID
1. Start a chat with your new bot
2. Send any message to the bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find your chat ID in the response (look for `"chat":{"id":YOUR_CHAT_ID}`)

### 3. Configure Environment Variables
Edit `.env.local` and update these values:
```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_FROM_STEP_1
DEVELOPER_TELEGRAM_ID=YOUR_CHAT_ID_FROM_STEP_2
```

### 4. Start the Telegram Bridge
```bash
# Run in a separate terminal
tsx claude-code-telegram-bridge.ts

# Or run in background
nohup tsx claude-code-telegram-bridge.ts > telegram-bridge.log 2>&1 &
```

### 5. Verify Setup
You should receive this message in Telegram:
```
🤖 Telegram Bridge Online!
✅ Voice transcription ready
✅ Progress reporting ready
✅ Decision prompts ready
✅ Error notifications ready
✅ Code sharing ready
```

## Usage for Claude Code Session

### Import the Integration Helper
```typescript
import { TelegramNotifier } from './telegram-integration'
```

### Available Functions

#### Start a Task
```typescript
await TelegramNotifier.startTask('Building login system', '2 hours')
```

#### Update Progress
```typescript
await TelegramNotifier.updateProgress('Creating database schema', 50, 'Tables created')
```

#### Ask for Decision
```typescript
const choice = await TelegramNotifier.askDecision(
  'Which framework should we use?',
  ['Next.js', 'Remix', 'SvelteKit']
)
```

#### Report Error
```typescript
await TelegramNotifier.reportError(
  'Build failed',
  ['Check dependencies', 'Clear cache', 'Restart server']
)
```

#### Share Code
```typescript
await TelegramNotifier.shareCode(
  'New Component',
  componentCode,
  'typescript'
)
```

#### Complete Task
```typescript
await TelegramNotifier.completeTask(
  'Login system',
  'Implemented with JWT authentication and role-based access'
)
```

#### Check if Paused
```typescript
// Will wait if development is paused via Telegram
await TelegramNotifier.waitIfPaused()
```

## Telegram Commands

### Text Commands
- `status` - Get current development status
- `pause` - Pause development
- `resume` - Resume development
- `help` - Show available commands
- `errors` - Show recent errors
- `files` - Show active files
- `tests` - Show test results

### Voice Commands
Send voice notes with these phrases:
- "What's the status?" - Get progress update
- "Pause development" - Pause work
- "Continue" or "Resume" - Resume work
- "Show errors" - View recent errors
- "What are you working on?" - Current task info

## Features

### Real-time Notifications
- Task start/complete notifications
- Progress updates with visual progress bars
- Error alerts with suggested fixes
- Database operation updates
- Test result summaries

### Interactive Decision Making
- Inline keyboard buttons for choices
- Voice command recognition
- Pause/resume control

### Code Sharing
- Syntax-highlighted code snippets
- Automatic truncation for long code
- Support for multiple languages

### Voice Support
- OpenAI Whisper transcription
- Natural language command processing
- Voice-to-text for complex instructions

## Troubleshooting

### Bot Not Responding
1. Check bot token is correct
2. Verify chat ID is correct
3. Ensure bot is running: `ps aux | grep telegram-bridge`
4. Check logs: `tail -f telegram-bridge.log`

### Voice Commands Not Working
1. Ensure OpenAI API key is set
2. Check voice file size (max 25MB)
3. Verify internet connection

### Missing Dependencies
```bash
pnpm add node-telegram-bot-api @types/node-telegram-bot-api openai form-data dotenv
```

### Permission Issues
```bash
chmod +x claude-code-telegram-bridge.ts
```

## Security Notes
- Keep bot token and chat ID private
- The bot only responds to the configured developer chat ID
- All other users receive an "Unauthorized" message
- Environment variables should never be committed to git

## Advanced Usage

### Custom Progress Visualization
The bridge uses a 10-segment progress bar that updates in real-time:
- Empty: ░░░░░░░░░░ (0%)
- Half: █████░░░░░ (50%)
- Full: ██████████ (100%)

### Error Tracking
Errors are stored with timestamps and suggestions, accessible via the `errors` command.

### File Monitoring
The bridge automatically tracks file changes in the project directory, excluding hidden files.

### Periodic Status Updates
If no activity is detected for 5 minutes during an active task, the bot sends a check-in message.

## Integration with CI/CD
You can integrate the bridge with your CI/CD pipeline:

```yaml
# .github/workflows/notify.yml
- name: Notify Deployment Start
  run: |
    node -e "require('./telegram-integration').TelegramNotifier.startTask('Deploying to production')"

- name: Notify Deployment Complete
  run: |
    node -e "require('./telegram-integration').TelegramNotifier.completeTask('Deployment', 'Successfully deployed to production')"
```

## Support
For issues or questions, check the logs first:
- Bridge log: `telegram-bridge.log`
- Node errors: Check console output
- Telegram API errors: Usually indicate token/permission issues