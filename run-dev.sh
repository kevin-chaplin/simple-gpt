#!/bin/bash

# Make sure we're using Node.js 21
echo "Switching to Node.js 21..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 21 || nvm install 21

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies with pnpm..."
  pnpm install
fi

# Start the development server
echo "Starting the development server..."
echo "You can access the application at http://localhost:3000"
pnpm dev
