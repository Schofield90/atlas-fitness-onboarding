const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'
);

async function testClientMessaging() {
  console.log('🔐 Logging in as client...');
  
  // Login as client
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'samschofield90@hotmail.co.uk',
    password: '@Aa80236661'
  });
  
  if (authError) {
    console.error('❌ Login failed:', authError);
    return;
  }
  
  console.log('✅ Logged in as client');
  console.log('   User ID:', authData.user.id);
  console.log('   Session token:', authData.session.access_token.substring(0, 20) + '...');
  
  // Test the conversation API
  console.log('\n📞 Testing conversation API...');
  
  const response = await fetch('http://localhost:3001/api/client/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session.access_token}`,
      'Cookie': Object.entries({
        [`sb-lzlrojoaxrqvmhempnkn-auth-token.0`]: authData.session.access_token,
        [`sb-lzlrojoaxrqvmhempnkn-auth-token.1`]: authData.session.refresh_token
      }).map(([k, v]) => `${k}=${v}`).join('; ')
    }
  });
  
  const result = await response.json();
  console.log('API Response:', result);
  
  if (result.conversation_id) {
    console.log('✅ Conversation initialized:', result.conversation_id);
    
    // Now test sending a message
    console.log('\n💬 Testing message send...');
    
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    const messageData = {
      conversation_id: result.conversation_id,
      client_id: clientData.id,
      customer_id: clientData.id,
      organization_id: clientData.org_id,
      channel: 'in_app',
      sender_type: 'client',
      sender_name: clientData.first_name || 'Client',
      message_type: 'text',
      type: 'text',
      direction: 'inbound',
      content: 'Test message from client',
      body: 'Test message from client',
      status: 'sent',
      sender_id: clientData.id,
      metadata: {}
    };
    
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    
    if (msgError) {
      console.error('❌ Message send failed:', msgError);
    } else {
      console.log('✅ Message sent successfully:', message.id);
    }
  }
  
  // Sign out
  await supabase.auth.signOut();
  console.log('\n👋 Signed out');
}

testClientMessaging().catch(console.error);