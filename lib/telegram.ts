import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramNotification(
  employeeName: string,
  employeeEmail: string,
  onboardingUrl: string
) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram credentials not configured');
    return { success: false, error: 'Telegram not configured' };
  }

  const message = `🎉 New Employee Onboarding Started!\n\n` +
    `👤 Name: ${employeeName}\n` +
    `📧 Email: ${employeeEmail}\n` +
    `🔗 Onboarding Link: ${onboardingUrl}\n\n` +
    `⏰ Link expires in 48 hours`;

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return { success: false, error };
  }
}