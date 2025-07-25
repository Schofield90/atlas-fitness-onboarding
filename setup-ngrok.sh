#!/bin/bash

echo "Setting up ngrok for local WhatsApp webhook testing..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "ngrok not found. Installing..."
    # For macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ngrok/ngrok/ngrok
    else
        echo "Please install ngrok from: https://ngrok.com/download"
        exit 1
    fi
fi

echo "Starting ngrok tunnel on port 3000..."
echo "Once ngrok starts, copy the HTTPS URL and update your Twilio webhook."
echo ""
echo "Example: https://abc123.ngrok.io/api/webhooks/twilio"
echo ""

# Start ngrok
ngrok http 3000