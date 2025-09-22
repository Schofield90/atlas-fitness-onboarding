#!/bin/bash

# Setup script for Claude Code agents and configuration
echo "🤖 Setting up Claude Code configuration..."

# Create .claude directory in home if it doesn't exist
mkdir -p ~/.claude

# Copy agents from repo to home directory
if [ -d ".claude/agents" ]; then
    echo "📦 Copying agents..."
    cp -r .claude/agents ~/.claude/
    echo "✅ Agents copied"
fi

# Copy context files
if [ -d ".claude/context" ]; then
    echo "📚 Copying context files..."
    cp -r .claude/context ~/.claude/
    echo "✅ Context files copied"
fi

# Copy main configuration files
if [ -f ".claude/CLAUDE.md" ]; then
    echo "📄 Copying CLAUDE.md..."
    cp .claude/CLAUDE.md ~/.claude/
    echo "✅ CLAUDE.md copied"
fi

if [ -f ".claude/project.json" ]; then
    echo "📋 Copying project.json..."
    cp .claude/project.json ~/.claude/
    echo "✅ project.json copied"
fi

echo ""
echo "✨ Claude Code setup complete!"
echo ""
echo "The following have been installed to ~/.claude/:"
echo "  • Specialized agents (database-architect, api-guardian, etc.)"
echo "  • Project context files"
echo "  • Configuration files"
echo ""
echo "Claude Code will now have access to all your custom agents!"