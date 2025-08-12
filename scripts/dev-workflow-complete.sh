#!/bin/bash

# Complete Development Workflow Script for AI-Powered Gym SaaS
# This script provides a menu-driven interface for all development tasks

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Project information
PROJECT_NAME="AI-Powered Gym SaaS Platform"

print_header() {
    clear
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}   $PROJECT_NAME - Development Workflow   ${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_menu() {
    echo -e "\n${CYAN}Main Menu:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "1)  🚀 Quick Start (Dev Server)"
    echo "2)  📦 Dependency Management"
    echo "3)  🗄️  Database Operations"
    echo "4)  🧪 Testing"
    echo "5)  🔧 Build & Deploy"
    echo "6)  🔍 Code Quality"
    echo "7)  🐳 Docker Operations"
    echo "8)  🔐 Environment Setup"
    echo "9)  🛠️  Utilities"
    echo "10) 📚 Documentation"
    echo "0)  ❌ Exit"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Quick start options
quick_start_menu() {
    echo -e "\n${CYAN}Quick Start Options:${NC}"
    echo "1) Start development server (normal)"
    echo "2) Start with Turbopack (fast)"
    echo "3) Start with increased memory"
    echo "4) Start Supabase locally"
    echo "5) Start everything (full stack)"
    echo "0) Back to main menu"
    
    read -p "Select option: " choice
    
    case $choice in
        1) pnpm dev ;;
        2) pnpm dev:turbo ;;
        3) pnpm dev:quick ;;
        4) supabase start ;;
        5) 
            supabase start
            pnpm dev:turbo
            ;;
        0) return ;;
        *) echo "Invalid option" ;;
    esac
}

# Dependency management
dependency_menu() {
    echo -e "\n${CYAN}Dependency Management:${NC}"
    echo "1) Install all dependencies"
    echo "2) Update dependencies"
    echo "3) Check outdated packages"
    echo "4) Clean install (remove node_modules)"
    echo "5) Install specific package"
    echo "0) Back to main menu"
    
    read -p "Select option: " choice
    
    case $choice in
        1) pnpm install ;;
        2) pnpm update ;;
        3) pnpm outdated ;;
        4) pnpm clean:all ;;
        5) 
            read -p "Package name: " package
            pnpm add "$package"
            ;;
        0) return ;;
        *) echo "Invalid option" ;;
    esac
}

# Database operations
database_menu() {
    echo -e "\n${CYAN}Database Operations:${NC}"
    echo "1) Run migrations"
    echo "2) Reset database"
    echo "3) Seed database"
    echo "4) Generate types"
    echo "5) Create new migration"
    echo "6) Validate database"
    echo "7) Database health check"
    echo "8) Start Supabase Studio"
    echo "0) Back to main menu"
    
    read -p "Select option: " choice
    
    case $choice in
        1) pnpm db:migrate ;;
        2) pnpm db:reset ;;
        3) pnpm db:seed ;;
        4) pnpm db:generate ;;
        5) 
            read -p "Migration name: " name
            supabase migration new "$name"
            ;;
        6) pnpm db:validate ;;
        7) pnpm db:health ;;
        8) supabase studio ;;
        0) return ;;
        *) echo "Invalid option" ;;
    esac
}

# Testing menu
testing_menu() {
    echo -e "\n${CYAN}Testing Options:${NC}"
    echo "1) Run all tests"
    echo "2) Run tests in watch mode"
    echo "3) Run with coverage"
    echo "4) Run E2E tests"
    echo "5) Run security tests"
    echo "6) Run API tests"
    echo "7) Run database tests"
    echo "8) Run performance tests"
    echo "0) Back to main menu"
    
    read -p "Select option: " choice
    
    case $choice in
        1) pnpm test ;;
        2) pnpm test:watch ;;
        3) pnpm test:coverage ;;
        4) pnpm test:e2e ;;
        5) pnpm test:security ;;
        6) pnpm test:api ;;
        7) pnpm test:db ;;
        8) pnpm test:perf ;;
        0) return ;;
        *) echo "Invalid option" ;;
    esac
}

# Build and deploy menu
build_deploy_menu() {
    echo -e "\n${CYAN}Build & Deploy Options:${NC}"
    echo "1) Build for production"
    echo "2) Build with analysis"
    echo "3) Deploy to Vercel (preview)"
    echo "4) Deploy to Vercel (production)"
    echo "5) Pull Vercel environment"
    echo "6) Link Vercel project"
    echo "0) Back to main menu"
    
    read -p "Select option: " choice
    
    case $choice in
        1) pnpm build ;;
        2) pnpm build:analyze ;;
        3) pnpm vercel:preview ;;
        4) pnpm vercel:deploy ;;
        5) pnpm vercel:env:pull ;;
        6) pnpm vercel:link ;;
        0) return ;;
        *) echo "Invalid option" ;;
    esac
}

# Code quality menu
code_quality_menu() {
    echo -e "\n${CYAN}Code Quality:${NC}"
    echo "1) Run linter"
    echo "2) Fix linting issues"
    echo "3) Run type checking"
    echo "4) Format code"
    echo "5) Check formatting"
    echo "6) Run all checks"
    echo "0) Back to main menu"
    
    read -p "Select option: " choice
    
    case $choice in
        1) pnpm lint ;;
        2) pnpm lint:fix ;;
        3) pnpm type-check ;;
        4) pnpm format ;;
        5) pnpm format:check ;;
        6) 
            pnpm lint
            pnpm type-check
            pnpm format:check
            ;;
        0) return ;;
        *) echo "Invalid option" ;;
    esac
}

# Docker operations
docker_menu() {
    echo -e "\n${CYAN}Docker Operations:${NC}"
    echo "1) Start development containers"
    echo "2) Build and start containers"
    echo "3) Stop all containers"
    echo "4) View container logs"
    echo "5) Clean Docker resources"
    echo "0) Back to main menu"
    
    read -p "Select option: " choice
    
    case $choice in
        1) pnpm docker:dev ;;
        2) pnpm docker:build ;;
        3) docker-compose down ;;
        4) docker-compose logs -f ;;
        5) docker system prune -a ;;
        0) return ;;
        *) echo "Invalid option" ;;
    esac
}

# Environment setup
environment_menu() {
    echo -e "\n${CYAN}Environment Setup:${NC}"
    echo "1) Setup environment files"
    echo "2) Validate environment"
    echo "3) Generate secrets"
    echo "4) Show required variables"
    echo "5) Sync from Vercel"
    echo "0) Back to main menu"
    
    read -p "Select option: " choice
    
    case $choice in
        1) pnpm env:setup ;;
        2) pnpm validate-env ;;
        3) ./scripts/setup-env.sh ;;
        4) cat .env.example | grep -E "^[A-Z]" | cut -d= -f1 ;;
        5) pnpm vercel:env:pull ;;
        0) return ;;
        *) echo "Invalid option" ;;
    esac
}

# Utilities menu
utilities_menu() {
    echo -e "\n${CYAN}Utilities:${NC}"
    echo "1) Open Storybook"
    echo "2) Clean cache"
    echo "3) Check tool versions"
    echo "4) Open Supabase Studio"
    echo "5) Open VS Code"
    echo "6) Git status"
    echo "7) Create component"
    echo "8) Create API route"
    echo "0) Back to main menu"
    
    read -p "Select option: " choice
    
    case $choice in
        1) pnpm storybook ;;
        2) pnpm clean ;;
        3) 
            echo "Node: $(node -v)"
            echo "pnpm: $(pnpm -v)"
            echo "npm: $(npm -v)"
            ;;
        4) open http://localhost:54323 ;;
        5) code . ;;
        6) git status ;;
        7) 
            read -p "Component name: " name
            node scripts/create-component.js "$name"
            ;;
        8) 
            read -p "API route path: " path
            node scripts/create-api-route.js "$path"
            ;;
        0) return ;;
        *) echo "Invalid option" ;;
    esac
}

# Documentation menu
documentation_menu() {
    echo -e "\n${CYAN}Documentation:${NC}"
    echo "1) View README"
    echo "2) View CLAUDE.md"
    echo "3) View environment setup"
    echo "4) Open documentation site"
    echo "5) Generate API docs"
    echo "0) Back to main menu"
    
    read -p "Select option: " choice
    
    case $choice in
        1) less README.md ;;
        2) less CLAUDE.md ;;
        3) less .env.example ;;
        4) open https://docs.your-domain.com ;;
        5) echo "Generating API documentation..." ;;
        0) return ;;
        *) echo "Invalid option" ;;
    esac
}

# Main loop
main() {
    while true; do
        print_header
        print_menu
        
        read -p "Select option: " choice
        
        case $choice in
            1) quick_start_menu ;;
            2) dependency_menu ;;
            3) database_menu ;;
            4) testing_menu ;;
            5) build_deploy_menu ;;
            6) code_quality_menu ;;
            7) docker_menu ;;
            8) environment_menu ;;
            9) utilities_menu ;;
            10) documentation_menu ;;
            0) 
                echo -e "\n${GREEN}Thanks for using the development workflow tool!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option. Please try again.${NC}"
                sleep 2
                ;;
        esac
        
        if [ "$choice" != "0" ]; then
            echo -e "\n${YELLOW}Press Enter to continue...${NC}"
            read
        fi
    done
}

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Using npm instead.${NC}"
    alias pnpm=npm
fi

# Run main loop
main