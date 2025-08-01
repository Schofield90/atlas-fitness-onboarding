# Docker Development Guide

This guide helps you run the Atlas Fitness app locally using Docker, which solves common localhost issues.

## Prerequisites

1. **Install Docker Desktop**
   - Mac: https://docs.docker.com/desktop/install/mac-install/
   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Linux: https://docs.docker.com/desktop/install/linux-install/

2. **Ensure Docker is running**
   - You should see the Docker whale icon in your system tray/menu bar

## Quick Start

### 1. Set up environment variables
```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials
# Get these from your Vercel project settings
```

### 2. Run with Docker
```bash
# Use the convenience script
./docker-dev.sh

# OR run Docker commands directly
docker-compose up
```

### 3. Access the app
Open http://localhost:3000 in your browser

## Common Issues & Solutions

### "Cannot connect to localhost:3000"
1. Check Docker is running: `docker ps`
2. Check logs: `docker-compose logs app`
3. Try accessing via Docker IP: `http://0.0.0.0:3000`

### "Port 3000 already in use"
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

### "Module not found" errors
```bash
# Rebuild the container
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Slow file watching / Hot reload not working
This is handled by the Docker config, but if issues persist:
```bash
# Stop containers
docker-compose down

# Remove volumes
docker volume prune

# Restart
docker-compose up --build
```

## Docker Commands

### Basic Operations
```bash
# Start containers
docker-compose up

# Start in background
docker-compose up -d

# Stop containers
docker-compose down

# Rebuild containers
docker-compose build

# View logs
docker-compose logs -f app

# Enter container shell
docker-compose exec app sh
```

### Troubleshooting Commands
```bash
# Check container status
docker-compose ps

# Remove all containers and volumes
docker-compose down -v

# Rebuild without cache
docker-compose build --no-cache

# Check Docker disk usage
docker system df

# Clean up Docker system
docker system prune -a
```

## Development Workflow

1. **Start Docker**
   ```bash
   ./docker-dev.sh
   ```

2. **Make changes** - Files are synced automatically

3. **Check logs** if something goes wrong
   ```bash
   docker-compose logs -f app
   ```

4. **Restart if needed**
   ```bash
   docker-compose restart app
   ```

## Performance Tips

1. **Exclude large directories** in Docker Desktop settings:
   - `.next`
   - `node_modules`
   - `.git`

2. **Allocate more resources** in Docker Desktop:
   - Go to Settings → Resources
   - Increase CPU and Memory limits

3. **Use Docker volumes** for better performance:
   - Already configured in docker-compose.yml

## Architecture

```
docker-compose.yml
├── app service
│   ├── Uses Dockerfile.dev
│   ├── Mounts source code
│   ├── Connects to remote Supabase
│   └── Exposes port 3000
└── networks
    └── app-network (isolated)
```

## Environment Variables

The app reads from `.env.local` which should contain:
- Supabase credentials
- API keys (Twilio, Stripe, etc.)
- Other service configurations

Get these from your Vercel project settings.

## Debugging

### View container logs
```bash
docker-compose logs -f app
```

### Check environment variables
```bash
docker-compose exec app env | grep NEXT_
```

### Test database connection
```bash
docker-compose exec app node -e "console.log('DB URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### Access container shell
```bash
docker-compose exec app sh
```

## Stopping Docker

1. **Graceful shutdown**: Press `Ctrl+C` in the terminal
2. **Force stop**: `docker-compose down`
3. **Remove everything**: `docker-compose down -v`

## Next Steps

Once Docker is working:
1. Test the membership plans feature
2. Check the debug endpoint: http://localhost:3000/api/debug/check-membership-setup
3. Make changes and see them instantly with hot reload

## Need Help?

If Docker still doesn't work:
1. Check Docker Desktop logs
2. Ensure virtualization is enabled in BIOS
3. Try running with `sudo` on Linux
4. Check firewall/antivirus settings