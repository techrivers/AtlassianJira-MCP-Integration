#!/bin/bash

echo "🚀 Setting up Jira MCP Configuration UI..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16+ and try again.${NC}"
    echo -e "${BLUE}💡 Download from: https://nodejs.org/${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo -e "${GREEN}✅ Node.js version $NODE_VERSION is compatible${NC}"
else
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old. Please upgrade to 16.0.0 or higher.${NC}"
    exit 1
fi

# Install root dependencies
echo -e "${YELLOW}📦 Installing root dependencies...${NC}"
npm install

# Install backend dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd backend
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

# Install frontend dependencies
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi

cd ..

echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}🎉 Next steps:${NC}"
echo -e "1. ${YELLOW}Start the development servers:${NC}"
echo -e "   npm run dev"
echo ""
echo -e "2. ${YELLOW}Or start them separately:${NC}"
echo -e "   ${BLUE}Backend:${NC}  npm run backend    (http://localhost:5000)"
echo -e "   ${BLUE}Frontend:${NC} npm run frontend   (http://localhost:3000)"
echo ""
echo -e "3. ${YELLOW}Open your browser and go to:${NC}"
echo -e "   ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}📖 For more information, see README.md${NC}"