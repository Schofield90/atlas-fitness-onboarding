const BOT_TOKEN = '7951284322:AAEZOBz0MRHnkRyaQUGKhk2CL6C5Wl8u6s0';
const CHAT_ID = '5014297903';

async function sendMessage() {
  const message = `🎉 Atlas Fitness Automation Update Complete\!

✅ Fixed: Build errors in queue system
🚀 Enhanced: GHL-like automation features  
📦 Status: Successfully built & deployed to GitHub
🔧 Ready for testing

The automation system improvements are live\!`;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message
    })
  });

  const result = await response.json();
  console.log('Message sent:', result.ok ? '✅' : '❌');
}

sendMessage().catch(console.error);
