require('dotenv').config({ path: '.env.local' })

console.log('Testing OpenAI configuration...\n')

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY is not set in .env.local')
  process.exit(1)
}

console.log('✅ OPENAI_API_KEY found')
console.log(`   Key starts with: ${apiKey.substring(0, 10)}...`)
console.log(`   Key length: ${apiKey.length} characters\n`)

// Test the API key
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: apiKey
})

async function testAPI() {
  try {
    console.log('Testing API connection...')
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10
    })
    
    console.log('✅ API connection successful!')
    console.log(`   Response: ${response.choices[0].message.content}`)
    
  } catch (error) {
    console.error('❌ API connection failed:', error.message)
    if (error.code === 'invalid_api_key') {
      console.error('   The API key appears to be invalid')
    }
  }
}

testAPI()