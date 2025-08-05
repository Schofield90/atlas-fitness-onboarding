#!/bin/bash

# Atlas Fitness CRM - Claude Agent Setup Script

echo "🚀 Setting up Claude Code Agent System for Atlas Fitness CRM"
echo "==========================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 not found"
        return 1
    fi
}

# Function to count lines in file
count_lines() {
    if [ -f "$1" ]; then
        lines=$(wc -l < "$1")
        echo -e "  └─ ${BLUE}$lines lines${NC}"
    fi
}

echo -e "\n${YELLOW}Checking directory structure...${NC}"
echo "-------------------------------"

# Check directories
for dir in ".claude" ".claude/agents" ".claude/context" ".claude/commands"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} Directory: $dir"
    else
        echo -e "${RED}✗${NC} Directory missing: $dir"
        mkdir -p "$dir"
        echo -e "  └─ ${BLUE}Created${NC}"
    fi
done

echo -e "\n${YELLOW}Verifying agent files...${NC}"
echo "------------------------"

# Check agent files
agents=(
    ".claude/agents/database-architect.md"
    ".claude/agents/api-integration-specialist.md"
    ".claude/agents/automation-engine-architect.md"
    ".claude/agents/ai-services-engineer.md"
    ".claude/agents/automation-workflow-architect.md"
)

all_agents_present=true
for agent in "${agents[@]}"; do
    if check_file "$agent"; then
        count_lines "$agent"
    else
        all_agents_present=false
    fi
done

echo -e "\n${YELLOW}Verifying context files...${NC}"
echo "--------------------------"

# Check context files
contexts=(
    ".claude/context/crm-architecture.md"
    ".claude/context/database-schema.md"
    ".claude/context/api-integrations.md"
    ".claude/context/development-standards.md"
)

all_contexts_present=true
for context in "${contexts[@]}"; do
    if check_file "$context"; then
        count_lines "$context"
    else
        all_contexts_present=false
    fi
done

echo -e "\n${YELLOW}Checking main configuration...${NC}"
echo "------------------------------"

# Check main CLAUDE.md
if check_file ".claude/CLAUDE.md"; then
    count_lines ".claude/CLAUDE.md"
else
    echo -e "${RED}Main configuration file missing!${NC}"
fi

# Summary
echo -e "\n${YELLOW}Summary${NC}"
echo "======="

total_files=$(find .claude -name "*.md" -type f | wc -l)
total_size=$(find .claude -name "*.md" -type f -exec cat {} + | wc -c)
total_lines=$(find .claude -name "*.md" -type f -exec cat {} + | wc -l)

echo -e "Total files: ${BLUE}$total_files${NC}"
echo -e "Total size: ${BLUE}$(echo "scale=2; $total_size/1024" | bc) KB${NC}"
echo -e "Total lines: ${BLUE}$total_lines${NC}"

# Git operations
echo -e "\n${YELLOW}Git Operations${NC}"
echo "=============="

# Check if .claude is in .gitignore
if grep -q "^\.claude$" .gitignore 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC} .claude is in .gitignore"
    echo "Remove it from .gitignore if you want to commit the agent system"
else
    echo -e "${GREEN}✓${NC} .claude is not in .gitignore"
    
    # Add to git
    echo -e "\n${BLUE}Adding files to git...${NC}"
    git add .claude/
    git add setup-agents.sh
    
    # Show git status
    echo -e "\n${BLUE}Git status:${NC}"
    git status --short .claude/ setup-agents.sh
    
    # Prompt for commit
    echo -e "\n${YELLOW}Ready to commit?${NC}"
    read -p "Enter 'y' to commit, or any other key to skip: " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git commit -m "feat: Add comprehensive Claude Code sub-agent system

- Added 5 specialized agents for different domains
- Created detailed context files for architecture and standards
- Implemented agent-specific expertise and patterns
- Set up project CLAUDE.md with workflow documentation"
        
        echo -e "\n${GREEN}✓${NC} Changes committed!"
        echo -e "\n${YELLOW}To push to remote:${NC}"
        echo "git push origin main"
    else
        echo -e "\n${BLUE}Skipped commit. Files are staged for commit.${NC}"
    fi
fi

# Make script executable
chmod +x setup-agents.sh

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Review the agent configurations in .claude/agents/"
echo "2. Check the context files in .claude/context/"
echo "3. Read .claude/CLAUDE.md for workflow guidelines"
echo "4. Test an agent by asking: 'Have the database-architect review our current schema'"

# Test one agent
echo -e "\n${YELLOW}Quick Agent Test${NC}"
echo "================"
echo "You can now use specialized agents. For example:"
echo -e "${BLUE}@database-architect${NC} - Review database schema and suggest optimizations"
echo -e "${BLUE}@api-integration-specialist${NC} - Help with Meta Ads API integration"
echo -e "${BLUE}@automation-workflow-architect${NC} - Design complex automation workflows"
echo -e "${BLUE}@ai-services-engineer${NC} - Implement lead scoring with ML"

exit 0