const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const TELEGRAM_TOKEN = '7677715744:AAHP4tz_8rjglkGKMeGZtqtXJ_W97TbY5jM'; // <-- Replace this with your token

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const app = express();
app.use(express.json());

// Respond to Telegram messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  // Simple command: /hello
  if (text === '/hello') {
    bot.sendMessage(chatId, 'Hello from your MCP server!');
  } else {
    bot.sendMessage(chatId, `You said: ${text}`);
  }
});

// (Optional) HTTP endpoint for Cursor or other tools to send Telegram messages
app.post('/send', async (req, res) => {
  const { chatId, message } = req.body;
  if (!chatId || !message) return res.status(400).send('Missing chatId or message');
  await bot.sendMessage(chatId, message);
  res.send('Message sent!');
});

app.listen(5000, () => {
  console.log('Telegram MCP server running on http://localhost:5000');
});
