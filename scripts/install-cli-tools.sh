#!/bin/bash

# Comprehensive CLI Tools Installation Script for AI-Powered Gym SaaS Platform
# This script installs all required CLI tools with error handling and OS detection

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# OS Detection
detect_os() {
    case "$(uname -s)" in
        Darwin*)    OS='Mac';;
        Linux*)     OS='Linux';;
        CYGWIN*|MINGW*|MSYS*) OS='Windows';;
        *)          OS="UNKNOWN:${unameOut}"
    esac
    echo -e "${BLUE}Detected OS: $OS${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if [[ "$OS" == "Mac" ]]; then
        if ! command_exists brew; then
            print_error "Homebrew is not installed. Installing..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        else
            print_success "Homebrew is installed"
            brew update
        fi
    elif [[ "$OS" == "Linux" ]]; then
        if command_exists apt-get; then
            print_success "apt-get found"
            sudo apt-get update
        elif command_exists yum; then
            print_success "yum found"
            sudo yum update
        else
            print_error "No supported package manager found"
            exit 1
        fi
    fi
}

# Install Node.js and npm via nvm
install_node() {
    print_status "Installing Node.js..."
    
    if command_exists node && command_exists npm; then
        NODE_VERSION=$(node --version)
        print_warning "Node.js $NODE_VERSION is already installed"
        
        # Check if it's the correct version (20.x)
        if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
            print_warning "Current Node.js version is $NODE_VERSION. Installing v20..."
            if command_exists nvm; then
                nvm install 20
                nvm use 20
                nvm alias default 20
            else
                print_status "Installing nvm first..."
                curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
                nvm install 20
                nvm use 20
                nvm alias default 20
            fi
        fi
    else
        print_status "Installing nvm and Node.js 20..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 20
        nvm use 20
        nvm alias default 20
    fi
    
    print_success "Node.js $(node --version) and npm $(npm --version) installed"
}

# Install pnpm
install_pnpm() {
    print_status "Installing pnpm..."
    
    if command_exists pnpm; then
        print_warning "pnpm is already installed: $(pnpm --version)"
    else
        npm install -g pnpm
        print_success "pnpm installed: $(pnpm --version)"
    fi
}

# Install Vercel CLI
install_vercel() {
    print_status "Installing Vercel CLI..."
    
    if command_exists vercel; then
        print_warning "Vercel CLI is already installed: $(vercel --version)"
    else
        npm install -g vercel
        print_success "Vercel CLI installed"
    fi
}

# Install Supabase CLI
install_supabase() {
    print_status "Installing Supabase CLI..."
    
    if command_exists supabase; then
        print_warning "Supabase CLI is already installed: $(supabase --version)"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install supabase/tap/supabase
        elif [[ "$OS" == "Linux" ]]; then
            # Install via npm as alternative
            npm install -g supabase
        fi
        print_success "Supabase CLI installed"
    fi
}

# Install GitHub CLI
install_github_cli() {
    print_status "Installing GitHub CLI..."
    
    if command_exists gh; then
        print_warning "GitHub CLI is already installed: $(gh --version)"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install gh
        elif [[ "$OS" == "Linux" ]]; then
            if command_exists apt-get; then
                curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
                sudo apt update
                sudo apt install gh
            else
                print_error "Please install GitHub CLI manually"
            fi
        fi
        print_success "GitHub CLI installed"
    fi
}

# Install Git
install_git() {
    print_status "Installing Git..."
    
    if command_exists git; then
        print_warning "Git is already installed: $(git --version)"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install git
        elif [[ "$OS" == "Linux" ]]; then
            if command_exists apt-get; then
                sudo apt-get install -y git
            elif command_exists yum; then
                sudo yum install -y git
            fi
        fi
        print_success "Git installed"
    fi
}

# Install Docker
install_docker() {
    print_status "Installing Docker..."
    
    if command_exists docker; then
        print_warning "Docker is already installed: $(docker --version)"
    else
        if [[ "$OS" == "Mac" ]]; then
            print_warning "Please install Docker Desktop manually from https://www.docker.com/products/docker-desktop"
        elif [[ "$OS" == "Linux" ]]; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            sudo usermod -aG docker $USER
            rm get-docker.sh
            print_success "Docker installed. Please log out and back in for group changes to take effect."
        fi
    fi
}

# Install ngrok
install_ngrok() {
    print_status "Installing ngrok..."
    
    if command_exists ngrok; then
        print_warning "ngrok is already installed: $(ngrok --version)"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install ngrok/ngrok/ngrok
        elif [[ "$OS" == "Linux" ]]; then
            curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
            echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
            sudo apt update && sudo apt install ngrok
        fi
        print_success "ngrok installed"
    fi
}

# Install jq
install_jq() {
    print_status "Installing jq..."
    
    if command_exists jq; then
        print_warning "jq is already installed: $(jq --version)"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install jq
        elif [[ "$OS" == "Linux" ]]; then
            if command_exists apt-get; then
                sudo apt-get install -y jq
            elif command_exists yum; then
                sudo yum install -y jq
            fi
        fi
        print_success "jq installed"
    fi
}

# Install ripgrep
install_ripgrep() {
    print_status "Installing ripgrep..."
    
    if command_exists rg; then
        print_warning "ripgrep is already installed: $(rg --version)"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install ripgrep
        elif [[ "$OS" == "Linux" ]]; then
            if command_exists apt-get; then
                sudo apt-get install -y ripgrep
            elif command_exists yum; then
                sudo yum install -y ripgrep
            fi
        fi
        print_success "ripgrep installed"
    fi
}

# Install fzf
install_fzf() {
    print_status "Installing fzf..."
    
    if command_exists fzf; then
        print_warning "fzf is already installed: $(fzf --version)"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install fzf
        elif [[ "$OS" == "Linux" ]]; then
            git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
            ~/.fzf/install --all
        fi
        print_success "fzf installed"
    fi
}

# Install watchman
install_watchman() {
    print_status "Installing watchman..."
    
    if command_exists watchman; then
        print_warning "watchman is already installed: $(watchman --version)"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install watchman
        elif [[ "$OS" == "Linux" ]]; then
            print_warning "Please install watchman manually from https://facebook.github.io/watchman/docs/install"
        fi
        print_success "watchman installed"
    fi
}

# Install direnv
install_direnv() {
    print_status "Installing direnv..."
    
    if command_exists direnv; then
        print_warning "direnv is already installed: $(direnv --version)"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install direnv
        elif [[ "$OS" == "Linux" ]]; then
            if command_exists apt-get; then
                sudo apt-get install -y direnv
            else
                curl -sfL https://direnv.net/install.sh | bash
            fi
        fi
        print_success "direnv installed"
        
        # Add hook to shell
        if [[ -f ~/.bashrc ]]; then
            echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
        fi
        if [[ -f ~/.zshrc ]]; then
            echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
        fi
    fi
}

# Install tmux
install_tmux() {
    print_status "Installing tmux..."
    
    if command_exists tmux; then
        print_warning "tmux is already installed: $(tmux -V)"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install tmux
        elif [[ "$OS" == "Linux" ]]; then
            if command_exists apt-get; then
                sudo apt-get install -y tmux
            elif command_exists yum; then
                sudo yum install -y tmux
            fi
        fi
        print_success "tmux installed"
    fi
}

# Install htop
install_htop() {
    print_status "Installing htop..."
    
    if command_exists htop; then
        print_warning "htop is already installed"
    else
        if [[ "$OS" == "Mac" ]]; then
            brew install htop
        elif [[ "$OS" == "Linux" ]]; then
            if command_exists apt-get; then
                sudo apt-get install -y htop
            elif command_exists yum; then
                sudo yum install -y htop
            fi
        fi
        print_success "htop installed"
    fi
}

# Verify all installations
verify_installations() {
    print_status "Verifying installations..."
    echo ""
    
    tools=(
        "node:Node.js"
        "npm:npm"
        "pnpm:pnpm"
        "vercel:Vercel CLI"
        "supabase:Supabase CLI"
        "gh:GitHub CLI"
        "git:Git"
        "docker:Docker"
        "ngrok:ngrok"
        "jq:jq"
        "rg:ripgrep"
        "fzf:fzf"
        "watchman:watchman"
        "direnv:direnv"
        "tmux:tmux"
        "htop:htop"
    )
    
    failed_tools=()
    
    for tool in "${tools[@]}"; do
        IFS=':' read -r cmd name <<< "$tool"
        if command_exists "$cmd"; then
            print_success "$name is installed"
        else
            print_error "$name is NOT installed"
            failed_tools+=("$name")
        fi
    done
    
    echo ""
    if [ ${#failed_tools[@]} -eq 0 ]; then
        print_success "All tools installed successfully!"
    else
        print_error "The following tools failed to install:"
        for tool in "${failed_tools[@]}"; do
            echo "  - $tool"
        done
        echo ""
        print_warning "Please install these tools manually"
    fi
}

# Main installation flow
main() {
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}   CLI Tools Installation Script for AI-Powered Gym SaaS    ${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    detect_os
    check_prerequisites
    
    # Install all tools
    install_git
    install_node
    install_pnpm
    install_vercel
    install_supabase
    install_github_cli
    install_docker
    install_ngrok
    install_jq
    install_ripgrep
    install_fzf
    install_watchman
    install_direnv
    install_tmux
    install_htop
    
    # Verify installations
    echo ""
    verify_installations
    
    echo ""
    print_status "Installation complete!"
    echo ""
    print_warning "Next steps:"
    echo "1. Restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
    echo "2. Configure GitHub CLI: gh auth login"
    echo "3. Configure Vercel CLI: vercel login"
    echo "4. Configure Supabase CLI: supabase login"
    echo "5. If Docker was installed, log out and back in for group changes"
    echo ""
}

# Run main function
main