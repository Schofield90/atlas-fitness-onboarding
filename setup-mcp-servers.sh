#!/bin/bash

# Setup MCP Servers for Claude Desktop on New Machine
# Run this script on your other machine after cloning the repo

echo "🚀 Setting up MCP Servers for Claude Desktop..."

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    CONFIG_DIR="$APPDATA/Claude"
else
    # Linux
    CONFIG_DIR="$HOME/.config/Claude"
fi

# Create directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Backup existing config if present
if [ -f "$CONFIG_DIR/claude_desktop_config.json" ]; then
    echo "📦 Backing up existing configuration..."
    cp "$CONFIG_DIR/claude_desktop_config.json" "$CONFIG_DIR/claude_desktop_config_backup_$(date +%Y%m%d_%H%M%S).json"
fi

# Copy the configuration
echo "📋 Copying MCP server configuration..."
cp claude_desktop_config_backup.json "$CONFIG_DIR/claude_desktop_config.json"

echo "✅ MCP Servers configured successfully!"
echo ""
echo "📌 The following MCP servers are now configured:"
echo "   • telegram-mcp-server - Telegram bot integration"
echo "   • xero - Xero accounting integration"
echo "   • firecrawl-mcp-server - Web scraping and crawling"
echo "   • playwright-mcp - Browser automation and testing"
echo "   • replicate-flux-mcp - AI image generation"
echo "   • Jam - Bug reporting and debugging"
echo ""
echo "⚠️  Note: You may need to:"
echo "   1. Restart Claude Desktop for changes to take effect"
echo "   2. Update environment variables in the config if paths differ"
echo "   3. Install any required dependencies (Node.js, npm, etc.)"
echo ""
echo "🔧 To verify installation, open Claude Desktop and check if MCP tools are available."