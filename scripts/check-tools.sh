#!/bin/bash

# Tool Check Script for AI-Powered Gym SaaS Platform
# This script checks which tools are installed and provides installation instructions

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   CLI Tools Check for AI-Powered Gym SaaS Platform         ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_installed() {
    echo -e "${GREEN}✓${NC} $1 is installed: $2"
}

print_missing() {
    echo -e "${RED}✗${NC} $1 is NOT installed"
}

print_section() {
    echo -e "\n${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Arrays to track missing tools
missing_tools=()
npm_tools=()
homebrew_tools=()

# Check each tool
print_section "Core Development Tools"

# Git
if command_exists git; then
    print_installed "Git" "$(git --version 2>&1 | head -n1)"
else
    print_missing "Git"
    missing_tools+=("git")
fi

# Node.js and npm
if command_exists node; then
    print_installed "Node.js" "$(node --version)"
else
    print_missing "Node.js"
    missing_tools+=("node")
fi

if command_exists npm; then
    print_installed "npm" "$(npm --version)"
else
    print_missing "npm"
    missing_tools+=("npm")
fi

# Package Managers
print_section "Package Managers"

if command_exists pnpm; then
    print_installed "pnpm" "$(pnpm --version)"
else
    print_missing "pnpm"
    npm_tools+=("pnpm")
fi

# CLI Tools
print_section "Platform-Specific CLI Tools"

if command_exists vercel; then
    print_installed "Vercel CLI" "$(vercel --version 2>&1 | head -n1)"
else
    print_missing "Vercel CLI"
    npm_tools+=("vercel")
fi

if command_exists supabase; then
    print_installed "Supabase CLI" "$(supabase --version)"
else
    print_missing "Supabase CLI"
    homebrew_tools+=("supabase/tap/supabase")
fi

if command_exists gh; then
    print_installed "GitHub CLI" "$(gh --version 2>&1 | head -n1)"
else
    print_missing "GitHub CLI"
    homebrew_tools+=("gh")
fi

# Development Tools
print_section "Development Tools"

if command_exists docker; then
    print_installed "Docker" "$(docker --version)"
else
    print_missing "Docker"
    echo "  ${YELLOW}→ Install Docker Desktop from: https://www.docker.com/products/docker-desktop${NC}"
fi

if command_exists ngrok; then
    print_installed "ngrok" "$(ngrok --version)"
else
    print_missing "ngrok"
    homebrew_tools+=("ngrok/ngrok/ngrok")
fi

# Utilities
print_section "Utility Tools"

if command_exists jq; then
    print_installed "jq" "$(jq --version)"
else
    print_missing "jq"
    homebrew_tools+=("jq")
fi

if command_exists rg; then
    print_installed "ripgrep" "$(rg --version 2>&1 | head -n1)"
else
    print_missing "ripgrep"
    homebrew_tools+=("ripgrep")
fi

if command_exists fzf; then
    print_installed "fzf" "$(fzf --version)"
else
    print_missing "fzf"
    homebrew_tools+=("fzf")
fi

if command_exists watchman; then
    print_installed "watchman" "$(watchman --version)"
else
    print_missing "watchman"
    homebrew_tools+=("watchman")
fi

if command_exists direnv; then
    print_installed "direnv" "$(direnv --version)"
else
    print_missing "direnv"
    homebrew_tools+=("direnv")
fi

if command_exists tmux; then
    print_installed "tmux" "$(tmux -V)"
else
    print_missing "tmux"
    homebrew_tools+=("tmux")
fi

if command_exists htop; then
    print_installed "htop" "htop installed"
else
    print_missing "htop"
    homebrew_tools+=("htop")
fi

# Installation Instructions
echo ""
print_section "Installation Instructions"

# Check if Homebrew is installed
if ! command_exists brew; then
    echo -e "${RED}Homebrew is not installed!${NC}"
    echo ""
    echo "To install Homebrew, run:"
    echo -e "${YELLOW}/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
    echo ""
    echo "After installing Homebrew, run this script again."
else
    # Homebrew tools
    if [ ${#homebrew_tools[@]} -gt 0 ]; then
        echo -e "${YELLOW}Install missing Homebrew packages:${NC}"
        echo "brew install ${homebrew_tools[*]}"
        echo ""
    fi
fi

# NPM tools
if [ ${#npm_tools[@]} -gt 0 ]; then
    echo -e "${YELLOW}Install missing npm packages globally:${NC}"
    echo "npm install -g ${npm_tools[*]}"
    echo ""
fi

# Manual installations
echo -e "${YELLOW}Manual installations required:${NC}"
if ! command_exists docker; then
    echo "• Docker Desktop: https://www.docker.com/products/docker-desktop"
fi

# Summary
echo ""
print_section "Summary"

total_tools=16
installed_tools=$((total_tools - ${#missing_tools[@]} - ${#npm_tools[@]} - ${#homebrew_tools[@]}))

if ! command_exists docker; then
    installed_tools=$((installed_tools - 1))
fi

echo "Tools installed: $installed_tools/$total_tools"

if [ $installed_tools -eq $total_tools ]; then
    echo -e "${GREEN}All tools are installed!${NC}"
else
    echo -e "${YELLOW}Some tools are missing. Follow the instructions above to install them.${NC}"
fi

# Next steps
echo ""
print_section "Next Steps After Installation"
echo "1. Configure GitHub CLI: gh auth login"
echo "2. Configure Vercel CLI: vercel login" 
echo "3. Configure Supabase CLI: supabase login"
echo "4. If Docker was installed, restart your terminal"

# Quick install command generator
if [ ${#homebrew_tools[@]} -gt 0 ] || [ ${#npm_tools[@]} -gt 0 ]; then
    echo ""
    print_section "Quick Install Commands"
    
    if [ ${#homebrew_tools[@]} -gt 0 ] && command_exists brew; then
        echo "brew install ${homebrew_tools[*]}"
    fi
    
    if [ ${#npm_tools[@]} -gt 0 ] && command_exists npm; then
        echo "npm install -g ${npm_tools[*]}"
    fi
fi