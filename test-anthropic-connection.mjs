import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

async function testConnection() {
  console.log('\n🔍 Checking Anthropic API Key...');

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('❌ ANTHROPIC_API_KEY is not set in environment variables');
    console.log('\nThis is why you\'re getting "Connection error"');
    console.log('\nTo fix: Add ANTHROPIC_API_KEY to .env.development.local and Vercel');
    process.exit(1);
  }

  console.log(`✅ ANTHROPIC_API_KEY found: ${apiKey.substring(0, 20)}...`);

  console.log('\n🧪 Testing connection with claude-sonnet-4-5...');

  try {
    const client = new Anthropic({
      apiKey: apiKey,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Say hello'
        }
      ]
    });

    console.log('✅ Connection successful!');
    console.log(`📊 Model: ${response.model}`);
    console.log(`💬 Response: ${response.content[0].text}`);
    console.log(`🎯 Stop reason: ${response.stop_reason}`);
    console.log(`📈 Tokens used: ${response.usage.input_tokens} in + ${response.usage.output_tokens} out`);

  } catch (error) {
    console.log('❌ Connection failed!');
    console.log(`Error: ${error.message}`);
    console.log('\nFull error:', error);

    if (error.status === 401) {
      console.log('\n💡 API key is invalid. Check your Anthropic API key.');
    } else if (error.status === 404) {
      console.log('\n💡 Model "claude-sonnet-4-5" not found. The model name might be incorrect.');
      console.log('   Try: claude-sonnet-4-20250514 or claude-3-7-sonnet-20250219');
    } else if (error.message.includes('Connection')) {
      console.log('\n💡 Network connection issue. Check internet connectivity.');
    }
  }
}

testConnection();
