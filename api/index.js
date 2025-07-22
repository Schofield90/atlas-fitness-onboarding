const { spawn } = require('child_process');
const path = require('path');

module.exports = (req, res) => {
  // This is a basic proxy to handle n8n requests on Vercel
  // Note: Running full n8n on Vercel serverless functions has limitations
  // Consider using this as a webhook endpoint or API proxy instead
  
  if (req.method === 'GET' && req.url === '/') {
    res.status(200).json({
      message: 'n8n API endpoint',
      status: 'running',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  if (req.method === 'POST' && req.url.startsWith('/webhook')) {
    // Handle webhook requests
    const body = req.body;
    
    // Process webhook data here
    // You can integrate with your Supabase database
    
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      data: body
    });
    return;
  }
  
  res.status(404).json({ error: 'Not found' });
};